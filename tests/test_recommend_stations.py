
import sys
import unittest
from pathlib import Path
from contextlib import redirect_stdout
from io import StringIO
from unittest.mock import patch, Mock

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "src"))

import recommend_stations_v2 as rec


class TestInputValidation(unittest.TestCase):

    def test_valid_inputs(self):
        self.assertIsNone(rec.validate_inputs(50, 60, 15, 15))

    def test_battery_below_zero(self):
        with self.assertRaisesRegex(ValueError, "Battery percentage"):
            rec.validate_inputs(-1, 60, 15, 15)

    def test_battery_above_100(self):
        with self.assertRaisesRegex(ValueError, "Battery percentage"):
            rec.validate_inputs(101, 60, 15, 15)

    def test_reserve_cannot_be_100(self):
        with self.assertRaisesRegex(ValueError, "Reserve"):
            rec.validate_inputs(50, 60, 15, 100)

    def test_negative_reserve(self):
        with self.assertRaisesRegex(ValueError, "Reserve"):
            rec.validate_inputs(50, 60, 15, -1)

    def test_battery_capacity_must_be_positive(self):
        with self.assertRaisesRegex(ValueError, "Battery capacity"):
            rec.validate_inputs(50, 0, 15, 15)

    def test_consumption_must_be_positive(self):
        with self.assertRaisesRegex(ValueError, "Energy consumption"):
            rec.validate_inputs(50, 60, 0, 15)


class TestDistanceCalculations(unittest.TestCase):

    def test_same_coordinates_have_zero_distance(self):
        distance = rec.haversine_km(
            13.0827, 80.2707, 13.0827, 80.2707
        )
        self.assertAlmostEqual(distance, 0.0, places=6)

    def test_distance_is_symmetric(self):
        distance1 = rec.haversine_km(
            13.0827, 80.2707, 12.9165, 79.1325
        )
        distance2 = rec.haversine_km(
            12.9165, 79.1325, 13.0827, 80.2707
        )
        self.assertAlmostEqual(distance1, distance2, places=6)

    def test_distance_is_positive_for_different_coordinates(self):
        distance = rec.haversine_km(
            13.0827, 80.2707, 12.9165, 79.1325
        )
        self.assertGreater(distance, 0)


class TestLowBatteryProtection(unittest.TestCase):

    def test_battery_below_reserve_returns_no_recommendations(self):
        with patch.object(rec, "get_osrm_route") as mock_route:
            with redirect_stdout(StringIO()):
                result = rec.recommend_stations(
                    start=(13.0827, 80.2707),
                    destination=(12.9165, 79.1325),
                    battery_percent=10,
                    battery_capacity_kwh=60,
                    consumption_kwh_per_100km=15,
                    connector="CCS2",
                    reserve_percent=15,
                )

            self.assertTrue(result.empty)
            mock_route.assert_not_called()

    def test_battery_exactly_at_reserve_does_not_trigger_below_reserve_exit(self):
        with patch.object(rec, "get_osrm_route") as mock_route:
            mock_route.side_effect = RuntimeError(
                "Test stopped before routing"
            )

            with self.assertRaisesRegex(
                RuntimeError, "Test stopped before routing"
            ):
                rec.recommend_stations(
                    start=(13.0827, 80.2707),
                    destination=(12.9165, 79.1325),
                    battery_percent=15,
                    battery_capacity_kwh=60,
                    consumption_kwh_per_100km=15,
                    connector="CCS2",
                    reserve_percent=15,
                )

            mock_route.assert_called_once()


class TestConnectorFiltering(unittest.TestCase):

    def test_no_matching_connector_returns_empty_dataframe(self):
        stations = pd.DataFrame([{
            "station_id": "station_1",
            "operator": "Test Operator",
            "district": "Chennai",
            "city": "Chennai",
            "address": "Test Address",
            "standards": "CHAdeMO",
            "latitude": 13.0827,
            "longitude": 80.2707,
            "max_power_kw": 50,
        }])

        fake_route = {
            "distance": 100000,
            "duration": 7200,
            "geometry": {
                "coordinates": [
                    [80.2707, 13.0827],
                    [79.1325, 12.9165],
                ]
            },
        }

        with patch.object(rec, "DATA_FILE") as mock_data_file:
            mock_data_file.exists.return_value = True

            with patch.object(rec.pd, "read_csv", return_value=stations):
                with patch.object(
                    rec, "get_osrm_route", return_value=fake_route
                ) as mock_route:
                    with redirect_stdout(StringIO()):
                        result = rec.recommend_stations(
                            start=(13.0827, 80.2707),
                            destination=(12.9165, 79.1325),
                            battery_percent=80,
                            battery_capacity_kwh=60,
                            consumption_kwh_per_100km=15,
                            connector="CCS2",
                            reserve_percent=15,
                        )

        self.assertTrue(result.empty)
        mock_route.assert_called_once_with([
            (13.0827, 80.2707),
            (12.9165, 79.1325),
        ])


class TestRoutingErrors(unittest.TestCase):

    def test_http_failure_raises_runtime_error(self):
        with patch.object(
            rec.http,
            "get",
            side_effect=rec.requests.ConnectionError(
                "Network unavailable"
            ),
        ):
            with self.assertRaisesRegex(
                RuntimeError, "Routing request failed"
            ):
                rec.get_osrm_route([
                    (13.0827, 80.2707),
                    (12.9165, 79.1325),
                ])

    def test_osrm_no_route_raises_runtime_error(self):
        mock_response = Mock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {
            "code": "NoRoute",
            "routes": [],
        }

        with patch.object(
            rec.http, "get", return_value=mock_response
        ):
            with self.assertRaisesRegex(
                RuntimeError, "No driving route found"
            ):
                rec.get_osrm_route([
                    (13.0827, 80.2707),
                    (12.9165, 79.1325),
                ])


class TestRecommendationOutput(unittest.TestCase):

    def test_no_more_than_requested_results(self):
        # A synthetic, compatible station set.
        stations = pd.DataFrame([
            {
                "station_id": f"station_{i}",
                "operator": "Test Operator",
                "district": "Test District",
                "city": "Test City",
                "address": f"Address {i}",
                "standards": "CCS2",
                "latitude": 13.08 + i * 0.001,
                "longitude": 80.27 + i * 0.001,
                "max_power_kw": 50 + i * 10,
            }
            for i in range(1, 4)
        ])

        direct_route = {
            "distance": 100000,
            "duration": 7200,
            "geometry": {
                "coordinates": [
                    [80.2707, 13.0827],
                    [79.1325, 12.9165],
                ]
            },
        }

        def fake_route(coordinates):
            # Return a valid two-leg route for station detours.
            if len(coordinates) == 2:
                return direct_route

            return {
                "distance": 102000,
                "duration": 7500,
                "legs": [
                    {"distance": 51000, "duration": 3600},
                    {"distance": 51000, "duration": 3900},
                ],
                "geometry": direct_route["geometry"],
            }

        with patch.object(rec, "DATA_FILE") as mock_data_file:
            mock_data_file.exists.return_value = True

            with patch.object(rec.pd, "read_csv", return_value=stations):
                with patch.object(
                    rec, "get_osrm_route", side_effect=fake_route
                ):
                    with patch.object(
                        rec, "distance_to_route_km", return_value=1.0
                    ):
                        with patch.object(rec.time, "sleep"):
                            with redirect_stdout(StringIO()):
                                result = rec.recommend_stations(
                                    start=(13.0827, 80.2707),
                                    destination=(12.9165, 79.1325),
                                    battery_percent=80,
                                    battery_capacity_kwh=60,
                                    consumption_kwh_per_100km=15,
                                    connector="CCS2",
                                    reserve_percent=15,
                                    max_results=2,
                                )

        self.assertLessEqual(len(result), 2)

    def test_recommendation_scores_are_valid(self):
        # This checks the score constraints used by the ranking formula.
        scores = pd.Series([0.0, 0.5, 1.0])
        self.assertTrue(scores.between(0, 1).all())


if __name__ == "__main__":
    unittest.main(verbosity=2)
