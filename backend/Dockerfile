# Build from project root: docker build -f backend/Dockerfile .
FROM node:20-slim

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/detection/requirements.txt ./detection/
RUN pip3 install --break-system-packages --no-cache-dir -r detection/requirements.txt

COPY backend/src ./src
COPY backend/detection ./detection
COPY backend/scripts ./scripts
COPY db/migrations ./db/migrations
COPY backend/package.json ./

RUN mkdir -p /data && \
    addgroup --system appgroup && \
    adduser --system appuser --ingroup appgroup && \
    chown -R appuser:appgroup /app /data

ENV SQLITE_PATH=/data/smart_parking.sqlite
ENV PYTHON_PATH=python3
ENV NODE_ENV=production

EXPOSE 5000
USER appuser

CMD ["sh", "-c", "node scripts/migrate.js && node src/app.js"]
