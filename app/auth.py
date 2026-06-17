"""Owner authentication: password hashing + signed session tokens (stdlib only).

The app is public and read-only for everyone; only the owner — who knows the password —
may persist changes. The password is never stored in the code: provide its hash via the
`OWNER_PASSWORD_HASH` environment variable.

Generate a hash for your own password:

    python -m app.auth

…then set the printed value as OWNER_PASSWORD_HASH (and a random SWEETSPOT_SECRET) in the
environment / Docker. If OWNER_PASSWORD_HASH is unset, a default dev password is used and a
warning is logged — never run public without setting it.
"""
from __future__ import annotations

import hashlib
import hmac
import logging
import os
import secrets
import time

logger = logging.getLogger("uvicorn.error")

PBKDF2_ROUNDS = 200_000
SESSION_TTL = 60 * 60 * 12  # 12 hours
DEFAULT_DEV_PASSWORD = "sweetspot"


# Fields are joined with ":" (not "$") so the value is safe in docker-compose .env files,
# where "$" triggers variable interpolation and would corrupt the hash.
def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PBKDF2_ROUNDS)
    return f"pbkdf2_sha256:{PBKDF2_ROUNDS}:{salt.hex()}:{dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, rounds, salt_hex, hash_hex = stored.split(":")
        dk = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), int(rounds))
        return hmac.compare_digest(dk.hex(), hash_hex)
    except Exception:
        return False


# --- Owner secret material ---------------------------------------------------
OWNER_PASSWORD_HASH = os.environ.get("OWNER_PASSWORD_HASH", "").strip()
USING_DEFAULT_PASSWORD = not OWNER_PASSWORD_HASH
if USING_DEFAULT_PASSWORD:
    OWNER_PASSWORD_HASH = hash_password(DEFAULT_DEV_PASSWORD)

# Token-signing secret: explicit env var, else derived from the password hash so that
# sessions stay valid across restarts without requiring a separate secret in dev.
_secret = (os.environ.get("SWEETSPOT_SECRET", "").encode()
           or hashlib.sha256(OWNER_PASSWORD_HASH.encode()).digest())


def check_password(password: str) -> bool:
    return verify_password(password, OWNER_PASSWORD_HASH)


def make_token(ttl: int = SESSION_TTL) -> str:
    exp = int(time.time()) + ttl
    sig = hmac.new(_secret, f"editor:{exp}".encode(), hashlib.sha256).hexdigest()
    return f"{exp}.{sig}"


def verify_token(token: str | None) -> bool:
    if not token:
        return False
    try:
        exp_str, sig = token.split(".")
        if int(exp_str) < time.time():
            return False
        good = hmac.new(_secret, f"editor:{int(exp_str)}".encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(good, sig)
    except Exception:
        return False


if __name__ == "__main__":
    import getpass

    pw = getpass.getpass("New owner password: ")
    if pw != getpass.getpass("Repeat password: "):
        raise SystemExit("Passwords do not match.")
    print("\nPaste these into .env (no quotes needed):\n")
    print(f"OWNER_PASSWORD_HASH={hash_password(pw)}")
    print(f"SWEETSPOT_SECRET={secrets.token_hex(32)}")
