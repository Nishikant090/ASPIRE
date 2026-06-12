#!/bin/bash
# start_frontend.sh - Starts the React development server

echo "🎨 Starting Aspire Frontend..."
echo "🌐 App running at: http://localhost:3000"
echo ""

cd "$(dirname "$0")"

# Install dependencies if needed
npm install --silent

# Start React dev server
npm start
