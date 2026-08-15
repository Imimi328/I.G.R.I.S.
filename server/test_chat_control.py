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


if __name__ == "__main__":
    unittest.main()
