import unittest

from server import gateway_security


class GatewaySecurityTests(unittest.TestCase):
    def test_production_enforces_by_default(self):
        self.assertTrue(gateway_security.gateway_enforcement_enabled("production", None))

    def test_development_does_not_enforce_by_default(self):
        self.assertFalse(gateway_security.gateway_enforcement_enabled("development", None))

    def test_missing_and_short_secrets_fail_closed(self):
        self.assertFalse(gateway_security.valid_gateway_request({}, ""))
        self.assertFalse(gateway_security.valid_gateway_request(
            {gateway_security.GATEWAY_HEADER: "short"},
            "short",
        ))

    def test_only_matching_gateway_secret_is_accepted(self):
        shared_secret = "a" * 64
        self.assertFalse(gateway_security.valid_gateway_request(
            {gateway_security.GATEWAY_HEADER: "b" * 64},
            shared_secret,
        ))
        self.assertTrue(gateway_security.valid_gateway_request(
            {gateway_security.GATEWAY_HEADER: shared_secret},
            shared_secret,
        ))


if __name__ == "__main__":
    unittest.main()
