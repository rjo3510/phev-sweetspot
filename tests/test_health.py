"""Tests for /health — the URL UptimeRobot and the Docker HEALTHCHECK probe."""
import os
import tempfile

# Point the app at a throwaway DB before app.main (and its engine) is imported.
os.environ.setdefault("SWEETSPOT_DB", os.path.join(tempfile.mkdtemp(), "health.db"))

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402

from app import main  # noqa: E402

client = TestClient(main.app)


def test_health_get_ok():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
    assert r.json()["db"] is True
    assert "build" in r.json()


def test_health_head_ok():
    # UptimeRobot's free plan probes with HEAD only — must not be 405.
    assert client.head("/health").status_code == 200


def test_health_db_down_is_503(monkeypatch):
    broken = create_engine("sqlite:////nonexistent-dir/x.db")
    monkeypatch.setattr(main, "engine", broken)
    r = client.get("/health")
    assert r.status_code == 503
    assert r.json()["status"] == "degraded"
