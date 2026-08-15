import hmac
from collections.abc import Mapping


GATEWAY_HEADER = "x-igris-gateway-key"
PUBLIC_API_PATHS = {
    "/api/health",
    "/api/auth/config",
    "/api/auth/google",
    "/api/auth/me",
    "/api/auth/logout",
}


def gateway_enforcement_enabled(app_env: str, configured_value: str | None) -> bool:
    if configured_value is None:
        return app_env.strip().lower() == "production"
    return configured_value.strip().lower() in {"1", "true", "yes", "on"}


def valid_gateway_request(headers: Mapping[str, str], shared_secret: str) -> bool:
    if len(shared_secret) < 32:
        return False
    supplied_secret = headers.get(GATEWAY_HEADER, "")
    return bool(supplied_secret) and hmac.compare_digest(supplied_secret, shared_secret)


def api_authentication_required(path: str) -> bool:
    return path.startswith("/api/") and path not in PUBLIC_API_PATHS
