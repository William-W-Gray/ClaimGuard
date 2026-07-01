"""Security-hardening unit tests: prod config guards + real-client-IP extraction."""
from __future__ import annotations

import pytest
from pydantic import ValidationError
from starlette.requests import Request

from app.core.config import Settings
from app.core.dependencies import client_ip

STRONG_SECRET = "a" * 64


def _make_request(headers: dict[str, str], client_host: str = "10.0.0.1") -> Request:
    scope = {
        "type": "http",
        "headers": [(k.lower().encode(), v.encode()) for k, v in headers.items()],
        "client": (client_host, 12345),
    }
    return Request(scope)


# ─── Production config guards ────────────────────────────────────────────────────
def test_real_prod_rejects_insecure_cookie_and_demo_password():
    with pytest.raises(ValidationError) as exc:
        Settings(
            environment="production",
            demo_mode=False,
            jwt_secret_key=STRONG_SECRET,
            cookie_secure=False,
            first_admin_password="ChangeMe!2026",
        )
    msg = str(exc.value)
    assert "COOKIE_SECURE must be true" in msg
    assert "FIRST_ADMIN_PASSWORD" in msg


def test_real_prod_accepts_hardened_config():
    s = Settings(
        environment="production",
        debug=False,
        demo_mode=False,
        jwt_secret_key=STRONG_SECRET,
        cookie_secure=True,
        first_admin_password="a-strong-unique-admin-password",
    )
    assert s.is_production and not s.demo_mode


def test_demo_prod_allows_relaxed_config():
    # The packaged demo runs ENVIRONMENT=production with demo_mode on; it must boot
    # with http cookies and the demo admin password.
    s = Settings(
        environment="production",
        debug=False,
        demo_mode=True,
        jwt_secret_key=STRONG_SECRET,
        cookie_secure=False,
        first_admin_password="ChangeMe!2026",
    )
    assert s.demo_mode


def test_prod_still_rejects_insecure_jwt_secret():
    with pytest.raises(ValidationError):
        Settings(environment="production", demo_mode=True, jwt_secret_key="")


# ─── Real client IP behind a proxy ───────────────────────────────────────────────
def test_client_ip_prefers_x_real_ip():
    req = _make_request({"x-real-ip": "203.0.113.7"}, client_host="172.18.0.5")
    assert client_ip(req) == "203.0.113.7"


def test_client_ip_uses_leftmost_forwarded_for():
    req = _make_request(
        {"x-forwarded-for": "203.0.113.9, 172.18.0.5"}, client_host="172.18.0.5"
    )
    assert client_ip(req) == "203.0.113.9"


def test_client_ip_falls_back_to_socket_peer():
    req = _make_request({}, client_host="172.18.0.5")
    assert client_ip(req) == "172.18.0.5"
