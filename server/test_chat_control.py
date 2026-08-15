import unittest
from unittest.mock import patch

from fastapi import HTTPException

from server import main


class ChatControlTests(unittest.TestCase):
    @patch.object(main.auth_service, "get_llm_enabled", return_value=False)
    def test_disabled_llm_stops_before_conversation_or_fallback(self, _mock_enabled):
        with patch.object(main.auth_service, "ensure_conversation") as ensure_conversation:
            with self.assertRaises(HTTPException) as raised:
                main.process_chat(
                    main.ChatRequest(message="Can I drill here?"),
                    user={"sub": "test-user"},
                    _=None,
                )
        self.assertEqual(raised.exception.status_code, 503)
        self.assertIn("paused", raised.exception.detail.lower())
        ensure_conversation.assert_not_called()

    @patch.object(main.auth_service, "get_llm_enabled", return_value=True)
    def test_location_sensitive_question_fails_before_spend_without_context(self, _mock_enabled):
        with patch.object(main.auth_service, "ensure_conversation") as ensure_conversation:
            with self.assertRaises(HTTPException) as raised:
                main.process_chat(
                    main.ChatRequest(message="Should I irrigate my farm this week?"),
                    user={"sub": "test-user"},
                    _=None,
                )
        self.assertEqual(raised.exception.status_code, 422)
        ensure_conversation.assert_not_called()

    @patch.object(main.auth_service, "get_llm_enabled", return_value=True)
    def test_current_location_builds_visual_and_scopes_rag(self, _mock_enabled):
        block = {
            "block_name": "Haveli",
            "district_name": "Pune",
            "state_name": "Maharashtra",
            "category": "Safe",
        }
        state = {
            "state_name": "Maharashtra",
            "stage_of_extraction_pct": 51.79,
            "total_annual_recharge": 33.89,
            "total_annual_extraction": 16.57,
            "category_counts": {"Safe": 306, "Semi-Critical": 40, "Critical": 5, "Over-Exploited": 7},
            "water_quality": [],
            "depth_trends": [],
        }
        current_context = {
            "coordinates": {"lat": 18.52, "lng": 73.86},
            "location": {
                "detected_state": "Maharashtra",
                "detected_district": "Pune",
                "nearest_block": "Haveli",
                "block_data": block,
                "state_data": state,
            },
            "weather": {
                "temperature_c": 24,
                "rain_next_7_days_mm": 13.5,
                "avg_evapotranspiration_mm_day": 3.64,
                "season_context": {},
                "smart_irrigation": {},
            },
        }
        llm_response = {"text": "Use the Haveli forecast.", "source": "DeepSeek", "model_used": True, "usage": {}}
        with patch.object(main.auth_service, "ensure_conversation", return_value={"id": "conversation-1"}), \
             patch.object(main.auth_service, "get_conversation", return_value={"messages": []}), \
             patch.object(main.auth_service, "claim_llm_call", return_value={"allowed": True, "reason": "enabled"}), \
             patch.object(main.auth_service, "save_exchange"), \
             patch.object(main.db_service, "get_state_detail", return_value=state), \
             patch.object(main.rag_service, "search_corpus", return_value=[]) as search_corpus, \
             patch.object(main.llm_service, "generate_llm_response", return_value=llm_response) as generate, \
             patch.object(main, "get_factsheet_visual_reference", return_value=None):
            result = main.process_chat(
                main.ChatRequest(
                    message="Should I irrigate my farm this week?",
                    current_location=current_context,
                ),
                user={"sub": "test-user"},
                _=None,
            )

        self.assertEqual(result["visualization"]["type"], "block_card")
        self.assertEqual(result["visualization"]["block_name"], "Haveli")
        self.assertEqual(result["location_resolution"]["mode"], "current")
        search_corpus.assert_called_once_with(
            "Should I irrigate my farm this week?",
            top_k=1,
            state_name="Maharashtra",
        )
        self.assertEqual(generate.call_args.kwargs["context_data"]["block_data"]["state_name"], "Maharashtra")


if __name__ == "__main__":
    unittest.main()
