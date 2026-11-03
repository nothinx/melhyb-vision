# Tahap 1: build frontend di dalam image, jadi frontend/dist tidak perlu ada lebih dulu.
FROM node:22-slim AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

FROM python:3.11-slim

# OpenCV headless tetap butuh pustaka sistem ini.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libglib2.0-0 libgl1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /srv
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend /srv/backend
# Hasil build frontend disajikan langsung oleh FastAPI.
COPY --from=frontend /frontend/dist /srv/frontend/dist

# Data di /data (volume compose). Dimiliki uid 1000 karena Hugging Face
# Spaces menjalankan container sebagai user non-root itu.
ENV MELHYB_DATABASE_URL=sqlite:////data/melhyb.db
RUN mkdir -p /data && chown 1000:1000 /data

WORKDIR /srv/backend
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
