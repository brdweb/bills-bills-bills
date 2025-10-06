#!/bin/bash

# Build script for Bills Bills Bills Expense Tracker v0.1
# This script builds the Docker image for production deployment

IMAGE_NAME="bills-bills-bills:v0.1"
CONTAINER_NAME="bills-app"

echo "Building Docker image: $IMAGE_NAME"
docker build -t $IMAGE_NAME .

echo ""
echo "Build complete. To run the application:"
echo "docker run -p 5000:5000 $IMAGE_NAME"
echo ""
echo "For production with debug off:"
echo "docker run -e FLASK_DEBUG=false -p 5000:5000 $IMAGE_NAME"
echo ""
echo "To access the application, navigate to http://localhost:5000"
