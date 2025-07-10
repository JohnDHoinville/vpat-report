# Database Creation & Setup Guide
## Complete Step-by-Step Implementation for Single-User Accessibility Testing Platform

This guide will walk you through converting your file-based accessibility testing system to a simplified database-driven approach.

## 📋 **Prerequisites**

### **System Requirements:**
- Node.js (already installed for your existing system)
- PostgreSQL 12+ (we'll install this)
- Your existing accessibility testing platform

### **Time Estimate:**
- Initial setup: **30 minutes**
- Data migration: **1 hour** 
- API integration: **2 hours**
- **Total: ~3.5 hours**

---

## 🚀 **Step 1: Install PostgreSQL**

### **On macOS (using Homebrew):**
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

### **On Ubuntu/Debian:**
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Switch to postgres user and create database
sudo -u postgres createuser --interactive
sudo -u postgres createdb accessibility_testing
```

### **On Windows:**
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run installer with default settings
3. Remember the password you set for `postgres` user
4. Open pgAdmin or use command line

---

## 🗄️ **Step 2: Create Database & Schema**

### **Create the Database:**
```bash
# Create database for accessibility testing
createdb accessibility_testing

# Verify it was created
psql -l | grep accessibility_testing
```

### **Apply the Schema:**
```bash
# Navigate to your project directory
cd /Users/johnhoinville/Desktop/vpat-report

# Create the database tables
psql accessibility_testing < database/simplified-schema.sql
```

### **Verify Schema Creation:**
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

## 📦 **Step 3: Install Node.js Dependencies**

### **Add Database Dependencies:**
```bash
# In your project directory
npm install pg dotenv

# Verify installation
npm list pg
```

### **Create Environment Configuration:**
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

### **Update .env with Your Settings:**
```bash
# Edit .env file with your specific database credentials
# If you're using default local PostgreSQL:
# - DB_USER should be your system username
# - DB_PASSWORD can be empty for local development
# - Adjust DB_HOST/PORT if different

nano .env  # or code .env
```

---

## 🔧 **Step 4: Test Database Connection**

### **Create Quick Connection Test:**
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
            
            // Test schema
            const tables = await db.initializeSchema();
            console.log(`📋 Found ${tables.length} tables in database`);
            
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

### **Expected Output:**
```
🔍 Testing database connection...
✅ Database connection successful: 2024-01-15T10:30:45.123Z
🔄 Initializing database schema...
📋 Found 10 tables in database
✅ Database connection successful!
```

---

## 📊 **Step 5: Populate WCAG Requirements**

### **Create Requirements Seed Script:**
```bash
# Create seed data script
cat > database/seed-requirements.js << 'EOF'
const { db } = require('./config');

async function seedRequirements() {
    console.log('🌱 Seeding WCAG requirements...');
    
    // Sample WCAG 2.1 Level AA requirements
    const wcagRequirements = [
        {
            wcag_version: '2.1',
            level: 'A',
            criterion_number: '1.1.1',
            title: 'Non-text Content',
            description: 'All non-text content has text alternative that serves the equivalent purpose.',
            manual_test_procedure: {
                overview: 'Check that all images, buttons, and form controls have appropriate text alternatives.',
                steps: [
                    'Locate all images on the page',
                    'Verify each image has alt text or is marked as decorative',
                    'Check that alt text describes the purpose/content of the image',
                    'Verify form inputs have accessible names (labels, aria-label, etc.)',
                    'Test with screen reader to confirm alternatives are announced'
                ],
                tools_needed: ['screen_reader', 'browser_dev_tools'],
                what_to_look_for: 'Missing alt attributes, empty alt text on meaningful images, unlabeled form controls',
                common_failures: ['Images without alt attributes', 'Alt text that says "image" or "picture"', 'Form controls without labels']
            },
            tool_mappings: {
                axe: ['image-alt', 'input-image-alt', 'aria-hidden-body'],
                pa11y: ['WCAG2AA.Principle1.Guideline1_1.1_1_1'],
                lighthouse: ['image-alt']
            },
            understanding_url: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html',
            applies_to_page_types: ['all']
        },
        {
            wcag_version: '2.1',
            level: 'AA',
            criterion_number: '1.4.3',
            title: 'Contrast (Minimum)',
            description: 'Text and background colors have a contrast ratio of at least 4.5:1.',
            manual_test_procedure: {
                overview: 'Measure color contrast between text and background colors.',
                steps: [
                    'Identify all text elements on the page',
                    'Use color contrast analyzer to measure ratios',
                    'Verify normal text has 4.5:1 contrast ratio',
                    'Verify large text has 3:1 contrast ratio',
                    'Check UI components and graphical objects have 3:1 contrast'
                ],
                tools_needed: ['contrast_analyzer', 'browser_dev_tools'],
                what_to_look_for: 'Low contrast text, especially on colored backgrounds',
                common_failures: ['Gray text on white background', 'Light colored links', 'Placeholder text with insufficient contrast']
            },
            tool_mappings: {
                axe: ['color-contrast'],
                pa11y: ['WCAG2AA.Principle1.Guideline1_4.1_4_3'],
                lighthouse: ['color-contrast']
            },
            understanding_url: 'https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html',
            applies_to_page_types: ['all']
        },
        {
            wcag_version: '2.1',
            level: 'A',
            criterion_number: '2.1.1',
            title: 'Keyboard',
            description: 'All functionality is available from keyboard.',
            manual_test_procedure: {
                overview: 'Test that all interactive elements can be accessed and operated using only the keyboard.',
                steps: [
                    'Use only Tab, Shift+Tab, Enter, Space, and arrow keys',
                    'Navigate to all interactive elements (links, buttons, form controls)',
                    'Verify all functionality can be triggered with keyboard',
                    'Check that focus is visible on all elements',
                    'Ensure logical tab order through the page'
                ],
                tools_needed: ['keyboard_only'],
                what_to_look_for: 'Elements that cannot be reached or operated with keyboard',
                common_failures: ['Custom controls without keyboard support', 'Mouse-only functionality', 'Keyboard traps']
            },
            tool_mappings: {
                axe: ['focusable-controls', 'tabindex'],
                pa11y: ['WCAG2AA.Principle2.Guideline2_1.2_1_1'],
                lighthouse: ['focusable-controls']
            },
            understanding_url: 'https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html',
            applies_to_page_types: ['all']
        }
    ];
    
    // Insert requirements
    for (const req of wcagRequirements) {
        try {
            await db.insert('wcag_requirements', req);
            console.log(`✅ Added: ${req.criterion_number} - ${req.title}`);
        } catch (error) {
            console.log(`⚠️ Skipped: ${req.criterion_number} (already exists)`);
        }
    }
    
    console.log('🌱 WCAG requirements seeded successfully!');
    
    // Close database connection
    await db.end();
}

seedRequirements().catch(console.error);
EOF

# Run the seed script
node database/seed-requirements.js
```

---

## 🔄 **Step 6: Create Simple Migration Script**

### **Migrate Existing Data:**
```bash
# Create migration script for your existing files
cat > database/simple-migration.js << 'EOF'
const fs = require('fs').promises;
const path = require('path');
const { db } = require('./config');

class SimpleMigration {
    constructor() {
        this.reportsDir = path.join(__dirname, '..', 'reports');
    }

    async migrateAll() {
        console.log('🚀 Starting migration of existing data...');
        
        try {
            // 1. Create a default project for existing data
            const project = await this.createDefaultProject();
            
            // 2. Migrate existing test results
            await this.migrateExistingTests(project.id);
            
            console.log('✅ Migration completed successfully!');
            
        } catch (error) {
            console.error('❌ Migration failed:', error);
        } finally {
            await db.end();
        }
    }

    async createDefaultProject() {
        console.log('📁 Creating default project for existing data...');
        
        const project = await db.insert('projects', {
            name: 'Migrated Historical Data',
            client_name: 'Various Clients',
            description: 'Data migrated from file-based system'
        });

        console.log(`✅ Created project: ${project.id}`);
        return project;
    }

    async migrateExistingTests(projectId) {
        console.log('📊 Migrating existing test results...');
        
        try {
            // Check if consolidated-reports directory exists
            const consolidatedDir = path.join(this.reportsDir, 'consolidated-reports');
            const files = await fs.readdir(consolidatedDir);
            const jsonFiles = files.filter(f => f.endsWith('.json'));
            
            console.log(`Found ${jsonFiles.length} existing test result files`);
            
            for (const file of jsonFiles.slice(0, 5)) { // Limit to first 5 for testing
                await this.migrateTestFile(projectId, file);
            }
            
        } catch (error) {
            console.log('⚠️ No existing test files found to migrate');
        }
    }

    async migrateTestFile(projectId, fileName) {
        try {
            const filePath = path.join(this.reportsDir, 'consolidated-reports', fileName);
            const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
            
            // Extract basic info
            const batchId = data.batchId || fileName.replace('.json', '');
            const testUrls = this.extractUrls(data);
            
            if (testUrls.length === 0) return;
            
            // Create site discovery for first URL
            const primaryUrl = testUrls[0];
            const domain = new URL(primaryUrl).hostname;
            
            const discovery = await db.insert('site_discovery', {
                project_id: projectId,
                primary_url: primaryUrl,
                domain: domain,
                status: 'completed',
                total_pages_found: testUrls.length,
                notes: `Migrated from batch: ${batchId}`
            });
            
            // Create test session
            const session = await db.insert('test_sessions', {
                project_id: projectId,
                name: `Migrated Session: ${batchId}`,
                description: 'Historical test data migrated from file system',
                status: 'completed'
            });
            
            // Create pages and basic test results
            for (const url of testUrls) {
                const page = await db.insert('discovered_pages', {
                    discovery_id: discovery.id,
                    url: url,
                    title: `Page: ${new URL(url).pathname}`,
                    page_type: 'content'
                });
                
                // Create placeholder automated test result
                await db.insert('automated_test_results', {
                    test_session_id: session.id,
                    page_id: page.id,
                    tool_name: 'migrated_data',
                    raw_results: { migrated: true, original_file: fileName },
                    violations_count: data.totalViolations || 0
                });
            }
            
            console.log(`✅ Migrated: ${fileName} (${testUrls.length} pages)`);
            
        } catch (error) {
            console.error(`❌ Error migrating ${fileName}:`, error.message);
        }
    }

    extractUrls(data) {
        const urls = new Set();
        
        // Try different data structures
        if (data.testUrls && Array.isArray(data.testUrls)) {
            data.testUrls.forEach(url => urls.add(url));
        }
        
        if (data.results && Array.isArray(data.results)) {
            data.results.forEach(result => {
                if (result.url) urls.add(result.url);
                if (result.pageUrl) urls.add(result.pageUrl);
            });
        }
        
        return Array.from(urls);
    }
}

// Run migration
const migration = new SimpleMigration();
migration.migrateAll();
EOF

# Run the migration
node database/simple-migration.js
```

---

## 🔗 **Step 7: Update API Endpoints**

### **Update Dashboard Backend:**
```bash
# Create database-enabled version of your backend
cat > scripts/dashboard-backend-db.js << 'EOF'
const express = require('express');
const cors = require('cors');
const { db } = require('../database/config');
const SimpleTestingService = require('../database/services/simple-testing-service');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const testingService = new SimpleTestingService();

// Health check
app.get('/api/health', async (req, res) => {
    try {
        const connected = await db.testConnection();
        res.json({ status: 'healthy', database: connected });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Get all projects
app.get('/api/projects', async (req, res) => {
    try {
        const projects = await db.findMany('projects', {}, 'created_at DESC');
        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new project
app.post('/api/projects', async (req, res) => {
    try {
        const { name, clientName, primaryUrl } = req.body;
        const result = await testingService.createProject(name, clientName, primaryUrl);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get test sessions for project
app.get('/api/projects/:projectId/sessions', async (req, res) => {
    try {
        const sessions = await db.findMany('test_sessions', {
            project_id: req.params.projectId
        }, 'started_at DESC');
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create test session
app.post('/api/projects/:projectId/sessions', async (req, res) => {
    try {
        const { name, scope } = req.body;
        const session = await testingService.createTestSession(
            req.params.projectId, 
            name, 
            scope
        );
        res.json(session);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get testing overview for session
app.get('/api/sessions/:sessionId/overview', async (req, res) => {
    try {
        const overview = await testingService.getTestSessionOverview(req.params.sessionId);
        res.json(overview);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get next tests to perform
app.get('/api/sessions/:sessionId/next-tests', async (req, res) => {
    try {
        const tests = await testingService.getNextTestsToPerform(req.params.sessionId);
        res.json(tests);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Record manual test result
app.post('/api/sessions/:sessionId/test-results', async (req, res) => {
    try {
        const { pageId, requirementId, requirementType, result, notes, evidence } = req.body;
        const testResult = await testingService.recordTestResult(
            req.params.sessionId,
            pageId,
            requirementId,
            requirementType,
            result,
            notes,
            evidence
        );
        res.json(testResult);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Generate VPAT
app.post('/api/sessions/:sessionId/vpat', async (req, res) => {
    try {
        const vpat = await testingService.generateSimpleVPAT(req.params.sessionId);
        res.json(vpat);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`🚀 Database-enabled backend running on port ${port}`);
    console.log(`📊 Dashboard available at http://localhost:3000/dashboard.html`);
    console.log(`🔗 API endpoint: http://localhost:${port}/api`);
});
EOF
```

---

## ✅ **Step 8: Test the Complete Setup**

### **Start the Database Backend:**
```bash
# Test the new database-enabled backend
node scripts/dashboard-backend-db.js
```

### **Test API Endpoints:**
```bash
# Test health check
curl http://localhost:3001/api/health

# Expected response:
# {"status":"healthy","database":true}

# Test projects endpoint
curl http://localhost:3001/api/projects

# Should return array of projects (including migrated data)
```

### **Create Test Project:**
```bash
# Create a new project via API
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Project",
    "clientName": "Test Client", 
    "primaryUrl": "https://example.com"
  }'
```

---

## 🎯 **Step 9: Verification Checklist**

### **Database Setup ✅**
- [ ] PostgreSQL installed and running
- [ ] Database `accessibility_testing` created
- [ ] Schema applied (10 tables created)
- [ ] Connection test passes

### **Node.js Integration ✅**
- [ ] `pg` dependency installed
- [ ] Environment variables configured
- [ ] Database config working

### **Data Population ✅**
- [ ] WCAG requirements seeded
- [ ] Existing data migrated (if applicable)
- [ ] Test project created successfully

### **API Integration ✅**
- [ ] New backend server starts
- [ ] Health check endpoint works
- [ ] Projects API functional
- [ ] Manual testing endpoints working

---

## 🚀 **Step 10: Next Steps**

### **Immediate Actions:**
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

### **Optional Enhancements:**
- Create web interface for manual testing
- Add more sophisticated migration scripts
- Implement backup/restore procedures
- Add database performance monitoring

---

## 🆘 **Troubleshooting Common Issues**

### **Database Connection Issues:**
```bash
# Check if PostgreSQL is running
pg_isready

# Check if database exists
psql -l | grep accessibility_testing

# Test connection with specific credentials
psql -h localhost -U your_username -d accessibility_testing -c "SELECT 1;"
```

### **Permission Issues:**
```bash
# Grant permissions to your user
sudo -u postgres psql -c "ALTER USER your_username CREATEDB;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE accessibility_testing TO your_username;"
```

### **Schema Issues:**
```bash
# Drop and recreate database if needed
dropdb accessibility_testing
createdb accessibility_testing
psql accessibility_testing < database/simplified-schema.sql
```

### **Node.js Issues:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm install pg dotenv
```

---

## 📚 **Additional Resources**

- **PostgreSQL Documentation:** https://www.postgresql.org/docs/
- **Node.js pg Driver:** https://node-postgres.com/
- **WCAG 2.1 Guidelines:** https://www.w3.org/WAI/WCAG21/
- **Section 508 Standards:** https://www.section508.gov/

---

## 🎉 **Success! You now have:**

✅ **Separated site discovery** from testing workflows  
✅ **Comprehensive WCAG requirements database** with step-by-step procedures  
✅ **Organized manual testing** workflow  
✅ **Unified data storage** for automated and manual results  
✅ **Complete VPAT generation** from database  

Your accessibility testing platform is now database-driven while maintaining all existing functionality! 