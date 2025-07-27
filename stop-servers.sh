#!/bin/bash

echo "🛑 Stopping Accessibility Testing Platform..."
echo "========================================="

# Kill backend processes
echo "🔧 Stopping backend API server..."
lsof -ti:3001 | xargs kill -15 2>/dev/null || true
sleep 2
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Kill frontend processes  
echo "🌐 Stopping frontend web server..."
lsof -ti:8081 | xargs kill -15 2>/dev/null || true
sleep 2
lsof -ti:8081 | xargs kill -9 2>/dev/null || true

# Kill any remaining node processes for this project
echo "🧹 Cleaning up any remaining processes..."
pkill -f "node.*server.js" 2>/dev/null || true
pkill -f "python3.*8081" 2>/dev/null || true

echo ""
echo "✅ All servers stopped successfully!"
echo "🔄 To restart: ./start-servers.sh" 