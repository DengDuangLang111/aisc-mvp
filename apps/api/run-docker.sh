#!/bin/bash

# Backend Docker Run Script
# Usage: ./run-docker.sh [dev|prod]

set -e

MODE=${1:-dev}
IMAGE_NAME="study-oasis-backend:latest"
CONTAINER_NAME="study-oasis-backend"

echo "🚀 Starting Backend Container..."
echo "Mode: $MODE"

# Stop existing container if running
if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
  echo "Stopping existing container..."
  docker stop $CONTAINER_NAME
  docker rm $CONTAINER_NAME
fi

# Run container
if [ "$MODE" = "dev" ]; then
  echo "Running in development mode with volume mounts..."
  docker run -d \
    --name $CONTAINER_NAME \
    -p 3000:3000 \
    --env-file .env \
    -v $(pwd)/uploads:/app/apps/api/uploads \
    -v $(pwd)/google-cloud-key.json:/app/apps/api/google-cloud-key.json:ro \
    --restart unless-stopped \
    $IMAGE_NAME
else
  echo "Running in production mode..."
  docker run -d \
    --name $CONTAINER_NAME \
    -p 3000:3000 \
    --env-file .env.production \
    -v /var/study-oasis/uploads:/app/apps/api/uploads \
    --restart unless-stopped \
    $IMAGE_NAME
fi

echo "✅ Container started: $CONTAINER_NAME"
echo ""
echo "📊 Container Status:"
docker ps -f name=$CONTAINER_NAME

echo ""
echo "📝 View logs:"
echo "docker logs -f $CONTAINER_NAME"

echo ""
echo "🛑 Stop container:"
echo "docker stop $CONTAINER_NAME"
