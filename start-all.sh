#!/bin/bash

echo "🚀 Starting VPAT Report System..."

# Function to check if a port is in use
check_port() {
    lsof -i :$1 > /dev/null 2>&1
    return $?
}

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "node server.js" 2>/dev/null || true
pkill -f "live-server" 2>/dev/null || true

# Wait a moment for cleanup
sleep 2

# Start backend
echo "🔧 Starting backend server..."
cd "$(dirname "$0")/api"
node server.js &
BACKEND_PID=$!

# Wait for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 3

# Check if backend is running
if check_port 3001; then
    echo "✅ Backend server started successfully on port 3001"
else
    echo "❌ Backend server failed to start"
    exit 1
fi

# Start frontend
echo "🌐 Starting frontend server..."
cd "$(dirname "$0")/dashboard"
npx live-server --port=8080 --host=localhost --no-browser &
FRONTEND_PID=$!

# Wait for frontend to start
echo "⏳ Waiting for frontend to initialize..."
sleep 3

# Check if frontend is running
if check_port 8080; then
    echo "✅ Frontend server started successfully on port 8080"
else
    echo "❌ Frontend server failed to start"
fi

echo ""
echo "🎉 VPAT Report System is running!"
echo "📱 Frontend: http://localhost:8080"
echo "🔧 Backend API: http://localhost:3001"
echo "🔍 Health Check: http://localhost:3001/api/health"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap 'echo "🛑 Stopping services..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit' INT
wait
