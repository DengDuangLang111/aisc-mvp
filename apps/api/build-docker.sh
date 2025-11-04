#!/bin/bash

# Backend Docker Build Script
# Usage: ./build-docker.sh [version]

set -e

VERSION=${1:-latest}
IMAGE_NAME="study-oasis-backend"
REGISTRY=${DOCKER_REGISTRY:-""}

echo "🐳 Building Backend Docker Image..."
echo "Version: $VERSION"

# Build the image
if [ -n "$REGISTRY" ]; then
  FULL_IMAGE_NAME="$REGISTRY/$IMAGE_NAME:$VERSION"
else
  FULL_IMAGE_NAME="$IMAGE_NAME:$VERSION"
fi

echo "Image: $FULL_IMAGE_NAME"

# Build from project root
cd ../..

docker build \
  -f apps/api/Dockerfile \
  -t "$FULL_IMAGE_NAME" \
  --build-arg NODE_ENV=production \
  .

echo "✅ Build complete: $FULL_IMAGE_NAME"

# Tag as latest
if [ "$VERSION" != "latest" ]; then
  if [ -n "$REGISTRY" ]; then
    docker tag "$FULL_IMAGE_NAME" "$REGISTRY/$IMAGE_NAME:latest"
    echo "✅ Tagged as: $REGISTRY/$IMAGE_NAME:latest"
  else
    docker tag "$FULL_IMAGE_NAME" "$IMAGE_NAME:latest"
    echo "✅ Tagged as: $IMAGE_NAME:latest"
  fi
fi

# Show image info
echo ""
echo "📦 Image Information:"
docker images | grep "$IMAGE_NAME" | head -n 2

# Optional: Push to registry
if [ "$2" = "--push" ] && [ -n "$REGISTRY" ]; then
  echo ""
  echo "📤 Pushing to registry..."
  docker push "$FULL_IMAGE_NAME"
  [ "$VERSION" != "latest" ] && docker push "$REGISTRY/$IMAGE_NAME:latest"
  echo "✅ Push complete"
fi

echo ""
echo "🚀 To run the container:"
echo "docker run -p 3000:3000 --env-file .env $FULL_IMAGE_NAME"
