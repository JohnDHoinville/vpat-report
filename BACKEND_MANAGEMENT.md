# Backend Management Guide

## ❌ **NEVER DO THIS:**
```bash
# This will cause suspension issues!
node scripts/dashboard-backend.js &
```

## ✅ **ALWAYS USE THESE COMMANDS:**

### Basic Commands
```bash
# Start the backend
npm run backend:start

# Stop the backend  
npm run backend:stop

# Restart the backend
npm run backend:restart

# Check backend status
npm run backend:status

# View logs
npm run backend:logs

# Clean up everything (stop + remove logs/pids)
npm run backend:clean
```

### Advanced Usage
```bash
# Start with custom argument
bash scripts/start-backend.sh start

# Follow logs in real-time
tail -f logs/backend.log

# Check if backend is responding
curl http://localhost:3001/api/health
```

## 🔍 **Why This Prevents Suspension:**

1. **Proper process management** with PID files
2. **Complete output redirection** to log files
3. **nohup** prevents hangup signals
4. **Cleanup of orphaned processes** before starting
5. **Detection and killing of suspended processes**

## 🛠️ **Troubleshooting:**

### If backend gets suspended:
```bash
npm run backend:clean
npm run backend:start
```

### If port 3001 is busy:
```bash
lsof -ti:3001 | xargs kill
npm run backend:start
```

### To see what's running:
```bash
npm run backend:status
```

## 📊 **Status Indicators:**

- **✅ Backend is running** - Everything is working
- **⚠️ Backend started but API not responding** - Still initializing
- **❌ Backend is not running** - Need to start it
- **❌ Failed to start** - Check logs for errors

## 📝 **Log Files:**

- **Location:** `logs/backend.log`
- **PID file:** `logs/backend.pid`
- **View recent:** `npm run backend:logs`
- **Follow live:** `tail -f logs/backend.log` 