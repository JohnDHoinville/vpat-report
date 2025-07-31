# Development Workflow - React-Alpine.js Migration

This document outlines the enhanced development workflow for the dashboard component migration from Alpine.js to React.

## 🚀 Quick Start

### Full Development Environment
```bash
npm run dev
```
This starts all three services:
- **Webpack Dev Server** (port 8081) - React components with hot reloading
- **Frontend Server** (port 8080) - Static files and dashboard
- **Backend API** (port 3001) - Node.js API server

### Component Development Only
```bash
npm run dev:components
```
Starts only webpack dev server and backend (useful when focusing on React components).

### Fast React Development
```bash
npm run dev:fast
```
Starts only the webpack dev server with hot reloading for rapid React development.

## 📦 Available Scripts

### Development Scripts
- `npm run dev` - Full development environment (recommended)
- `npm run dev:components` - Components + backend only
- `npm run dev:fast` - Webpack dev server only
- `npm run webpack:dev` - Start webpack dev server with HMR
- `npm run build:watch` - Build and watch for changes (no HMR)

### Build Scripts
- `npm run build` - Production build
- `npm run build:dev` - Development build
- `npm run build:analyze` - Production build with bundle analysis

### Utility Scripts
- `npm run clean` - Clean all build artifacts and cache
- `npm run clean:build` - Clean only build output
- `node scripts/dev-server-test.js` - Test development server setup

## 🔧 Server Configuration

### Port Allocation
- **8080** - Frontend (dashboard.html, static files)
- **8081** - Webpack Dev Server (React components, HMR)
- **3001** - Backend API (Node.js server)

### Hot Module Replacement (HMR)
React components support hot reloading during development:
- Changes to React components auto-reload without page refresh
- State is preserved where possible
- Fast feedback loop for UI development

## 📁 Project Structure

```
dashboard/
├── js/
│   ├── components/           # React components
│   │   ├── index.js         # Main entry point
│   │   └── utils/           # Alpine-React integration
│   ├── services/            # API layer (to be created)
│   ├── utils/               # Utility functions (to be created)
│   └── dashboard.js         # Original Alpine.js file (12,923 lines)
└── dist/                    # Webpack build output
    ├── react-components.js  # React components bundle
    ├── vendors.js          # Third-party libraries
    └── runtime.js          # Webpack runtime
```

## 🔄 Migration Workflow

### Current Status
✅ **Phase 1A**: React-Alpine.js coexistence infrastructure  
- Webpack configuration with HMR
- Babel configuration for JSX
- Development scripts and hot reloading
- React portal system for Alpine integration

### During Migration
1. **Alpine.js remains active** - existing functionality unchanged
2. **React components added incrementally** - via portals
3. **State bridge** - shared state between frameworks
4. **Hot reloading** - instant feedback on component changes

## 🛠 Development Tips

### React Component Development
1. Create components in `dashboard/js/components/`
2. Use the Alpine integration utilities for state sharing
3. Test components using `npm run dev:fast` for fastest iteration

### Alpine.js Integration
```javascript
// Render React component from Alpine.js
window.renderReactComponent('TestComponent', { message: 'Hello!' }, 'container-id');

// Use state bridge for shared data
window.alpineReactBridge.setState('currentUser', userData);
```

### Debugging
- **React DevTools** - Available in development builds
- **Webpack Bundle Analyzer** - Use `npm run build:analyze`
- **Console Logging** - React components log integration status

## 🔍 Testing the Setup

Run the development server test:
```bash
node scripts/dev-server-test.js
```

This will:
1. Start webpack dev server
2. Test if React components are served correctly
3. Verify hot reloading functionality
4. Clean up automatically

## 📊 Performance Notes

### Development Bundle Sizes
- **vendors.js**: ~3.3 MiB (React, ReactDOM, dev tools)
- **react-components.js**: ~47 KiB (our components)
- **runtime.js**: ~9.8 KiB (webpack runtime)

### Production Optimizations
- Tree shaking for unused code
- Code splitting for better caching
- CSS extraction and minification
- Source maps for debugging

## 🚨 Troubleshooting

### Common Issues

**Hot reloading not working**
- Ensure you're using `npm run dev` or `npm run webpack:dev`
- Check that port 8081 is available

**React components not loading**
- Verify webpack dev server is running on port 8081
- Check browser console for CORS or loading errors

**Alpine.js conflicts**
- React components are isolated via portals
- State bridge handles cross-framework communication
- Check console for integration warnings

### Getting Help
- Check browser console for React component errors
- Monitor webpack dev server output for build issues
- Use React DevTools for component debugging

---

**Next Steps**: Ready to proceed with Phase 1 component migration! 🎉 