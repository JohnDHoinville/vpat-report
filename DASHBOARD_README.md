# 🎯 Accessibility Testing Dashboard

A comprehensive dashboard for managing accessibility testing baselines, running automated test suites, and tracking progress over time.

## Features

### 🎯 Baseline Management
- Create comprehensive baseline assessments
- Store baseline configurations and results
- Compare against historical baselines
- Track baseline metadata and timestamps

### 🔬 Automated Testing
- **axe-core Analysis** - Industry-standard accessibility testing
- **Pa11y Testing** - Command-line accessibility testing
- **Lighthouse Audits** - Google's accessibility scoring
- **Color Contrast Analysis** - WCAG contrast compliance
- **Keyboard Navigation** - Interactive navigation testing
- **Screen Reader Compatibility** - Assistive technology testing
- **Mobile Accessibility** - Cross-device accessibility
- **Form Accessibility** - Form element compliance

### 📊 Historical Comparison
- Compare current results against any baseline
- Track improvement metrics over time
- Generate executive summaries
- Monitor compliance trends
- Identify regressions automatically

### 📈 Progress Tracking
- Visual progress indicators
- Real-time test execution logs
- Comprehensive metrics dashboard
- Management-ready reports

## Quick Start

### 1. Start the Dashboard
```bash
# Development mode (starts both frontend and backend)
npm run dashboard:dev

# Or start components separately
npm start          # Frontend server (port 3000)
npm run dashboard  # Backend API (port 3001)
```

### 2. Access the Dashboard
Open your browser to: http://localhost:3000/dashboard.html

### 3. Create Your First Baseline
1. Enter your website URL (defaults to http://localhost:3000)
2. Provide a baseline description (e.g., "Initial Assessment")
3. Click "Create Baseline"
4. Wait for comprehensive assessment to complete

### 4. Run Test Suites
1. Select which tests to run (all selected by default)
2. Click "Run Full Test Suite"
3. Monitor progress in real-time logs
4. View results in the Overview tab

### 5. Compare Results
1. Select a baseline from the dropdown
2. Choose test results to compare against
3. Click "Generate Comparison"
4. View detailed analysis in the Comparison tab

## Dashboard Architecture

### Frontend (`dashboard.html`)
- **Single-page application** with tabbed interface
- **Real-time progress tracking** with visual indicators
- **Local storage** for client-side data persistence
- **Responsive design** works on desktop and mobile
- **Modern UI** with gradient themes and animations

### Backend (`scripts/dashboard-backend.js`)
- **Express.js API server** on port 3001
- **Integration layer** connecting to existing test scripts
- **File-based storage** for baselines and results
- **RESTful endpoints** for all dashboard operations
- **Error handling** with graceful fallbacks

### Data Storage
```
reports/
├── baselines/
│   ├── registry.json           # Baseline index
│   ├── baseline-xxx.json       # Individual baselines
│   └── ...
├── progress/
│   ├── progress-reports/       # Historical progress
│   └── comparisons/           # Comparison results
└── test-results-registry.json # Test run index
```

## API Endpoints

### Baseline Management
- `POST /api/baseline` - Create new baseline
- `GET /api/baselines` - List all baselines

### Test Execution
- `POST /api/test` - Run individual test
- `GET /api/test-results` - Get test history

### Analysis & Reporting
- `POST /api/compare` - Generate comparison
- `GET /api/current-results` - Latest metrics

## Integration with Existing Scripts

The dashboard integrates seamlessly with your existing testing infrastructure:

### Test Scripts
- `basic-contrast-checker.js` → Color contrast analysis
- `keyboard-navigation-tester.js` → Keyboard testing
- `screen-reader-tester.js` → Screen reader testing
- `mobile-accessibility-tester.js` → Mobile testing
- `form-accessibility-tester.js` → Form testing
- `progress-tracker.js` → Progress analysis

### Playwright Tests
- All existing Playwright test suites
- Cross-browser testing (Chromium, Firefox, WebKit)
- Mobile device testing
- Automated report generation

### External Tools
- **axe-core** via npm scripts
- **Pa11y** command-line testing
- **Lighthouse** accessibility audits
- **IBM Equal Access** checker

## Data Flow

1. **Baseline Creation**
   ```
   Dashboard UI → API → Test Scripts → Results Storage
   ```

2. **Test Execution**
   ```
   UI Test Selection → API → Parallel Test Execution → Consolidated Results
   ```

3. **Progress Comparison**
   ```
   Baseline + Current → Analysis Engine → Detailed Comparison → Management Reports
   ```

## Advanced Features

### Real-time Logging
- Live test execution feedback
- Timestamped log entries
- Error tracking and reporting
- Progress visualization

### Historical Tracking
- Complete audit trail
- Trend analysis over time
- Regression detection
- Compliance scoring

### Executive Reporting
- High-level summaries
- Business impact analysis
- Compliance dashboards
- Stakeholder communications

## Troubleshooting

### Common Issues

**Dashboard won't start:**
```bash
# Install missing dependencies
npm install

# Check if ports are available
lsof -i :3000
lsof -i :3001
```

**Tests failing:**
- Ensure your website is accessible at the specified URL
- Check that all test dependencies are installed
- Verify Playwright browsers are installed: `npx playwright install`

**No baseline data:**
- Check that `reports/baselines` directory exists
- Verify file permissions for writing to reports directory
- Look for error messages in browser console

### Debug Mode
```bash
# Run with debug logging
DEBUG=* npm run dashboard

# Check backend logs
node scripts/dashboard-backend.js
```

## Customization

### Adding New Tests
1. Create test script in `scripts/` directory
2. Add API endpoint in `dashboard-backend.js`
3. Update test selection UI in `dashboard.html`

### Custom Metrics
1. Modify assessment calculation in `runComprehensiveAssessment()`
2. Update metrics display in dashboard
3. Adjust comparison algorithms

### Styling
- Customize CSS variables in `dashboard.html`
- Modify color themes and layouts
- Add custom branding elements

## Data Persistence

### Local Development
- Uses `localStorage` for client-side data
- File-based storage for server data
- JSON format for easy inspection

### Production Deployment
- Replace file storage with database
- Add user authentication
- Implement proper backup strategies
- Scale with load balancers

## Security Considerations

- Sanitize all URL inputs
- Validate file uploads
- Implement rate limiting
- Use HTTPS in production
- Regular security audits

## Future Enhancements

- **Database integration** (PostgreSQL, MongoDB)
- **User authentication** and role-based access
- **CI/CD integration** with GitHub Actions
- **Slack/Teams notifications** for test results
- **Advanced analytics** and trend analysis
- **Custom report templates**
- **API rate limiting** and caching
- **Multi-tenant support**

## Support

For issues and questions:
1. Check this README first
2. Review existing test scripts documentation
3. Check browser console for error messages
4. Review server logs for backend issues

---

*This dashboard provides a complete solution for enterprise accessibility testing with historical tracking, automated reporting, and executive-level insights.* 