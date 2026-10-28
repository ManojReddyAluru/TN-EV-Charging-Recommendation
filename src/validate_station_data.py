
from pathlib import Path
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent
INPUT_FILE = BASE_DIR / "data" / "processed" / "tn_ev_stations_clean.csv"
OUTPUT_DIR = BASE_DIR / "data" / "processed"

if not INPUT_FILE.exists():
    raise FileNotFoundError(f"Dataset not found: {INPUT_FILE}")

df = pd.read_csv(INPUT_FILE)

print("=" * 60)
print("TAMIL NADU EV STATION DATA VALIDATION")
print("=" * 60)

print(f"\nDataset shape: {df.shape[0]} rows, {df.shape[1]} columns")

print("\nColumn names:")
for col in df.columns:
    print(f"- {col}")

print("\nData types:")
print(df.dtypes.to_string())

print("\nMissing values per column:")
print(df.isnull().sum().to_string())

print("\nDuplicate complete rows:", df.duplicated().sum())

# Identify likely coordinate columns
lat_candidates = ["latitude", "lat"]
lon_candidates = ["longitude", "lon", "lng", "long"]

lat_col = next(
    (c for c in df.columns if c.lower().strip() in lat_candidates), None
)
lon_col = next(
    (c for c in df.columns if c.lower().strip() in lon_candidates), None
)

if lat_col and lon_col:
    lat = pd.to_numeric(df[lat_col], errors="coerce")
    lon = pd.to_numeric(df[lon_col], errors="coerce")

    # Broad geographic bounding box for Tamil Nadu; this is a screening
    # check, not proof that every coordinate is a valid station location.
    invalid = (
        lat.isna() | lon.isna()
        | ~lat.between(7.5, 14.0)
        | ~lon.between(76.0, 81.0)
    )

    print(f"\nLatitude column: {lat_col}")
    print(f"Longitude column: {lon_col}")
    print("Missing/unparseable coordinate pairs:",
          int((lat.isna() | lon.isna()).sum()))
    print("Coordinates outside broad Tamil Nadu bounds:",
          int(invalid.sum()))

    if invalid.any():
        review = df.loc[invalid].copy()
        review_file = OUTPUT_DIR / "tn_ev_stations_coordinate_review.csv"
        review.to_csv(review_file, index=False, encoding="utf-8-sig")
        print(f"Review file saved: {review_file}")

    print("\nLatitude range:", lat.min(), "to", lat.max())
    print("Longitude range:", lon.min(), "to", lon.max())
else:
    print("\nWARNING: Could not identify latitude/longitude columns.")
    print("Review the printed column names and adjust the column detection.")

print("\nSample records:")
print(df.head(5).to_string(index=False))

print("\nValidation finished. Original dataset was not modified.")
