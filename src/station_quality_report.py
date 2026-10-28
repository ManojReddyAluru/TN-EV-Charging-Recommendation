
from pathlib import Path
import pandas as pd
import json

BASE_DIR = Path(__file__).resolve().parent.parent
INPUT_FILE = BASE_DIR / "data" / "processed" / "tn_ev_stations_clean.csv"
OUTPUT_DIR = BASE_DIR / "data" / "processed"

df = pd.read_csv(INPUT_FILE)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# 1. Flag coordinates outside the broad screening bounds
outside = df[
    ~df["latitude"].between(7.5, 14.0)
    | ~df["longitude"].between(76.0, 81.0)
]

print("=" * 65)
print("STATION DATA QUALITY REPORT")
print("=" * 65)

print(f"\nTotal stations: {len(df)}")

print("\n1. Coordinates needing review:")
if outside.empty:
    print("No coordinates outside the screening bounds.")
else:
    print(outside[
        ["station_id", "operator", "district", "city",
         "latitude", "longitude", "location_quality", "address"]
    ].to_string(index=False))

# 2. Compare normalized and original names
print("\n2. Examples of current city names and original city values:")
print(
    df[["city", "city_original"]]
    .drop_duplicates()
    .head(20)
    .to_string(index=False)
)

# 3. Summarize district counts
print("\n3. Stations by district:")
district_counts = (
    df.groupby("district")
    .size()
    .sort_values(ascending=False)
)
print(district_counts.to_string())

# 4. Summarize charger standards
print("\n4. Charger standards:")
print(
    df["standards"]
    .fillna("Unknown")
    .value_counts()
    .head(20)
    .to_string()
)

# 5. Summary of charger power
print("\n5. Maximum charger power (kW):")
print(df["max_power_kw"].describe().to_string())

# 6. Save review outputs
review_file = OUTPUT_DIR / "tn_ev_station_quality_review.csv"
outside.to_csv(review_file, index=False, encoding="utf-8-sig")

district_file = OUTPUT_DIR / "tn_ev_station_district_counts.csv"
district_counts.rename("station_count").to_csv(
    district_file, encoding="utf-8-sig"
)

print("\nFiles saved:")
print(review_file)
print(district_file)
print("\nOriginal station dataset was not modified.")
