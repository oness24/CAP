# ----------  CAP_DASH  Backend  ----------
FROM python:3.12-slim

# Prevent .pyc + unbuffered stdout
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install OS deps needed by some pip packages (cryptography, etc.)
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libffi-dev && \
    rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy app source
COPY . .

# Seed the database on first run (idempotent)
RUN python seed.py

EXPOSE 8000

# Run with uvicorn — 2 workers is fine for a small deployment
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
