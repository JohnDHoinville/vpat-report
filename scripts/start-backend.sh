#!/bin/bash

# VPAT Dashboard Backend Startup Script
# Enhanced with robust error handling and process management

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_PORT=3001
FRONTEND_PORT=3000
BACKEND_SCRIPT="scripts/dashboard-backend.js"
LOG_FILE="logs/backend-startup.log"
PID_FILE="logs/backend.pid"

# Create logs directory if it doesn't exist
mkdir -p logs

# Function to print colored output
print_status() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} ⚠️  $1"
}

print_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} ❌ $1"
}

print_info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} ℹ️  $1"
}

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill processes on a specific port
kill_port_processes() {
    local port=$1
    print_info "Checking for processes on port $port..."
    
    local pids=$(lsof -ti :$port 2>/dev/null || true)
    if [ -n "$pids" ]; then
        print_warning "Found processes on port $port: $pids"
        print_info "Terminating processes gracefully..."
        echo $pids | xargs kill -TERM 2>/dev/null || true
        sleep 2
        
        # Check if processes are still running
        local remaining_pids=$(lsof -ti :$port 2>/dev/null || true)
        if [ -n "$remaining_pids" ]; then
            print_warning "Force killing remaining processes: $remaining_pids"
            echo $remaining_pids | xargs kill -KILL 2>/dev/null || true
            sleep 1
        fi
        
        print_status "Port $port is now free"
    else
        print_status "Port $port is already free"
    fi
}

# Function to kill existing dashboard backend processes
cleanup_existing_processes() {
    print_info "Cleaning up existing dashboard backend processes..."
    
    # Kill by pattern
    pkill -f "dashboard-backend.js" 2>/dev/null || true
    
    # Kill by PID file if it exists
    if [ -f "$PID_FILE" ]; then
        local old_pid=$(cat "$PID_FILE" 2>/dev/null || true)
        if [ -n "$old_pid" ] && kill -0 "$old_pid" 2>/dev/null; then
            print_info "Killing process with PID: $old_pid"
            kill -TERM "$old_pid" 2>/dev/null || true
            sleep 2
            kill -KILL "$old_pid" 2>/dev/null || true
        fi
        rm -f "$PID_FILE"
    fi
    
    # Clean up ports
    kill_port_processes $BACKEND_PORT
    kill_port_processes $FRONTEND_PORT
    
    print_status "Process cleanup completed"
}

# Function to check if Node.js and required dependencies are available
check_dependencies() {
    print_info "Checking dependencies..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed or not in PATH"
        exit 1
    fi
    
    local node_version=$(node --version)
    print_status "Node.js version: $node_version"
    
    # Check if backend script exists
    if [ ! -f "$BACKEND_SCRIPT" ]; then
        print_error "Backend script not found: $BACKEND_SCRIPT"
        print_info "Make sure you're running this from the project root directory"
        exit 1
    fi
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Make sure you're in the project root directory"
        exit 1
    fi
    
    print_status "All dependencies check passed"
}

# Function to start the backend with monitoring
start_backend() {
    print_info "Starting VPAT Dashboard Backend..."
    
    # Start backend in background with logging
    nohup node "$BACKEND_SCRIPT" >> "$LOG_FILE" 2>&1 &
    local backend_pid=$!
    
    # Save PID for later cleanup
    echo $backend_pid > "$PID_FILE"
    
    print_status "Backend started with PID: $backend_pid"
    print_info "Waiting for backend to initialize..."
    
    # Wait for backend to start
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if check_port $BACKEND_PORT; then
            print_status "Backend is running on port $BACKEND_PORT"
            break
        fi
        
        # Check if process is still running
        if ! kill -0 $backend_pid 2>/dev/null; then
            print_error "Backend process died during startup"
            print_info "Checking logs for errors..."
            tail -20 "$LOG_FILE"
            exit 1
        fi
        
        sleep 1
        attempt=$((attempt + 1))
        printf "."
    done
    
    echo ""
    
    if [ $attempt -ge $max_attempts ]; then
        print_error "Backend failed to start within expected time"
        print_info "Checking logs for errors..."
        tail -20 "$LOG_FILE"
        kill $backend_pid 2>/dev/null || true
        exit 1
    fi
    
    print_status "✅ VPAT Dashboard Backend is running successfully!"
    print_info "🚀 Backend API: http://localhost:$BACKEND_PORT/api"
    print_info "📊 Dashboard URL: http://localhost:$FRONTEND_PORT/dashboard.html"
    print_info "📝 Logs: $LOG_FILE"
    print_info "🆔 PID: $backend_pid (saved to $PID_FILE)"
}

# Function to monitor backend process
monitor_backend() {
    if [ ! -f "$PID_FILE" ]; then
        print_error "PID file not found. Backend may not be running."
        return 1
    fi
    
    local pid=$(cat "$PID_FILE")
    
    if kill -0 "$pid" 2>/dev/null; then
        print_status "Backend is running (PID: $pid)"
        
        # Check if it's actually serving requests
        if check_port $BACKEND_PORT; then
            print_status "Backend is responding on port $BACKEND_PORT"
            return 0
        else
            print_warning "Backend process exists but port $BACKEND_PORT is not responding"
            return 1
        fi
    else
        print_error "Backend process is not running (PID: $pid)"
        rm -f "$PID_FILE"
        return 1
    fi
}

# Function to stop the backend
stop_backend() {
    print_info "Stopping VPAT Dashboard Backend..."
    
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            print_info "Sending SIGTERM to process $pid"
            kill -TERM "$pid"
            
            # Wait for graceful shutdown
            local attempts=0
            while kill -0 "$pid" 2>/dev/null && [ $attempts -lt 10 ]; do
                sleep 1
                attempts=$((attempts + 1))
                printf "."
            done
            echo ""
            
            # Force kill if still running
            if kill -0 "$pid" 2>/dev/null; then
                print_warning "Process did not terminate gracefully, force killing..."
                kill -KILL "$pid" 2>/dev/null || true
            fi
            
            print_status "Backend stopped"
        else
            print_info "Backend process was not running"
        fi
        rm -f "$PID_FILE"
    fi
    
    # Clean up any remaining processes
    cleanup_existing_processes
}

# Function to restart the backend
restart_backend() {
    print_info "Restarting VPAT Dashboard Backend..."
    stop_backend
    sleep 2
    start_backend
}

# Function to show backend status
show_status() {
    print_info "VPAT Dashboard Backend Status:"
    echo "================================"
    
    if monitor_backend; then
        local pid=$(cat "$PID_FILE" 2>/dev/null)
        local uptime=$(ps -o etime= -p "$pid" 2>/dev/null | tr -d ' ' || echo "unknown")
        
        echo "Status: ✅ RUNNING"
        echo "PID: $pid"
        echo "Uptime: $uptime"
        echo "Backend Port: $BACKEND_PORT"
        echo "Frontend Port: $FRONTEND_PORT"
        echo "API Endpoint: http://localhost:$BACKEND_PORT/api"
        echo "Dashboard URL: http://localhost:$FRONTEND_PORT/dashboard.html"
        echo "Log File: $LOG_FILE"
        
        # Show recent log entries
        echo ""
        echo "Recent log entries:"
        echo "-------------------"
        tail -5 "$LOG_FILE" 2>/dev/null || echo "No log entries found"
    else
        echo "Status: ❌ NOT RUNNING"
        echo "Backend Port: $BACKEND_PORT (free)"
        echo "Frontend Port: $FRONTEND_PORT (free)"
        
        # Show last few log entries if available
        if [ -f "$LOG_FILE" ]; then
            echo ""
            echo "Last log entries:"
            echo "----------------"
            tail -10 "$LOG_FILE"
        fi
    fi
}

# Function to show help
show_help() {
    echo "VPAT Dashboard Backend Management Script"
    echo "========================================"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start     Start the backend server"
    echo "  stop      Stop the backend server"
    echo "  restart   Restart the backend server"
    echo "  status    Show backend status"
    echo "  monitor   Monitor backend health"
    echo "  logs      Show recent backend logs"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start          # Start the backend"
    echo "  $0 status         # Check if backend is running"
    echo "  $0 restart        # Restart the backend"
    echo "  $0 logs           # View recent logs"
    echo ""
}

# Function to show logs
show_logs() {
    if [ -f "$LOG_FILE" ]; then
        print_info "Showing recent backend logs:"
        echo "============================"
        tail -50 "$LOG_FILE"
    else
        print_warning "Log file not found: $LOG_FILE"
    fi
}

# Main execution
main() {
    local command=${1:-start}
    
    case $command in
        start)
            check_dependencies
            cleanup_existing_processes
            start_backend
            ;;
        stop)
            stop_backend
            ;;
        restart)
            check_dependencies
            restart_backend
            ;;
        status)
            show_status
            ;;
        monitor)
            monitor_backend
            ;;
        logs)
            show_logs
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Unknown command: $command"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Handle script interruption
trap 'print_warning "Script interrupted, cleaning up..."; stop_backend; exit 130' INT TERM

# Run main function with all arguments
main "$@" 