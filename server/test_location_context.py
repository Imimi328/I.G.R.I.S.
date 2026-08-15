import unittest
from unittest.mock import patch

from server import main


class LocationContextTests(unittest.TestCase):
    def test_gps_uses_reverse_geocoded_place_instead_of_default_centroid(self):
        reverse_location = {
            "display_name": "Connaught Place, New Delhi, Delhi, India",
            "lat": 28.6315,
            "lng": 77.2167,
            "state": "Delhi",
            "district": "New Delhi",
            "city": "New Delhi",
            "type": "city",
        }
        resolved_location = {
            "detected_state": "Delhi",
            "detected_district": "New Delhi",
            "nearest_block": "Chanakyapuri",
            "match_method": "District-level official assessment unit",
        }
        with patch.object(main.weather_service, "get_location_from_coordinates", return_value=reverse_location), \
             patch.object(main.weather_service, "get_live_weather", return_value={"temperature_c": 31}), \
             patch.object(main.db_service, "resolve_location_from_search", return_value=resolved_location) as resolver, \
             patch.object(main.db_service, "resolve_location_from_coords") as centroid_fallback:
            result = main.get_local_context(28.6315, 77.2167)

        resolver.assert_called_once_with(28.6315, 77.2167, reverse_location, query="New Delhi")
        centroid_fallback.assert_not_called()
        self.assertEqual(result["location"]["detected_state"], "Delhi")
        self.assertIn("GPS reverse geocoding", result["location"]["match_method"])

    def test_gps_fallback_is_labeled_as_approximate(self):
        fallback = {"detected_state": "Maharashtra", "nearest_block": "Haveli"}
        with patch.object(main.weather_service, "get_location_from_coordinates", return_value=None), \
             patch.object(main.weather_service, "get_live_weather", return_value={}), \
             patch.object(main.db_service, "resolve_location_from_coords", return_value=fallback):
            result = main.get_local_context(18.52, 73.86)

        self.assertIn("Approximate", result["location"]["match_method"])


if __name__ == "__main__":
    unittest.main()
