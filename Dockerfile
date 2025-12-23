# Stage 1: Build the React frontend
FROM node:20-slim AS frontend-builder

WORKDIR /app/client

# Copy package files and install dependencies
COPY client/package*.json ./
RUN npm ci

# Copy source and build
COPY client/ ./
RUN npm run build

# Stage 2: Python backend with built frontend
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies for PostgreSQL driver and health checks
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Python requirements and install
COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . .

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/client/dist ./client/dist

WORKDIR /app/server

EXPOSE 5000

# Use Gunicorn for production WSGI server
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "1", "--worker-class", "sync", "app:app"]
