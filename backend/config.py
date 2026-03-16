"""Centralized configuration -- reads from environment variables."""

import os

# AWS
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")

# JWT
JWT_SECRET = os.environ.get("JWT_SECRET", "novahealth-dev-secret-2026")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# CORS
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")

# Database
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://nova:nova@localhost:5432/novahealth",
)

# Seeding
SKIP_SEED = os.environ.get("SKIP_SEED", "").lower() in ("1", "true", "yes")
