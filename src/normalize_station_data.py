
from pathlib import Path
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent
INPUT_FILE = BASE_DIR / "data" / "processed" / "tn_ev_stations_clean.csv"
OUTPUT_DIR = BASE_DIR / "data" / "processed"

df = pd.read_csv(INPUT_FILE)

# Standardize known district-name aliases.
# Keep the original district in district_original.
district_aliases = {
    "TUTICORIN": "THOOTHUKUDI",
    "TRICHIRAPALLI": "TIRUCHIRAPPALLI",
    "TIRUVARUR": "THIRUVARUR",
    "KANYA-KUMARI": "KANNIYAKUMARI",
}

df["district"] = (
    df["district"]
    .astype("string")
    .str.strip()
    .str.upper()
    .replace(district_aliases)
)

# Flag coordinates outside broad screening bounds.
df["coordinate_review_required"] = (
    ~df["latitude"].between(7.5, 14.0)
    | ~df["longitude"].between(76.0, 81.0)
)

# Flag potentially garbled city strings for manual review.
# This is a review heuristic, not an automatic correction.
garbled_pattern = r"[ŚĞŶŐĂŮ]"
df["city_review_required"] = (
    df["city"].astype("string").str.contains(
        garbled_pattern, regex=True, na=False
    )
)

# Save a new file; never overwrite the source.
normalized_file = OUTPUT_DIR / "tn_ev_stations_normalized.csv"
df.to_csv(normalized_file, index=False, encoding="utf-8-sig")

review_columns = [
    "station_id", "operator", "district", "city", "city_original",
    "latitude", "longitude", "address", "location_quality",
    "coordinate_review_required", "city_review_required"
]

review = df.loc[
    df["coordinate_review_required"] | df["city_review_required"],
    review_columns
]

review_file = OUTPUT_DIR / "tn_ev_stations_manual_review.csv"
review.to_csv(review_file, index=False, encoding="utf-8-sig")

print("Normalization completed.")
print("Original station dataset remains unchanged.")
print(f"Input station count: {len(df)}")
print(f"Normalized dataset: {normalized_file}")
print(f"Manual review file: {review_file}")
print("\nDistrict counts after alias standardization:")
print(df["district"].value_counts().to_string())
print("\nCoordinate records flagged:",
      int(df["coordinate_review_required"].sum()))
print("City records flagged:",
      int(df["city_review_required"].sum()))
