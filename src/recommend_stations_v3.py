"""
TN EV Charging Planner V3
Bounded multi-stop planner for data/processed/tn_ev_stations_normalized.csv.
Public Nominatim/OSRM services may be slow or rate-limited. This is not live availability.
"""
from __future__ import annotations
import logging
import math
from pathlib import Path
from typing import Any
import pandas as pd
import requests

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_FILE = BASE_DIR / "data" / "processed" / "tn_ev_stations_normalized.csv"
OUTPUT_FILE = BASE_DIR / "data" / "processed" / "battery_aware_recommendations_v3.csv"
DEFAULT_RESERVE_PERCENT = 15.0
DEFAULT_MAX_DETOUR_KM = 30.0
DEFAULT_MAX_DISTANCE_FROM_ROUTE_KM = 15.0
DEFAULT_MAX_STOPS = 8
DEFAULT_MAX_RESULTS = 5
ENERGY_SAFETY_FACTOR = 1.15
CHARGING_EFFICIENCY = 0.90
REQUEST_TIMEOUT_SECONDS = 12
MAX_CANDIDATES = 12
MAX_ROUTE_CHECKS_PER_PLAN = 80
USER_AGENT = "TN-EV-Charging-Planner/3.1 (educational project)"
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
_session = requests.Session()
_session.headers.update({"User-Agent": USER_AGENT})


def _find_column(df: pd.DataFrame, candidates: list[str]) -> str | None:
    lookup = {str(c).strip().lower(): str(c) for c in df.columns}
    for candidate in candidates:
        if candidate.lower() in lookup:
            return lookup[candidate.lower()]
    return None


def _to_float(value: Any, default: float = math.nan) -> float:
    try:
        number = float(value)
        return number if math.isfinite(number) else default
    except (TypeError, ValueError):
        return default


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dlat, dlon = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlon / 2) ** 2
    return 2 * radius * math.asin(min(1.0, math.sqrt(a)))

TAMIL_NADU_CITY_COORDS = {
    "chennai": (13.0801, 80.2808),
    "coimbatore": (11.0018, 76.9629),
    "madurai": (9.9195, 78.1193),
    "salem": (11.6643, 78.1460),
    "tiruchirappalli": (10.7905, 78.7047),
    "trichy": (10.7905, 78.7047),
    "tirunelveli": (8.7139, 77.7567),
    "vellore": (12.9165, 79.1325),
    "erode": (11.3410, 77.7172),
    "kanyakumari": (8.0883, 77.5385),
    "thanjavur": (10.7870, 79.1378),
}



def geocode_city(city: str) -> tuple[float, float]:
    if not city or not city.strip():
        raise ValueError("City name cannot be empty.")
    city_key = city.strip().casefold()

    if city_key in TAMIL_NADU_CITY_COORDS:
        return TAMIL_NADU_CITY_COORDS[city_key]
    
    query = city.strip()
    params = {
        "q": f"{query}, Tamil Nadu, India",
        "format": "jsonv2",
        "limit": 1,
    }

    try:
        response = _session.get(
            "https://nominatim.openstreetmap.org/search",
            params=params,
            headers={"User-Agent": USER_AGENT},
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        results = response.json()

    except requests.Timeout as exc:
        logging.exception("Nominatim timed out while geocoding %s", query)
        raise RuntimeError(
            "The geocoding service timed out. Please try again shortly."
        ) from exc

    except requests.HTTPError as exc:
        status = exc.response.status_code if exc.response is not None else "unknown"
        logging.exception(
            "Nominatim HTTP error %s while geocoding %s", status, query
        )
        raise RuntimeError(
            f"The geocoding service returned HTTP {status}. Please try again later."
        ) from exc

    except requests.RequestException as exc:
        logging.exception("Nominatim connection error while geocoding %s", query)
        raise RuntimeError(
            "Could not connect to the geocoding service. Please try again later."
        ) from exc

    except ValueError as exc:
        logging.exception("Invalid geocoding response for %s", query)
        raise RuntimeError("The geocoding service returned an invalid response.") from exc

    if not results:
        raise ValueError(
            f"Could not find '{query}' in Tamil Nadu. Try a more specific place name."
        )

    return float(results[0]["lat"]), float(results[0]["lon"])



def get_osrm_route(
    coordinates: list[tuple[float, float]],
    *,
    overview: str = "full",
    geometries: str = "geojson",
) -> dict[str, Any]:
    if len(coordinates) < 2:
        raise ValueError("At least two coordinates are required.")
    coord_text = ";".join(f"{lon:.6f},{lat:.6f}" for lat, lon in coordinates)
    try:
        response = _session.get(
            f"https://router.project-osrm.org/route/v1/driving/{coord_text}",
            params={"overview": overview, "geometries": geometries, "steps": "false"},
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        payload = response.json()
    except requests.RequestException as exc:
        raise RuntimeError("Public routing service could not be reached. Please try again.") from exc
    if payload.get("code") != "Ok" or not payload.get("routes"):
        raise RuntimeError("No driving route was found between the supplied locations.")
    route = payload["routes"][0]
    geometry = route.get("geometry", {}).get("coordinates", [])
    return {
        "distance_km": float(route["distance"]) / 1000,
        "duration_minutes": float(route["duration"]) / 60,
        "geometry": [(float(lat), float(lon)) for lon, lat in geometry],
    }


def _point_to_segment_km(p_lat, p_lon, a_lat, a_lon, b_lat, b_lon):
    mean_lat = math.radians((p_lat + a_lat + b_lat) / 3)
    km_lon, km_lat = 111.320 * math.cos(mean_lat), 110.574
    px, py = p_lon * km_lon, p_lat * km_lat
    ax, ay = a_lon * km_lon, a_lat * km_lat
    bx, by = b_lon * km_lon, b_lat * km_lat
    dx, dy = bx - ax, by - ay
    denom = dx * dx + dy * dy
    if denom == 0:
        frac, nx, ny = 0.0, ax, ay
    else:
        frac = max(0.0, min(1.0, ((px-ax)*dx + (py-ay)*dy) / denom))
        nx, ny = ax + frac*dx, ay + frac*dy
    return math.hypot(px-nx, py-ny), frac


def _route_positions(stations: pd.DataFrame, geometry: list[tuple[float, float]]) -> pd.DataFrame:
    if len(geometry) < 2:
        raise RuntimeError("Routing service returned no usable route geometry.")
    cumulative = [0.0]
    for i in range(1, len(geometry)):
        cumulative.append(cumulative[-1] + haversine_km(*geometry[i-1], *geometry[i]))
    distances, positions = [], []
    for _, row in stations.iterrows():
        best_dist, best_pos = math.inf, 0.0
        for i in range(1, len(geometry)):
            dist, frac = _point_to_segment_km(
                float(row["_lat"]), float(row["_lon"]),
                geometry[i-1][0], geometry[i-1][1], geometry[i][0], geometry[i][1],
            )
            if dist < best_dist:
                best_dist = dist
                best_pos = cumulative[i-1] + frac * (cumulative[i] - cumulative[i-1])
        distances.append(best_dist)
        positions.append(best_pos)
    result = stations.copy()
    result["_route_distance_km"] = distances
    result["_route_position_km"] = positions
    return result


def _load_stations(path: Path = DATA_FILE) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Station dataset was not found: {path}")
    df = pd.read_csv(path)
    if df.empty:
        raise ValueError("Station dataset is empty.")
    lat_col = _find_column(df, ["latitude", "lat", "station_latitude"])
    lon_col = _find_column(df, ["longitude", "lon", "lng", "station_longitude"])
    if not lat_col or not lon_col:
        raise ValueError("Station dataset must contain latitude and longitude.")
    df = df.copy()
    df["_lat"] = pd.to_numeric(df[lat_col], errors="coerce")
    df["_lon"] = pd.to_numeric(df[lon_col], errors="coerce")
    df = df.dropna(subset=["_lat", "_lon"])
    df = df[df["_lat"].between(6, 14) & df["_lon"].between(76, 81)]
    review_col = _find_column(df, ["coordinate_review_required", "needs_coordinate_review", "coordinate_review"])
    if review_col:
        bad = df[review_col].astype(str).str.strip().str.lower().isin({"true", "1", "yes", "y", "required", "review"})
        df = df[~bad].copy()
    connector_col = _find_column(df, ["standards", "connector_types", "connectors", "connector", "charging_connector"])
    if not connector_col:
        raise ValueError("Station dataset must contain a standards/connector column.")
    power_col = _find_column(df, ["max_power_kw", "power_kw", "charger_power_kw", "rated_power_kw", "charging_power_kw"])
    name_col = _find_column(df, ["station_name", "name", "charging_station_name", "location_name", "address"])
    city_col = _find_column(df, ["city", "town", "district"])
    id_col = _find_column(df, ["station_id", "id", "evse_id"])
    df["_connector_text"] = df[connector_col].fillna("").astype(str)
    df["_power_kw"] = pd.to_numeric(df[power_col], errors="coerce") if power_col else math.nan
    df["_station_name"] = df[name_col].fillna("Unnamed charging station").astype(str) if name_col else "Unnamed charging station"
    df["_city"] = df[city_col].fillna("").astype(str) if city_col else ""
    df["_station_id"] = df[id_col].fillna("").astype(str) if id_col else df.index.astype(str)
    return df.reset_index(drop=True)


def _connector_matches(connector_text: str, requested: str) -> bool:
    wanted = requested.strip().upper()
    text = connector_text.upper().replace("|", ",").replace(";", ",").replace("/", ",")
    return wanted in {part.strip() for part in text.split(",") if part.strip()}


def _route_distance_km(start: tuple[float, float], end: tuple[float, float]) -> float:
    return get_osrm_route([start, end], overview="false")["distance_km"]


def recommend_stations(
    start_lat: float, start_lon: float, destination_lat: float, destination_lon: float,
    battery_percent: float, battery_capacity_kwh: float, consumption_kwh_per_100km: float,
    connector: str = "CCS2", reserve_percent: float = DEFAULT_RESERVE_PERCENT,
    max_results: int = DEFAULT_MAX_RESULTS, max_detour_km: float = DEFAULT_MAX_DETOUR_KM,
    max_stops: int = DEFAULT_MAX_STOPS, save_csv: bool = True,
) -> dict[str, Any]:
    values = {
        "start_lat": start_lat, "start_lon": start_lon,
        "destination_lat": destination_lat, "destination_lon": destination_lon,
        "battery_percent": battery_percent, "battery_capacity_kwh": battery_capacity_kwh,
        "consumption_kwh_per_100km": consumption_kwh_per_100km,
        "reserve_percent": reserve_percent, "max_detour_km": max_detour_km,
    }
    for name, value in values.items():
        if not math.isfinite(float(value)):
            raise ValueError(f"{name} must be finite.")
    if not (-90 <= start_lat <= 90 and -180 <= start_lon <= 180):
        raise ValueError("Start coordinates are invalid.")
    if not (-90 <= destination_lat <= 90 and -180 <= destination_lon <= 180):
        raise ValueError("Destination coordinates are invalid.")
    if not 0 <= battery_percent <= 100:
        raise ValueError("battery_percent must be between 0 and 100.")
    if battery_capacity_kwh <= 0 or consumption_kwh_per_100km <= 0:
        raise ValueError("Battery capacity and consumption must be positive.")
    if not 0 <= reserve_percent < 100:
        raise ValueError("reserve_percent must be between 0 and 100.")
    if max_results < 1 or max_stops < 1:
        raise ValueError("max_results and max_stops must be at least 1.")
    if max_detour_km < 0 or not connector.strip():
        raise ValueError("max_detour_km cannot be negative and connector cannot be empty.")

    start, destination = (float(start_lat), float(start_lon)), (float(destination_lat), float(destination_lon))
    route = get_osrm_route([start, destination], overview="full")
    route_km = route["distance_km"]
    stations = _load_stations()
    stations = stations[stations["_connector_text"].apply(lambda x: _connector_matches(x, connector))].copy()
    if stations.empty:
        return {"status": "no_compatible_stations", "message": f"No stations with connector {connector} were found.", "route_distance_km": round(route_km, 2), "destination_reachable": False, "number_of_stops": 0, "stops": []}

    stations = _route_positions(stations, route["geometry"])
    stations = stations[stations["_route_distance_km"] <= DEFAULT_MAX_DISTANCE_FROM_ROUTE_KM]
    stations = stations.sort_values("_route_position_km").reset_index(drop=True)
    if stations.empty:
        return {"status": "no_stations_near_route", "message": "No compatible stations were found near the route.", "route_distance_km": round(route_km, 2), "destination_reachable": False, "number_of_stops": 0, "stops": []}

    # Build a bounded, route-distributed shortlist. Prefer stations close to
    # the route while retaining coverage across the full journey.
    if len(stations) > MAX_CANDIDATES:
        stations = stations.copy()
        bucket_width = max(route_km / MAX_CANDIDATES, 1.0)
        stations["_route_bucket"] = (
            stations["_route_position_km"] / bucket_width
        ).astype(int)

        selected_indices = []
        for _, group in stations.groupby("_route_bucket", sort=True):
            best = group.sort_values(
                ["_route_distance_km", "_route_position_km"],
                ascending=[True, True],
            ).head(1)
            selected_indices.extend(best.index.tolist())

        selected = stations.loc[selected_indices].copy()
        if len(selected) > MAX_CANDIDATES:
            # Preserve route coverage if multiple buckets map to the limit.
            selected = selected.sort_values("_route_position_km")
            positions = [
                round(i * (len(selected) - 1) / (MAX_CANDIDATES - 1))
                for i in range(MAX_CANDIDATES)
            ]
            selected = selected.iloc[positions]
        elif len(selected) < MAX_CANDIDATES:
            remaining = stations.drop(index=selected.index)
            extra = remaining.sort_values(
                ["_route_distance_km", "_route_position_km"],
                ascending=[True, True],
            ).head(MAX_CANDIDATES - len(selected))
            selected = pd.concat([selected, extra])

        stations = selected.sort_values(
            "_route_position_km"
        ).drop(columns=["_route_bucket"], errors="ignore").reset_index(drop=True)

    reserve_kwh = battery_capacity_kwh * reserve_percent / 100
    current_energy = battery_capacity_kwh * battery_percent / 100
    if current_energy < reserve_kwh:
         return {
              "status": "insufficient_starting_battery",
              "message": (
                  "Starting battery is below the requested reserve. "
                  "Charge before beginning this journey."
              ),
              "route_distance_km": round(route_km, 2),
              "destination_reachable": False,
              "number_of_stops": 0,
              "stops": [],
         }
    current, current_position = start, 0.0
    planned_stops, visited = [], set()
    destination_reachable = False
    final_leg_distance_km = None
    failure_reason = "No safe next charging stop was found while preserving the requested reserve."
    cache: dict[tuple[tuple[float, float], tuple[float, float]], float] = {}
    request_count = 0

    def road_km(a: tuple[float, float], b: tuple[float, float]) -> float:
        nonlocal request_count
        ak, bk = (round(a[0], 5), round(a[1], 5)), (round(b[0], 5), round(b[1], 5))
        key, reverse = (ak, bk), (bk, ak)
        if key in cache:
            return cache[key]
        if reverse in cache:
            return cache[reverse]
        if request_count >= MAX_ROUTE_CHECKS_PER_PLAN:
            raise RuntimeError(f"Reached the {MAX_ROUTE_CHECKS_PER_PLAN}-request routing limit. Retry later.")
        request_count += 1
        if request_count % 10 == 0:
            logger.info("OSRM requests: %d/%d", request_count, MAX_ROUTE_CHECKS_PER_PLAN)
        distance = _route_distance_km(a, b)
        cache[key] = distance
        return distance

    for _ in range(max_stops + 1):
        direct_km = road_km(current, destination)
        direct_energy = direct_km * consumption_kwh_per_100km / 100 * ENERGY_SAFETY_FACTOR
        if direct_energy <= current_energy - reserve_kwh:
            destination_reachable = True
            final_leg_distance_km = direct_km
            break

        ahead = stations[
            (stations["_route_position_km"] > current_position + 2)
            & (stations["_route_position_km"] < route_km + 5)
        ]
        candidates = []
        for _, row in ahead.iterrows():
            sid = str(row["_station_id"])
            if sid in visited:
                continue
            station = (float(row["_lat"]), float(row["_lon"]))
            pos, offroute = float(row["_route_position_km"]), float(row["_route_distance_km"])
            approach = road_km(current, station)
            energy_to_station = approach * consumption_kwh_per_100km / 100 * ENERGY_SAFETY_FACTOR
            if energy_to_station > current_energy - reserve_kwh:
                continue
            progress = max(0.0, pos - current_position)
            detour = max(0.0, approach - progress) + offroute * 0.25
            if detour > max_detour_km:
                continue
            station_to_dest = road_km(station, destination)
            energy_to_dest_full = station_to_dest * consumption_kwh_per_100km / 100 * ENERGY_SAFETY_FACTOR
            reaches_destination = energy_to_dest_full <= battery_capacity_kwh - reserve_kwh

            # Check only a small number of next stations in route order. This prevents
            # unbounded nested OSRM requests while rejecting dead-end choices.
            has_next_hop = reaches_destination
            if not has_next_hop:
                later = ahead[ahead["_route_position_km"] > pos + 2].head(2)
                for _, next_row in later.iterrows():
                    next_station = (float(next_row["_lat"]), float(next_row["_lon"]))
                    leg_km = road_km(station, next_station)
                    leg_energy = leg_km * consumption_kwh_per_100km / 100 * ENERGY_SAFETY_FACTOR
                    if leg_energy <= battery_capacity_kwh - reserve_kwh:
                        has_next_hop = True
                        break
            if not has_next_hop:
                continue
            power = _to_float(row["_power_kw"], 0.0)
            # Prefer progress but penalize excessive detours; prioritize terminal-reachable stops.
            score = progress - detour * 2 + min(power, 150) * 0.08 + (80 if reaches_destination else 0)
            candidates.append({
                "row": row, "station": station, "approach_km": approach,
                "energy_to_station_kwh": energy_to_station, "detour_km": detour,
                "reaches_destination": reaches_destination, "progress_km": progress, "score": score,
            })

        if not candidates:
            failure_reason = (
                "No complete safe sequence was found within the bounded station search. "
                "This does not prove no route exists; the shortlist or public routing service may be incomplete."
            )
            break

        candidates.sort(key=lambda item: item["score"], reverse=True)
        chosen = candidates[0]
        row, station = chosen["row"], chosen["station"]
        sid = str(row["_station_id"])
        arrival_energy = current_energy - chosen["energy_to_station_kwh"]
        grid_energy = max(0.0, battery_capacity_kwh - arrival_energy) / CHARGING_EFFICIENCY
        power = _to_float(row["_power_kw"], 0.0)
        charge_minutes = grid_energy / power * 60 if power > 0 else None
        if planned_stops:
            planned_stops[-1]["distance_to_next_stop_km"] = round(
                chosen["approach_km"], 2
            )
        planned_stops.append({
            "stop_number": len(planned_stops) + 1,
            "station_id": sid,
            "station_name": str(row["_station_name"]),
            "city": str(row["_city"]),
            "latitude": station[0],
            "longitude": station[1],
            "connector": connector,
            "power_kw": power if power > 0 else None,
            "distance_from_route_km": round(float(row["_route_distance_km"]), 2),
            "approach_distance_km": round(chosen["approach_km"], 2),
            "estimated_detour_km": round(chosen["detour_km"], 2),
            "route_progress_km": round(float(row["_route_position_km"]), 2),
            "estimated_arrival_battery_percent": round(max(0, arrival_energy) / battery_capacity_kwh * 100, 1),
            "estimated_energy_to_station_kwh": round(chosen["energy_to_station_kwh"], 2),
            "estimated_grid_energy_to_full_kwh": round(grid_energy, 2),
            "estimated_charging_minutes": round(charge_minutes, 1) if charge_minutes is not None else None,
            "reaches_destination_after_full_charge": bool(chosen["reaches_destination"]),
        })
        visited.add(sid)
        current, current_position = station, float(row["_route_position_km"])
        current_energy = battery_capacity_kwh
        if chosen["reaches_destination"]:
            destination_reachable = True
            final_leg_distance_km = road_km(station, destination)
            planned_stops[-1]["distance_to_destination_km"] = round(
                final_leg_distance_km, 2
            )
            break

    status = "plan_found" if destination_reachable else "partial_plan"
    message = (
        "A complete route passed the planner's estimated energy checks. Verify every road leg and live station availability before travel."
        if destination_reachable else failure_reason
    )
    result = {
        "status": status,
        "message": message,
        "route_distance_km": round(route_km, 2),
        "final_leg_distance_km": round(final_leg_distance_km, 2)
           if final_leg_distance_km is not None else None,
        "estimated_route_duration_minutes": round(route["duration_minutes"], 1),
        "starting_battery_percent": float(battery_percent),
        "battery_capacity_kwh": float(battery_capacity_kwh),
        "consumption_kwh_per_100km": float(consumption_kwh_per_100km),
        "reserve_percent": float(reserve_percent),
        "energy_safety_factor": ENERGY_SAFETY_FACTOR,
        "connector": connector,
        "destination_reachable": destination_reachable,
        "number_of_stops": len(planned_stops),
        "routing_requests_used": request_count,
        "stops": planned_stops[:max_results],
    }
    if save_csv:
        OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
        pd.DataFrame(planned_stops).to_csv(OUTPUT_FILE, index=False)
    return result


