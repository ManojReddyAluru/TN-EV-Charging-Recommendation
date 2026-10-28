
from pathlib import Path
import pandas as pd
import re
import unicodedata

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw" / "tn_ev_stations_raw.csv"
OUT = ROOT / "data" / "processed"
OUT.mkdir(parents=True, exist_ok=True)

df = pd.read_csv(RAW)

# Normalize Unicode and remove excess whitespace.
def clean_text(value):
    if pd.isna(value):
        return value
    value = unicodedata.normalize("NFKC", str(value))
    return re.sub(r"\s+", " ", value).strip()

# Keep the original names for auditing.
for col in ["district", "city", "address", "operator"]:
    if col in df.columns:
        df[f"{col}_original"] = df[col]
        df[col] = df[col].map(clean_text)

# Standardize case for matching/grouping.
for col in ["district", "city", "operator"]:
    if col in df.columns:
        df[col] = df[col].str.upper()

# Convert coordinates and power to numeric.
for col in ["latitude", "longitude", "max_power_kw"]:
    if col in df.columns:
        df[col] = pd.to_numeric(df[col], errors="coerce")

# Approximate geographic screening only.
coord_ok = (
    df["latitude"].between(8.0, 14.0)
    & df["longitude"].between(76.0, 81.0)
)

# Inspect questionable coordinates; do not silently discard them.
suspect = df.loc[~coord_ok].copy()
suspect.to_csv(OUT / "stations_to_review.csv", index=False)

# Exclude only missing/out-of-range coordinates from the map-ready file.
valid = (
    df["latitude"].between(-90, 90)
    & df["longitude"].between(-180, 180)
    & df["latitude"].notna()
    & df["longitude"].notna()
)

clean = df.loc[valid].drop_duplicates(subset="station_id").copy()

clean.to_csv(OUT / "tn_ev_stations_clean.csv", index=False)

print("Raw records:", len(df))
print("Clean records:", len(clean))
print("Records flagged for coordinate review:", len(suspect))
print("Output:", OUT / "tn_ev_stations_clean.csv")
print("Review file:", OUT / "stations_to_review.csv")
print("\nTop districts:")
print(clean["district"].value_counts().head(15))
