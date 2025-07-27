#!/bin/bash

echo "🔍 Checking Accessibility Testing Platform Status..."
echo "================================================="

# Check backend
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Backend API:  http://localhost:3001 (RUNNING)"
else
    echo "❌ Backend API:  http://localhost:3001 (STOPPED)"
fi

# Check frontend  
if curl -s http://localhost:8081/dashboard/ > /dev/null; then
    echo "✅ Frontend UI:  http://localhost:8081/dashboard/ (RUNNING)"
else
    echo "❌ Frontend UI:  http://localhost:8081/dashboard/ (STOPPED)"
fi

echo ""
echo "📄 Recent log entries:"
echo "Backend (last 3 lines):"
tail -3 logs/backend.log 2>/dev/null || echo "No backend log found"
echo ""
echo "Frontend (last 3 lines):"
tail -3 logs/frontend.log 2>/dev/null || echo "No frontend log found" 