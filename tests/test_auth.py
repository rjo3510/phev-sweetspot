"""Tests for owner authentication (password hashing + session tokens)."""
from app import auth


def test_password_roundtrip():
    h = auth.hash_password("correct horse")
    assert auth.verify_password("correct horse", h)
    assert not auth.verify_password("wrong", h)


def test_hash_is_compose_safe():
    # The hash must not contain "$": docker-compose interpolates "$" in .env files,
    # which would corrupt the stored hash and break login.
    assert "$" not in auth.hash_password("anything with chars !@#")


def test_token_roundtrip():
    tok = auth.make_token(ttl=60)
    assert auth.verify_token(tok)
    assert not auth.verify_token(None)
    assert not auth.verify_token("garbage")
    # A tampered signature must fail.
    assert not auth.verify_token(tok[:-1] + ("0" if tok[-1] != "0" else "1"))


def test_expired_token_rejected():
    assert not auth.verify_token(auth.make_token(ttl=-1))
