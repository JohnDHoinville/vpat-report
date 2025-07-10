# Database Creation & Setup Guide
## Complete Step-by-Step Implementation for Single-User Accessibility Testing Platform

This guide will walk you through converting your file-based accessibility testing system to a simplified database-driven approach.

## 📋 Prerequisites

### System Requirements:
- Node.js (already installed for your existing system)
- PostgreSQL 12+ (we'll install this)
- Your existing accessibility testing platform

### Time Estimate:
- Initial setup: **30 minutes**
- Data migration: **1 hour** 
- API integration: **2 hours**
- **Total: ~3.5 hours**

---

## 🚀 Step 1: Install PostgreSQL

### On macOS (using Homebrew):
```bash
# Install PostgreSQL
brew install postgresql@14

# Start PostgreSQL service
brew services start postgresql@14

# Create your user database (if needed)
createdb $(whoami)

# Test connection
psql -c "SELECT version();"
```

### On Ubuntu/Debian:
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Switch to postgres user and create database
sudo -u postgres createuser --interactive
sudo -u postgres createdb accessibility_testing
```

### On Windows:
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run installer with default settings
3. Remember the password you set for `postgres` user
4. Open pgAdmin or use command line

---

## 🗄️ Step 2: Create Database & Schema

### Create the Database:
```bash
# Create database for accessibility testing
createdb accessibility_testing

# Verify it was created
psql -l | grep accessibility_testing
```

### Apply the Schema:
```bash
# Navigate to your project directory
cd /Users/johnhoinville/Desktop/vpat-report

# Create the database tables
psql accessibility_testing < database/simplified-schema.sql
```

### Verify Schema Creation:
```bash
# Connect to database and list tables
psql accessibility_testing

# Inside psql, run:
\dt

# You should see these tables:
# - projects
# - site_discovery  
# - discovered_pages
# - wcag_requirements
# - section_508_requirements
# - test_sessions
# - automated_test_results
# - manual_test_results
# - violations
# - vpat_reports

# Exit psql
\q
```

---

## 📦 Step 3: Install Node.js Dependencies

### Add Database Dependencies:
```bash
# In your project directory
npm install pg dotenv

# Verify installation
npm list pg
```

### Create Environment Configuration:
```bash
# Create .env file for database configuration
cat > .env << 'EOF'
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=accessibility_testing
DB_USER=postgres
DB_PASSWORD=

# Set to 'development' or 'production'
NODE_ENV=development
EOF
```

---

## 🔧 Step 4: Test Database Connection

### Create Quick Connection Test:
```bash
# Create a test script
cat > test-db-connection.js << 'EOF'
const { db } = require('./database/config');

async function testConnection() {
    try {
        console.log('🔍 Testing database connection...');
        
        const connected = await db.testConnection();
        
        if (connected) {
            console.log('✅ Database connection successful!');
            process.exit(0);
        } else {
            console.log('❌ Database connection failed');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('❌ Connection test failed:', error.message);
        process.exit(1);
    }
}

testConnection();
EOF

# Run the test
node test-db-connection.js
```

---

## 📊 Step 5: Populate WCAG Requirements

See the full detailed examples in the database/services/ directory for complete WCAG requirements with step-by-step manual testing procedures.

---

## 🎯 Verification Checklist

### Database Setup ✅
- [ ] PostgreSQL installed and running
- [ ] Database `accessibility_testing` created
- [ ] Schema applied (10 tables created)
- [ ] Connection test passes

### Node.js Integration ✅
- [ ] `pg` dependency installed
- [ ] Environment variables configured
- [ ] Database config working

### Data Population ✅
- [ ] WCAG requirements seeded
- [ ] Existing data migrated (if applicable)
- [ ] Test project created successfully

### API Integration ✅
- [ ] New backend server starts
- [ ] Health check endpoint works
- [ ] Projects API functional
- [ ] Manual testing endpoints working

---

## 🚀 Next Steps

### Immediate Actions:
1. **Test Manual Testing Workflow:**
   - Create a test session
   - Get testing procedures for WCAG requirements
   - Record some test results
   - Generate a VPAT

2. **Integrate with Existing Tools:**
   - Update your automated testing scripts to store results in database
   - Modify your dashboard to use database endpoints
   - Test complete workflow end-to-end

3. **Add More Requirements:**
   - Seed additional WCAG 2.1/2.2 requirements
   - Add Section 508 requirements
   - Customize testing procedures for your needs

---

## 🎉 Success! You now have:

✅ **Separated site discovery** from testing workflows  
✅ **Comprehensive WCAG requirements database** with step-by-step procedures  
✅ **Organized manual testing** workflow  
✅ **Unified data storage** for automated and manual results  
✅ **Complete VPAT generation** from database  

Your accessibility testing platform is now database-driven while maintaining all existing functionality!
