
from pathlib import Path
import pandas as pd

PROJECT_DIR = Path(__file__).resolve().parent.parent
CSV_PATH = PROJECT_DIR / "data" / "raw" / "tn_ev_stations_raw.csv"

if not CSV_PATH.exists():
    raise FileNotFoundError(
        f"CSV not found: {CSV_PATH}\n"
        "Check that the download script saved the file there."
    )

df = pd.read_csv(CSV_PATH)

print("\n===== DATASET OVERVIEW =====")
print("Total records:", len(df))
print("Columns:", df.columns.tolist())

if "station_id" in df.columns:
    print("Unique station IDs:", df["station_id"].nunique())
    print("Duplicate station IDs:", df["station_id"].duplicated().sum())

print("\n===== MISSING VALUES =====")
print(df.isnull().sum().sort_values(ascending=False))

print("\n===== COORDINATE VALIDATION =====")
if {"latitude", "longitude"}.issubset(df.columns):
    lat = pd.to_numeric(df["latitude"], errors="coerce")
    lon = pd.to_numeric(df["longitude"], errors="coerce")

    valid = (
        lat.between(8.0, 14.0)
        & lon.between(76.0, 81.0)
    )

    print("Valid approximate Tamil Nadu coordinates:", int(valid.sum()))
    print("Outside approximate Tamil Nadu bounds:", int((~valid).sum()))
    print("Missing/invalid coordinates:", int((lat.isna() | lon.isna()).sum()))

print("\n===== CHARGER INFORMATION =====")
for col in ["operator", "district", "city", "standards", "max_power_kw"]:
    if col in df.columns:
        print(f"\n{col}:")
        print(df[col].value_counts(dropna=False).head(10))

print("\n===== SAMPLE RECORDS =====")
print(df.head(5).to_string(index=False))

print("\nValidation completed.")
