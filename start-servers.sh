#!/bin/bash

echo "🚀 Starting Accessibility Testing Platform..."
echo "========================================"

# Kill any existing processes on our ports
echo "🧹 Cleaning up existing processes..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
sleep 2

# Start backend server
echo "🔧 Starting backend API server (port 3001)..."
cd api
nohup node server.js > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 5

# Check if backend started successfully
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Backend API server is running on port 3001"
else
    echo "❌ Backend failed to start! Check logs/backend.log"
    exit 1
fi

# Start frontend server
echo "🌐 Starting frontend web server (port 8081)..."
cd dashboard
nohup python3 -m http.server 8081 > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
echo "⏳ Waiting for frontend to initialize..."
sleep 3

# Check if frontend started successfully
if curl -s http://localhost:8081/ > /dev/null; then
    echo "✅ Frontend web server is running on port 8081"
else
    echo "❌ Frontend failed to start! Check logs/frontend.log"
    exit 1
fi

echo ""
echo "🎉 ALL SERVERS STARTED SUCCESSFULLY!"
echo "========================================"
echo "Backend API:  http://localhost:3001"
echo "Frontend UI:  http://localhost:8081/"
echo "Health Check: http://localhost:3001/health"
echo ""
echo "📋 Server Process IDs:"
echo "Backend PID:  $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "📄 Log Files:"
echo "Backend:  logs/backend.log"
echo "Frontend: logs/frontend.log"
echo ""
echo "🛑 To stop servers: ./stop-servers.sh"
echo "🔄 To restart: ./start-servers.sh" 