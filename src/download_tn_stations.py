
import json
import time
from pathlib import Path

import pandas as pd
import requests

BASE_URL = "https://ev-charging-stations-api.vercel.app/v1/stations"
PROJECT_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = PROJECT_DIR / "data" / "raw"

RAW_DIR.mkdir(parents=True, exist_ok=True)

session = requests.Session()
session.headers.update({"User-Agent": "TN-EV-Research-Project/1.0"})

all_stations = []
page = 1
limit = 100

print("Downloading Tamil Nadu EV charging stations...")

while True:
    params = {
        "state": "Tamil Nadu",
        "location_quality": "ok",
        "page": page,
        "limit": limit,
    }

    response = session.get(
        BASE_URL,
        params=params,
        timeout=30
    )
    response.raise_for_status()
    result = response.json()

    if not result.get("success", False):
        raise RuntimeError(f"API error: {result}")

    stations = result.get("data", [])
    meta = result.get("meta", {})

    if page == 1:
        print("API metadata:", meta)
        total_pages = int(meta.get("total_pages", 1))
        print("Pages to download:", total_pages)

    all_stations.extend(stations)
    print(f"Page {page}: downloaded {len(stations)} stations")

    if page >= total_pages or not stations:
        break

    page += 1
    time.sleep(0.3)

# Save the complete API response records as JSON
json_path = RAW_DIR / "tn_ev_stations_raw.json"

with open(json_path, "w", encoding="utf-8") as file:
    json.dump(all_stations, file, ensure_ascii=False, indent=2)

# Create a convenient station-level CSV
rows = []

for station in all_stations:
    chargers = station.get("chargers") or []

    rows.append({
        "station_id": station.get("id"),
        "operator": station.get("operator"),
        "ownership": station.get("ownership"),
        "state": station.get("state"),
        "district": station.get("district"),
        "city": station.get("city"),
        "address": station.get("address"),
        "latitude": station.get("latitude"),
        "longitude": station.get("longitude"),
        "location_quality": station.get("location_quality"),
        "standards": ", ".join(station.get("standards") or []),
        "currents": ", ".join(station.get("currents") or []),
        "vehicle_classes": ", ".join(
            station.get("vehicle_classes") or []
        ),
        "total_chargers": station.get("total_chargers"),
        "total_connectors": station.get("total_connectors"),
        "max_power_kw": station.get("max_power_kw"),
        "charger_details": json.dumps(
            chargers, ensure_ascii=False
        ),
    })

df = pd.DataFrame(rows)

csv_path = RAW_DIR / "tn_ev_stations_raw.csv"
df.to_csv(csv_path, index=False, encoding="utf-8-sig")

print("\nDOWNLOAD COMPLETE")
print("Total records:", len(df))
print("Unique station IDs:", df["station_id"].nunique())
print("Missing coordinates:", df["latitude"].isna().sum()
      + df["longitude"].isna().sum())
print("JSON saved to:", json_path)
print("CSV saved to:", csv_path)
print("\nFirst five records:")
print(df[["station_id", "operator", "district", "city",
          "latitude", "longitude"]].head().to_string(index=False))
