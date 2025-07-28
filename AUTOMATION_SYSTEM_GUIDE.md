# Automation System Guide

## Overview

The accessibility testing automation system is a comprehensive solution that integrates multiple testing tools (Axe-core, Pa11y, Lighthouse, WAVE, etc.) to perform automated accessibility compliance testing across web pages. The system provides real-time progress updates, detailed reporting, and integration with manual testing workflows.

## Architecture

### Core Components

1. **API Server** (`api/server.js`)
   - Express.js server running on port 3001
   - WebSocket support for real-time updates
   - Authentication middleware with development bypass
   - Structured logging and error handling

2. **Test Automation Service** (`api/services/test-automation-service.js`)
   - Orchestrates multiple testing tools
   - Manages browser instances and page loading
   - Processes and stores test results
   - Handles evidence file creation

3. **Database Integration**
   - PostgreSQL database with comprehensive schema
   - Tables: `test_instances`, `automated_tests`, `manual_tests`, `test_runs`, `pages`, `sites`, `projects`
   - Audit trail and session management

4. **Frontend Dashboard** (`dashboard/`)
   - Alpine.js-based reactive UI
   - Real-time WebSocket status updates
   - Session management and test result display

## Automation Workflow

### 1. Session Initialization

```javascript
// Start automation for a session
POST /api/automated-testing/run/:sessionId
{
  "tools": ["axe-core", "pa11y"],
  "max_pages": 25
}
```

### 2. Page Selection Process

The system selects pages for testing based on:

- **Crawler Discovery**: Pages discovered by web crawlers
- **Selection Flag**: `selected_for_automated_testing = true`
- **Page Limit**: Configurable via `max_pages` parameter
- **Project Association**: Pages linked to the specific project

```sql
-- Pages are selected from crawler_discovered_pages table
SELECT * FROM crawler_discovered_pages 
WHERE selected_for_automated_testing = true 
AND crawler_id IN (SELECT id FROM web_crawlers WHERE project_id = ?)
LIMIT ?
```

### 3. Tool Execution

#### Axe-core Integration

```javascript
// Enhanced page loading for accurate testing
async function runAxe(page) {
  const browser = await puppeteer.launch({ headless: true });
  const browserPage = await browser.newPage();
  
  try {
    // Navigate and wait for network idle
    await browserPage.goto(page.url, { 
      waitUntil: 'networkidle0', 
      timeout: 30000 
    });
    
    // Wait for dynamic content
    await browserPage.evaluate(() => 
      new Promise(resolve => setTimeout(resolve, 2000))
    );
    
    // Wait for title to be set
    await browserPage.waitForFunction(() => {
      const title = document.title;
      return title && title.trim() !== '';
    }, { timeout: 5000 });
    
    // Inject and run axe-core
    await browserPage.addScriptTag({ path: require.resolve('axe-core') });
    const axeResults = await browserPage.evaluate(() => {
      return new Promise((resolve) => {
        if (typeof axe !== 'undefined') {
          axe.run().then(resolve);
        } else {
          setTimeout(() => {
            if (typeof axe !== 'undefined') {
              axe.run().then(resolve);
            } else {
              resolve({ violations: [], passes: [], incomplete: [] });
            }
          }, 1000);
        }
      });
    });
    
    return {
      violations: axeResults.violations.length,
      critical: axeResults.violations.filter(v => v.impact === 'critical').length,
      details: axeResults.violations,
      title_at_test_time: await browserPage.title()
    };
  } finally {
    await browserPage.close();
    await browser.close();
  }
}
```

#### Pa11y Integration

```javascript
// Pa11y with enhanced page loading
async function runPa11y(page) {
  const browser = await puppeteer.launch({ headless: true });
  const browserPage = await browser.newPage();
  
  try {
    // Navigate and wait for network idle
    await browserPage.goto(page.url, { 
      waitUntil: 'networkidle0', 
      timeout: 30000 
    });
    
    // Wait for dynamic content
    await browserPage.evaluate(() => 
      new Promise(resolve => setTimeout(resolve, 2000))
    );
    
    // Wait for title to be set
    await browserPage.waitForFunction(() => {
      const title = document.title;
      return title && title.trim() !== '';
    }, { timeout: 5000 });
    
    const finalTitle = await browserPage.title();
    await browserPage.close();
    await browser.close();
    
    // Run pa11y with fully loaded page
    const pa11yResults = await pa11y(page.url, {
      standard: 'WCAG2AA',
      chromeLaunchConfig: { headless: true },
      wait: 3000,
      beforeScript: (page) => {
        return page.evaluate(() => 
          new Promise(resolve => setTimeout(resolve, 2000))
        );
      }
    });
    
    return {
      violations: pa11yResults.issues.length,
      critical: pa11yResults.issues.filter(i => i.type === 'error').length,
      details: pa11yResults.issues,
      title_at_test_time: finalTitle
    };
  } finally {
    try {
      await browserPage.close();
      await browser.close();
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}
```

### 4. Result Processing

#### Status Mapping

```javascript
function mapResultToRequirement(result, requirement) {
  const totalViolations = result.violations || 0;
  const criticalViolations = result.critical || 0;
  
  let newStatus;
  if (criticalViolations > 0) {
    newStatus = 'failed';
  } else if (totalViolations > 0) {
    newStatus = 'passed_review_required'; // Non-critical violations
  } else {
    newStatus = 'passed';
  }
  
  return {
    status: newStatus,
    automated_analysis: {
      tools_used: result.tools_used,
      violations: result.violations,
      critical_violations: result.critical,
      details: result.details
    },
    specialized_analysis: result.specialized_analysis,
    remediation_guidance: result.remediation_guidance
  };
}
```

#### Test Instance Updates

```javascript
async function updateTestInstanceFromAutomation(testInstanceId, result) {
  const toolsUsed = result.automated_analysis?.tools_used || [];
  
  await pool.query(`
    UPDATE test_instances 
    SET 
      status = $1,
      automated_analysis = $2,
      specialized_analysis = $3,
      remediation_guidance = $4,
      tool_used = $5,
      test_method_used = $6,
      updated_at = NOW()
    WHERE id = $7
  `, [
    result.status,
    JSON.stringify(result.automated_analysis),
    JSON.stringify(result.specialized_analysis),
    JSON.stringify(result.remediation_guidance),
    toolsUsed.join(', '),
    'automated',
    testInstanceId
  ]);
}
```

### 5. Real-time Updates

#### WebSocket Integration

```javascript
// Session-specific room management
function joinSessionRoom(sessionId) {
  socket.emit('join_session', { sessionId });
}

function leaveSessionRoom() {
  socket.emit('leave_session');
}

// Progress broadcasting
function broadcastProgress(sessionId, progress, status) {
  io.to(`session_${sessionId}`).emit('automation_progress', {
    sessionId,
    progress,
    status,
    timestamp: new Date().toISOString()
  });
}
```

#### Frontend Status Display

```javascript
// Alpine.js component for progress tracking
{
  automationProgress: null,
  
  init() {
    this.socket.on('automation_progress', (data) => {
      this.automationProgress = data;
    });
  },
  
  openSessionDetailsModal(session) {
    this.joinSessionRoom(session.id);
    // ... modal opening logic
  },
  
  closeSessionDetailsModal() {
    this.leaveSessionRoom();
    this.automationProgress = null;
    // ... modal closing logic
  }
}
```

## Configuration

### Environment Variables

```bash
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=accessibility_testing
DB_USER=johnhoinville
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
```

### Development Authentication Bypass

```javascript
// api/middleware/auth.js
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (NODE_ENV === 'development' && token === 'test') {
    req.user = { id: 'ef726585-0873-44a9-99e5-d8f81fd4ef35' };
    return next();
  }
  
  // ... JWT verification logic
}
```

## Troubleshooting

### Common Issues

#### 1. `browserPage.waitForTimeout is not a function`

**Cause**: Puppeteer version compatibility issue
**Solution**: Use `browserPage.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)))`

```javascript
// ❌ Not compatible across versions
await browserPage.waitForTimeout(2000);

// ✅ Cross-version compatible
await browserPage.evaluate(() => 
  new Promise(resolve => setTimeout(resolve, 2000))
);
```

#### 2. Only 1 page tested despite multiple pages selected

**Cause**: Pages not marked for automated testing
**Solution**: Update database

```sql
UPDATE crawler_discovered_pages 
SET selected_for_automated_testing = true 
WHERE id IN (
  SELECT cdp.id 
  FROM crawler_discovered_pages cdp 
  JOIN web_crawlers wc ON cdp.crawler_id = wc.id 
  WHERE wc.project_id = 'your-project-id' 
  LIMIT 25
);
```

#### 3. WebSocket status not visible

**Cause**: Session room not joined or progress not initialized
**Solution**: Ensure proper room management

```javascript
// In openSessionDetailsModal
this.joinSessionRoom(session.id);

// Initialize progress as null
automationProgress: null,

// In closeSessionDetailsModal
this.leaveSessionRoom();
this.automationProgress = null;
```

#### 4. All automated tests showing as 'failed'

**Cause**: Incorrect status mapping logic
**Solution**: Check critical vs non-critical violations

```javascript
// Correct logic
if (criticalViolations > 0) {
  newStatus = 'failed';
} else if (totalViolations > 0) {
  newStatus = 'passed_review_required'; // Non-critical
} else {
  newStatus = 'passed';
}
```

### Database Schema Issues

#### Missing Columns

```sql
-- Add missing columns to frontend_test_runs
ALTER TABLE frontend_test_runs 
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES test_sessions(id),
ADD COLUMN IF NOT EXISTS initiated_by UUID REFERENCES users(id);

-- Add passed_review_required status
ALTER TYPE test_instance_status ADD VALUE IF NOT EXISTS 'passed_review_required';
```

#### Foreign Key Constraints

```sql
-- Check for valid user IDs
SELECT id FROM users WHERE id = 'ef726585-0873-44a9-99e5-d8f81fd4ef35';

-- Update development bypass to use valid user ID
```

## Best Practices

### 1. Page Loading Strategy

- Always wait for `networkidle0` before testing
- Wait for dynamic content to load
- Verify title is set before proceeding
- Use cross-version compatible waiting methods

### 2. Error Handling

- Graceful fallbacks for timeouts
- Proper browser cleanup in finally blocks
- Comprehensive error logging
- User-friendly error messages

### 3. Performance Optimization

- Limit concurrent browser instances
- Implement proper resource cleanup
- Use connection pooling for database
- Cache frequently accessed data

### 4. Testing Strategy

- Test with multiple tools for comprehensive coverage
- Implement review workflow for automated results
- Store detailed evidence for manual verification
- Track automation confidence levels

## API Endpoints

### Core Automation Endpoints

```javascript
// Start automation
POST /api/automated-testing/run/:sessionId
{
  "tools": ["axe-core", "pa11y"],
  "max_pages": 25
}

// Check status
GET /api/automated-testing/status/:sessionId

// Get review required tests
GET /api/automated-testing/review-required/:sessionId

// Get specialized analysis
GET /api/automated-testing/specialized-analysis/:instanceId

// Get remediation guidance
GET /api/automated-testing/remediation-guidance/:sessionId
```

### Session Management

```javascript
// Get session details
GET /api/testing-sessions/:sessionId

// Get test instances
GET /api/test-instances?session_id=:sessionId

// Get unified requirements
GET /api/unified-requirements/session/:sessionId
```

## Monitoring and Logging

### Structured Logging

```javascript
logger.info('Automation started', {
  sessionId,
  tools,
  pagesCount,
  estimatedDuration
});

logger.error('Automation failed', {
  sessionId,
  error: error.message,
  stack: error.stack
});
```

### Audit Trail

```javascript
// Track all automation events
await createAuditLogEntry({
  session_id: sessionId,
  action: 'automation_started',
  user_id: req.user.id,
  metadata: {
    tools,
    pages_count: pages.length,
    estimated_duration
  }
});
```

## Future Enhancements

### Planned Features

1. **Additional Tools**: Lighthouse, WAVE, Color Contrast Analyzer
2. **Parallel Processing**: Multiple pages tested simultaneously
3. **Custom Rules**: User-defined accessibility rules
4. **Performance Metrics**: Load time and performance impact
5. **CI/CD Integration**: Automated testing in deployment pipelines

### Scalability Considerations

1. **Queue Management**: Redis-based job queuing
2. **Load Balancing**: Multiple automation workers
3. **Caching**: Redis caching for frequently accessed data
4. **Monitoring**: Prometheus metrics and Grafana dashboards

---

## Quick Reference

### Start Server
```bash
cd api && NODE_ENV=development node server.js
```

### Test Automation
```bash
curl -X POST http://localhost:3001/api/automated-testing/run/SESSION_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{"tools": ["axe-core", "pa11y"], "max_pages": 25}'
```

### Check Status
```bash
curl -X GET http://localhost:3001/api/automated-testing/status/SESSION_ID \
  -H "Authorization: Bearer test"
```

### Database Connection
```bash
psql -h localhost -U johnhoinville -d accessibility_testing
```

This guide provides a comprehensive overview of the automation system. For specific implementation details, refer to the individual source files and API documentation. 