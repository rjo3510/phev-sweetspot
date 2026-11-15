"""Tests for the server-rendered <head> of the page — what link previews and crawlers read."""
import os
import tempfile

# Point the app at a throwaway DB before app.main (and its engine) is imported.
os.environ.setdefault("SWEETSPOT_DB", os.path.join(tempfile.mkdtemp(), "page.db"))

from fastapi.testclient import TestClient  # noqa: E402

from app import main  # noqa: E402

client = TestClient(main.app)


def test_default_head_is_english_with_preview_tags():
    r = client.get("/")
    assert r.status_code == 200
    assert '<html lang="en">' in r.text
    assert "<title>PHEV Charging Calculator</title>" in r.text
    assert '<meta name="description"' in r.text
    assert 'property="og:image" content="http://testserver/static/og-en.png' in r.text
    assert r.headers["vary"] == "Accept-Language"


def test_accept_language_german():
    r = client.get("/", headers={"Accept-Language": "de-CH,de;q=0.9,en;q=0.8"})
    assert '<html lang="de">' in r.text
    assert "<title>PHEV Kostenvergleich</title>" in r.text
    assert "og-de.png" in r.text


def test_lang_param_beats_accept_language_and_lands_in_og_url():
    r = client.get("/?lang=de", headers={"Accept-Language": "en"})
    assert '<html lang="de">' in r.text
    assert 'property="og:url" content="http://testserver/?lang=de"' in r.text


def test_unknown_lang_param_falls_back():
    r = client.get("/?lang=fr")
    assert '<html lang="en">' in r.text
    assert 'property="og:url" content="http://testserver/"' in r.text


def test_preview_images_are_served():
    for lang in ("de", "en"):
        r = client.get(f"/static/og-{lang}.png")
        assert r.status_code == 200
        assert r.headers["content-type"] == "image/png"
