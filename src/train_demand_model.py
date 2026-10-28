
from pathlib import Path
import json

import joblib
import numpy as np
import pandas as pd

from sklearn.base import clone
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler, PolynomialFeatures
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.ensemble import (
    RandomForestRegressor,
    ExtraTreesRegressor,
    GradientBoostingRegressor,
    HistGradientBoostingRegressor,
)
from sklearn.svm import SVR
from sklearn.neighbors import KNeighborsRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "data" / "processed" / "tn_cea_monthly_consumption.csv"
OUTPUT_DIR = ROOT / "data" / "processed"
REPORT_DIR = ROOT / "outputs"
MODEL_DIR = ROOT / "models"

for folder in (OUTPUT_DIR, REPORT_DIR, MODEL_DIR):
    folder.mkdir(parents=True, exist_ok=True)

# 1. Load and validate data
df = pd.read_csv(DATA_FILE)
df["report_month"] = pd.to_datetime(
    df["report_month"].astype(str) + "-01", errors="coerce"
)
df["monthly_total_mu"] = pd.to_numeric(
    df["monthly_total_mu"], errors="coerce"
)
df = (
    df.dropna(subset=["report_month", "monthly_total_mu"])
      .sort_values("report_month")
      .drop_duplicates("report_month")
      .reset_index(drop=True)
)

if len(df) < 10:
    raise ValueError("At least 10 valid monthly records are required.")

if (df["monthly_total_mu"] < 0).any():
    raise ValueError("Consumption values cannot be negative.")

y = df["monthly_total_mu"].to_numpy(dtype=float)
X = np.arange(len(y)).reshape(-1, 1)

# 2. Define candidate ML models
models = {
    "Linear Regression": LinearRegression(),
    "Polynomial Regression": make_pipeline(
        PolynomialFeatures(degree=2, include_bias=False),
        StandardScaler(),
        Ridge(alpha=1.0),
    ),
    "Ridge Regression": make_pipeline(
        StandardScaler(), Ridge(alpha=1.0)
    ),
    "Random Forest": RandomForestRegressor(
        n_estimators=100, max_depth=3, min_samples_leaf=2,
        random_state=42
    ),
    "Extra Trees": ExtraTreesRegressor(
        n_estimators=100, max_depth=3, min_samples_leaf=2,
        random_state=42
    ),
    "Gradient Boosting": GradientBoostingRegressor(
        n_estimators=50, learning_rate=0.03, max_depth=1,
        loss="huber", random_state=42
    ),
    "Hist Gradient Boosting": HistGradientBoostingRegressor(
        max_iter=50, learning_rate=0.05, max_leaf_nodes=5,
        l2_regularization=1.0, random_state=42
    ),
    "SVR": make_pipeline(
        StandardScaler(), SVR(C=1.0, epsilon=0.2, kernel="rbf")
    ),
    "KNN": make_pipeline(
        StandardScaler(), KNeighborsRegressor(n_neighbors=3)
    ),
}

# 3. Expanding-window validation.
# Predict one month at a time, using only earlier months for training.
initial_train_size = 8
records = []
saved_predictions = []

for name, estimator in models.items():
    actual_values = []
    predicted_values = []

    for test_index in range(initial_train_size, len(y)):
        model = clone(estimator)
        model.fit(X[:test_index], y[:test_index])

        prediction = max(
            0.0,
            float(model.predict(X[test_index:test_index + 1])[0])
        )

        actual_values.append(y[test_index])
        predicted_values.append(prediction)

        saved_predictions.append({
            "model": name,
            "report_month": df.loc[test_index, "report_month"].strftime("%Y-%m"),
            "actual_mu": y[test_index],
            "predicted_mu": prediction,
        })

    records.append({
        "model": name,
        "type": "ML",
        "MAE_MU": mean_absolute_error(actual_values, predicted_values),
        "RMSE_MU": np.sqrt(
            mean_squared_error(actual_values, predicted_values)
        ),
        "validation_months": len(actual_values),
    })

# 4. Evaluate simple baselines over exactly the same test months
baseline_predictions = {
    "Last Month Baseline": [],
    "Moving Average (3)": [],
}
baseline_actual = []

for test_index in range(initial_train_size, len(y)):
    history = y[:test_index]
    baseline_actual.append(y[test_index])
    baseline_predictions["Last Month Baseline"].append(history[-1])
    baseline_predictions["Moving Average (3)"].append(
        np.mean(history[-3:])
    )

for name, predictions in baseline_predictions.items():
    records.append({
        "model": name,
        "type": "Baseline",
        "MAE_MU": mean_absolute_error(baseline_actual, predictions),
        "RMSE_MU": np.sqrt(
            mean_squared_error(baseline_actual, predictions)
        ),
        "validation_months": len(baseline_actual),
    })

comparison = (
    pd.DataFrame(records)
    .sort_values("MAE_MU")
    .reset_index(drop=True)
)
comparison.insert(0, "rank", np.arange(1, len(comparison) + 1))
comparison["MAE_MU"] = comparison["MAE_MU"].round(4)
comparison["RMSE_MU"] = comparison["RMSE_MU"].round(4)

comparison.to_csv(REPORT_DIR / "demand_model_comparison.csv", index=False)
pd.DataFrame(saved_predictions).to_csv(
    REPORT_DIR / "demand_validation_predictions.csv", index=False
)

# 5. Choose the best candidate based on validation MAE
winner = comparison.iloc[0]
winner_name = str(winner["model"])
winner_type = str(winner["type"])

model_file = MODEL_DIR / "best_demand_model.joblib"
if model_file.exists():
    model_file.unlink()

# 6. Refit the selected ML model on all available observations,
# or forecast using the selected baseline rule.
if winner_type == "ML":
    best_model = clone(models[winner_name])
    best_model.fit(X, y)
    joblib.dump(best_model, model_file)

    future_X = np.arange(len(y), len(y) + 3).reshape(-1, 1)
    future_predictions = np.maximum(best_model.predict(future_X), 0)

else:
    if winner_name == "Last Month Baseline":
        future_predictions = np.repeat(y[-1], 3)
    else:
        history = list(y)
        values = []
        for _ in range(3):
            prediction = float(np.mean(history[-3:]))
            values.append(prediction)
            history.append(prediction)
        future_predictions = np.array(values)

# 7. Save future forecasts and model details
future_dates = pd.date_range(
    start=df["report_month"].max() + pd.offsets.MonthBegin(1),
    periods=3,
    freq="MS",
)

forecast_df = pd.DataFrame({
    "report_month": future_dates.strftime("%Y-%m"),
    "forecast_monthly_total_mu": np.round(future_predictions, 3),
    "selected_model": winner_name,
    "forecast_level": "Tamil Nadu statewide",
})
forecast_df.to_csv(OUTPUT_DIR / "demand_forecasts.csv", index=False)

info = {
    "selected_model": winner_name,
    "model_type": winner_type,
    "selection_metric": "Expanding-window validation MAE",
    "validation_mae_mu": float(winner["MAE_MU"]),
    "validation_rmse_mu": float(winner["RMSE_MU"]),
    "validation_months": int(winner["validation_months"]),
    "training_observations": int(len(y)),
    "last_observed_month": df["report_month"].max().strftime("%Y-%m"),
    "target": "monthly_total_mu",
    "unit": "MU",
    "warning": (
        "Only 15 monthly observations are available. "
        "The selected candidate is provisional and forecasts are experimental."
    ),
}

with open(MODEL_DIR / "best_model_info.json", "w", encoding="utf-8") as file:
    json.dump(info, file, indent=2)

# 8. Display results
print("\n=== MODEL RANKING: LOWER ERROR IS BETTER ===")
print(comparison.to_string(index=False))

print("\n=== SELECTED CANDIDATE ===")
print("Model:", winner_name)
print("Type:", winner_type)
print("Validation MAE:", round(float(winner["MAE_MU"]), 4), "MU")
print("Validation RMSE:", round(float(winner["RMSE_MU"]), 4), "MU")

print("\n=== NEXT 3 MONTHS FORECAST ===")
print(forecast_df.to_string(index=False))

print("\n=== SAVED FILES ===")
print("Model comparison:", REPORT_DIR / "demand_model_comparison.csv")
print("Validation predictions:", REPORT_DIR / "demand_validation_predictions.csv")
print("Forecast:", OUTPUT_DIR / "demand_forecasts.csv")
print("Model information:", MODEL_DIR / "best_model_info.json")

if winner_type == "ML":
    print("Trained model:", model_file)
else:
    print("The selected baseline is a forecasting rule, not an ML model.")

print("\nNOTE: These are statewide forecasts, not station-level predictions.")
print("Only 15 monthly observations are available; results are experimental.")
