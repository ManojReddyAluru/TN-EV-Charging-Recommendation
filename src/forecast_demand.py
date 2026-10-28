
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]

DATA_FILE = ROOT / "data" / "processed" / "tn_cea_monthly_consumption.csv"
MODEL_FILE = ROOT / "models" / "best_demand_model.joblib"
INFO_FILE = ROOT / "models" / "best_model_info.json"
OUTPUT_FILE = ROOT / "data" / "processed" / "demand_forecasts.csv"


def main():
    # Check that the required files exist
    if not DATA_FILE.exists():
        raise FileNotFoundError(f"Dataset not found: {DATA_FILE}")

    if not MODEL_FILE.exists():
        raise FileNotFoundError(
            "Trained model not found. Run: python src/train_demand_model.py"
        )

    # Load historical data
    df = pd.read_csv(DATA_FILE)
    df["report_month"] = pd.to_datetime(
        df["report_month"].astype(str) + "-01",
        errors="coerce"
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

    if df.empty:
        raise ValueError("No valid historical consumption data was found.")

    # Load the selected trained model
    model = joblib.load(MODEL_FILE)

    # The model was trained using sequential month numbers: 0, 1, 2, ...
    future_month_numbers = np.arange(
        len(df), len(df) + 3
    ).reshape(-1, 1)

    predictions = np.maximum(
        model.predict(future_month_numbers), 0
    )

    future_dates = pd.date_range(
        start=df["report_month"].max() + pd.offsets.MonthBegin(1),
        periods=3,
        freq="MS"
    )

    forecasts = pd.DataFrame({
        "report_month": future_dates.strftime("%Y-%m"),
        "forecast_monthly_total_mu": np.round(predictions, 3),
        "model": "Gradient Boosting",
        "forecast_level": "Tamil Nadu statewide"
    })

    # Save results
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    forecasts.to_csv(OUTPUT_FILE, index=False)

    print("\n=== LATEST HISTORICAL DATA ===")
    print(df[["report_month", "monthly_total_mu"]].tail(5).to_string(index=False))

    print("\n=== FUTURE CONSUMPTION FORECAST ===")
    print(forecasts.to_string(index=False))

    print(f"\nForecast saved to: {OUTPUT_FILE}")
    print(
        "\nNote: These forecasts use only 15 historical monthly records "
        "and are experimental."
    )


if __name__ == "__main__":
    main()
