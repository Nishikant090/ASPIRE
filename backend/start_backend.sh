#!/bin/bash
# start_backend.sh - Starts the FastAPI backend server

echo "🚀 Starting Aspire Backend..."
echo "📍 API running at: http://localhost:8000"
echo "📖 Docs available at: http://localhost:8000/docs"
echo ""

cd "$(dirname "$0")"

# Install dependencies if needed
pip install fastapi uvicorn sqlalchemy pydantic python-multipart --quiet

# Start the server with auto-reload for development
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
