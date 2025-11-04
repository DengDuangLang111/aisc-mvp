#!/bin/bash

# Frontend Docker Run Script
# Usage: ./run-docker.sh [dev|prod]

set -e

MODE=${1:-dev}
IMAGE_NAME="study-oasis-frontend:latest"
CONTAINER_NAME="study-oasis-frontend"

echo "🚀 Starting Frontend Container..."
echo "Mode: $MODE"

# Stop existing container if running
if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
  echo "Stopping existing container..."
  docker stop $CONTAINER_NAME
  docker rm $CONTAINER_NAME
fi

# Run container
if [ "$MODE" = "dev" ]; then
  echo "Running in development mode..."
  docker run -d \
    --name $CONTAINER_NAME \
    -p 3001:3001 \
    --env-file .env \
    -e NEXT_PUBLIC_API_URL=http://localhost:3000 \
    --restart unless-stopped \
    $IMAGE_NAME
else
  echo "Running in production mode..."
  docker run -d \
    --name $CONTAINER_NAME \
    -p 3001:3001 \
    --env-file .env.production \
    --restart unless-stopped \
    $IMAGE_NAME
fi

echo "✅ Container started: $CONTAINER_NAME"
echo ""
echo "📊 Container Status:"
docker ps -f name=$CONTAINER_NAME

echo ""
echo "🌐 Access the app:"
echo "http://localhost:3001"

echo ""
echo "📝 View logs:"
echo "docker logs -f $CONTAINER_NAME"

echo ""
echo "🛑 Stop container:"
echo "docker stop $CONTAINER_NAME"
