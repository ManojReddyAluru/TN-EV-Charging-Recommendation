# Tamil Nadu EV Route Planner - Frontend

A modern, production-grade EV travel planning dashboard built with React, Vite, Tailwind CSS, Lucide icons, and React Leaflet. It interfaces with the FastAPI backend (`main.py` & `src/recommend_stations_v3.py`) to provide multi-stop charging itineraries across Tamil Nadu highway networks.

---

## Architecture & Features

1. **Dashboard & Navigation**:
   - Header with live FastAPI `/health` ping and status indicator
   - Operational travel advisory banner highlighting non-live station verification and model estimates

2. **Route Planning Form**:
   - Starting city & destination city with quick-select chips for popular Tamil Nadu cities (Chennai, Coimbatore, Madurai, Salem, Trichy, etc.) and city swap button
   - Battery state: slider and numeric inputs for current battery %, capacity (kWh), and consumption rate (kWh/100km)
   - Connector standard selector: CCS2, TYPE2_AC, BHARAT_AC001, LEV_DC, CHAdeMO (sends `connector` field)
   - Advanced constraints: minimum reserve battery margin (%), maximum highway detour (km), and max charging stops
   - Sensible defaults reset button and comprehensive input validation

3. **Telemetry & Route Summary**:
   - Total route road distance and estimated driving duration (excluding charging)
   - Charging stop count and battery profile
   - Final leg distance to destination
   - Destination reachability and 1.15× energy safety margin indicator

4. **Recommended Charging-Stop Cards**:
   - Chronological travel order (#1, #2, #3...)
   - Station name, city, power (kW), and connector type
   - Latitude and longitude with one-click coordinate copy
   - Highway route detour and off-corridor distance
   - Estimated arrival battery percentage with color-coded safety badges
   - Estimated grid charging energy and duration to full charge
   - Next-hop distance (to subsequent stop or destination)

5. **Interactive Station Map**:
   - OpenStreetMap tiles rendered via React Leaflet
   - Custom SVG pin markers for each stop with power rating styling
   - Interactive popups with station telemetry
   - Auto-bounds controller to focus on the active itinerary

6. **Status & Error Handling**:
   - `plan_found`: Full route passed energy checks
   - `partial_plan`: Stops found but destination unreachable (never labeled as complete)
   - `insufficient_starting_battery`: Starting energy below reserve margin
   - `no_compatible_stations`: No matching connectors found
   - `no_stations_near_route`: No stations within detour corridor
   - HTTP 422/500 errors and network timeout handling with Retry button

---

## Running the Application

### 1. Start the FastAPI Backend
From the project root (`D:\3-1\TN_EV_PROJECT`):
```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
- API Base URL: `http://127.0.0.1:8000`
- API Docs: `http://127.0.0.1:8000/docs`
- Health Endpoint: `http://127.0.0.1:8000/health`

### 2. Start the Frontend
From the `frontend/` directory:
```bash
cd frontend
npm install
npm run dev
```
- Frontend URL: `http://127.0.0.1:5173/`

### 3. Build for Production
```bash
cd frontend
npm run build
npm run preview
```

---

## Environment Configuration
Configured in `frontend/.env`:
```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```
Vite dev server is also configured with a `/api` reverse proxy in `vite.config.js`.
