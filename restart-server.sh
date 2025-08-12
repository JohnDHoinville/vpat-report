#!/bin/bash

echo "🛑 Stopping existing server processes..."
pkill -f "node.*server.js" || true
sleep 2

echo "🚀 Starting backend server..."
cd api
node server.js > ../logs/backend.log 2>&1 &
SERVER_PID=$!

echo "Server started with PID: $SERVER_PID"
sleep 3

echo "🔍 Checking server status..."
if ps -p $SERVER_PID > /dev/null; then
    echo "✅ Server is running"
    curl -f http://localhost:3001/health >/dev/null 2>&1 && echo "✅ Health check passed" || echo "❌ Health check failed"
else
    echo "❌ Server failed to start"
    echo "Backend logs:"
    tail -10 ../logs/backend.log
fi