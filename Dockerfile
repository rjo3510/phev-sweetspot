FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    SWEETSPOT_DB=/data/sweetspot.db

WORKDIR /app

# Install dependencies first (better layer caching).
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code (includes self-hosted static assets under app/static).
COPY app ./app
COPY uvicorn_log_config.json ./

# Run as a non-root user; /data holds the SQLite DB (mounted as a volume).
RUN useradd --create-home appuser \
    && mkdir -p /data \
    && chown -R appuser:appuser /app /data
USER appuser

# Build metadata (set by CI via --build-arg) — surfaced in the UI footer.
# Placed late so changing it doesn't bust the dependency/app layers' cache.
ARG GIT_SHA=dev
ENV APP_VERSION=$GIT_SHA

EXPOSE 8000

# Single worker on purpose: the login rate-limit state is in-process, and SQLite
# writes are simplest with one writer. Production mode — no --reload.
CMD ["python", "-m", "uvicorn", "app.main:app", \
     "--host", "0.0.0.0", "--port", "8000", \
     "--log-config", "uvicorn_log_config.json"]
