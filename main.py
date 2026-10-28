from pathlib import Path
import sys
import logging

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
PROJECT_ROOT = Path(__file__).resolve().parent
SRC_DIR = PROJECT_ROOT / "src"

if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

import recommend_stations_v3 as recommender

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Tamil Nadu EV Charging Recommendation API",
    description=(
        "Plans multiple EV charging stops using route distance, "
        "battery reserve, connector compatibility, and charger power. "
        "Station availability is not live-verified."
    ),
    version="3.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://tn-ev-charging-recommendation.vercel.app",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

class RecommendationRequest(BaseModel):
    start_city: str = Field(min_length=2, max_length=100)
    destination_city: str = Field(min_length=2, max_length=100)
    battery_percent: float = Field(ge=0, le=100)
    battery_capacity_kwh: float = Field(gt=0, le=300)
    consumption_kwh_per_100km: float = Field(gt=0, le=100)
    connector: str = Field(min_length=1, max_length=50)
    reserve_percent: float = Field(default=15, ge=0, lt=100)
    max_results: int = Field(default=5, ge=1, le=20)
    max_detour_km: float = Field(default=30, ge=0, le=200)


@app.get("/")
def root():
    return {
        "message": "Tamil Nadu EV Charging Recommendation API",
        "status": "running",
        "engine": "V3 multi-stop planner",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "engine": "V3 multi-stop planner",
        "station_dataset_exists": recommender.DATA_FILE.exists(),
    }


@app.post("/recommend")
def recommend(request: RecommendationRequest):
    try:
        start = recommender.geocode_city(request.start_city)
        destination = recommender.geocode_city(
            request.destination_city
        )

        result = recommender.recommend_stations(
            start_lat=start[0],
            start_lon=start[1],
            destination_lat=destination[0],
            destination_lon=destination[1],
            battery_percent=request.battery_percent,
            battery_capacity_kwh=request.battery_capacity_kwh,
            consumption_kwh_per_100km=(
                request.consumption_kwh_per_100km
            ),
            connector=request.connector,
            reserve_percent=request.reserve_percent,
            max_results=request.max_results,
            max_detour_km=request.max_detour_km,
        )

        return result

    except (ValueError, RuntimeError) as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc

    except FileNotFoundError as exc:
        logger.exception("Station dataset was not found")
        raise HTTPException(
            status_code=500,
            detail="The station dataset could not be found.",
        ) from exc

    except Exception as exc:
        logger.exception("Unexpected recommendation API error")
        raise HTTPException(
            status_code=500,
            detail="An unexpected server error occurred.",
        ) from exc
