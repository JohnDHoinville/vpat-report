#!/bin/bash

# VPAT System Startup Script
echo "🚀 Starting VPAT Accessibility Testing System..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    lsof -i :$1 > /dev/null 2>&1
    return $?
}

# Function to get authentication token
get_auth_token() {
    echo -e "${BLUE}🔐 Getting authentication token...${NC}"
    
    # Try to login and extract token
    response=$(curl -s -X POST http://localhost:3001/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"username": "admin", "password": "admin123"}')
    
    if [[ $response == *"token"* ]]; then
        token=$(echo $response | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
        echo -e "${GREEN}✅ Authentication successful${NC}"
        echo -e "${YELLOW}📋 Auth Token: $token${NC}"
        echo ""
        echo -e "${BLUE}To use the dashboard with authentication:${NC}"
        echo -e "1. Open Chrome DevTools (F12)"
        echo -e "2. Go to Application > Local Storage > http://localhost:3000"
        echo -e "3. Add a new key: 'auth_token'"
        echo -e "4. Set the value to: $token"
        echo -e "5. Refresh the page"
        echo ""
    else
        echo -e "${RED}❌ Authentication failed${NC}"
        echo "Response: $response"
    fi
}

# Start backend if not running
if check_port 3001; then
    echo -e "${YELLOW}⚠️  Backend already running on port 3001${NC}"
else
    echo -e "${BLUE}🔧 Starting backend server...${NC}"
    cd api && node server.js &
    BACKEND_PID=$!
    echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"
    
    # Wait a moment for backend to start
    sleep 3
fi

# Get authentication token
get_auth_token

# Start frontend if not running
if check_port 3000; then
    echo -e "${YELLOW}⚠️  Frontend already running on port 3000${NC}"
else
    echo -e "${BLUE}🌐 Starting frontend server...${NC}"
    npm start &
    FRONTEND_PID=$!
    echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"
fi

echo ""
echo -e "${GREEN}🎉 VPAT System is ready!${NC}"
echo -e "${BLUE}📊 Dashboard: http://localhost:3000/dashboard.html${NC}"
echo -e "${BLUE}🔧 API Health: http://localhost:3001/health${NC}"
echo ""
echo -e "${YELLOW}📋 Demo Credentials:${NC}"
echo -e "   Username: admin"
echo -e "   Password: admin123"
echo ""
echo -e "${BLUE}🛑 To stop the system:${NC}"
echo -e "   Press Ctrl+C or run: pkill -f 'node.*server.js' && pkill -f 'http-server'"
echo ""

# Keep script running
wait 