/**
 * API Service for Tamil Nadu EV Route Planner
 * Connects to the FastAPI backend at VITE_API_BASE_URL (default: http://127.0.0.1:8000)
 * Includes smart fallback to Vite reverse proxy (/api) when running on alternate ports (e.g. 5174)
 */

const CONFIGURED_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

/**
 * Determine the optimal endpoint URL.
 * When the frontend is served on an alternate port (such as 5174) where backend CORS
 * might not allow the origin directly, we route through Vite's '/api' proxy.
 */
function resolveUrl(path) {
  if (typeof window !== 'undefined' && window.location) {
    const port = window.location.port;
    // Backend CORS in main.py specifically allows 5173 and 3000
    if (port && port !== '5173' && port !== '3000') {
      return `/api${path}`;
    }
  }
  const base = CONFIGURED_API_BASE_URL.replace(/\/+$/, '');
  return `${base}${path}`;
}

/**
 * Check backend health status
 */
export async function checkBackendHealth() {
  const primaryUrl = resolveUrl('/health');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    let response;
    try {
      response = await fetch(primaryUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
    } catch (fetchErr) {
      // If direct request failed and we didn't use proxy, attempt fallback to proxy
      if (primaryUrl !== '/api/health') {
        response = await fetch('/api/health', {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal,
        });
      } else {
        throw fetchErr;
      }
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        healthy: false,
        error: `HTTP error ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      healthy: data.status === 'healthy',
      details: data,
    };
  } catch (err) {
    return {
      healthy: false,
      error: err.name === 'AbortError' ? 'Connection timeout' : (err.message || 'Network error'),
    };
  }
}

/**
 * Request multi-stop charging recommendations
 */
export async function getRecommendations(params, signal) {
  const payload = {
    start_city: params.start_city.trim(),
    destination_city: params.destination_city.trim(),
    battery_percent: Number(params.battery_percent),
    battery_capacity_kwh: Number(params.battery_capacity_kwh),
    consumption_kwh_per_100km: Number(params.consumption_kwh_per_100km),
    connector: params.connector.trim(),
    reserve_percent: Number(params.reserve_percent),
    max_results: Number(params.max_results),
    max_detour_km: Number(params.max_detour_km),
  };

  const primaryUrl = resolveUrl('/recommend');

  try {
    let response;
    try {
      response = await fetch(primaryUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
        signal,
      });
    } catch (fetchErr) {
      if (fetchErr.name === 'AbortError') throw fetchErr;
      // If fetch failed (e.g. CORS block on alternate port), attempt fallback to Vite proxy
      if (primaryUrl !== '/api/recommend') {
        response = await fetch('/api/recommend', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(payload),
          signal,
        });
      } else {
        throw fetchErr;
      }
    }

    if (!response.ok) {
      let errorMessage = `Server returned status ${response.status}`;
      try {
        const errorJson = await response.json();
        if (errorJson.detail) {
          if (typeof errorJson.detail === 'string') {
            errorMessage = errorJson.detail;
          } else if (Array.isArray(errorJson.detail)) {
            errorMessage = errorJson.detail.map((d) => `${d.loc ? d.loc.join('.') : 'field'}: ${d.msg}`).join(', ');
          } else {
            errorMessage = JSON.stringify(errorJson.detail);
          }
        }
      } catch {
        // Fallback to text status
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('The request timed out or was cancelled. Public routing services may be experiencing high latency.');
    }
    throw err;
  }
}

export { CONFIGURED_API_BASE_URL as API_BASE_URL };
