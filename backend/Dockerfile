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
COPY frontend/dist /srv/frontend/dist

WORKDIR /srv/backend
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
