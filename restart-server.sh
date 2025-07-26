#!/bin/bash

echo "🔄 Restarting Accessibility Testing Platform..."

# Find and kill any existing Node.js processes for this project
echo "🛑 Stopping existing server processes..."
pkill -f "node.*server.js" || echo "No existing server processes found"

# Wait a moment for processes to fully terminate
sleep 2

# Check for any remaining processes
REMAINING=$(pgrep -f "node.*server.js" | wc -l)
if [ $REMAINING -gt 0 ]; then
    echo "⚠️  Force killing remaining processes..."
    pkill -9 -f "node.*server.js"
    sleep 1
fi

# Start the server
echo "🚀 Starting server..."
cd "$(dirname "$0")/api"

# Check if we're in development or production
if [ "$NODE_ENV" = "production" ]; then
    echo "🏭 Starting in production mode..."
    node server.js
else
    echo "🔧 Starting in development mode..."
    node server.js
fi 