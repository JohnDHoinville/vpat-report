# Interactive Authentication for VPAT Automation

## Overview

The interactive authentication feature allows users to manually log in through a browser before running automated tests. This ensures that the automation system can access protected pages that require authentication.

## How It Works

1. **Browser Opens**: A Chromium browser window opens in non-headless mode
2. **Manual Login**: User manually logs in using their credentials
3. **Session Capture**: The system captures authentication cookies and storage state
4. **Database Storage**: Authentication session is saved for future use
5. **Automation Proceeds**: Tests run using the captured authentication

## API Usage

To use interactive authentication, set the `use_interactive_auth` option to `true` in your automation request:

```javascript
const requestData = {
    target_mode: 'session',
    target_ids: [],
    tools: ['axe-core', 'pa11y', 'lighthouse'],
    run_async: true,
    options: {
        use_interactive_auth: true,  // 🔑 This enables interactive auth
        preview_mode: false
    }
};

// Send to the unified automation endpoint
fetch('/api/automated-testing/unified-run/{sessionId}', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestData)
});
```

## Process Flow

### 1. Authentication Phase
- Browser opens with the project's primary URL
- User sees login page in browser window
- User manually enters credentials and logs in
- User navigates to a protected page to verify access
- User presses ENTER in terminal when ready

### 2. Capture Phase
- System captures all cookies and storage state
- Authentication session saved to `crawler_auth_sessions` table
- Browser closes automatically

### 3. Testing Phase
- All automation tools use the captured authentication
- Tests can now access protected pages
- Results reflect authenticated content, not login redirects

## Benefits

✅ **Reliable Authentication**: No cookie expiration issues  
✅ **Real User Flow**: Captures exactly how a user would log in  
✅ **Multi-Factor Support**: Works with complex auth flows (2FA, SSO, etc.)  
✅ **Fresh Sessions**: Creates new authentication every time  
✅ **All Tools Supported**: Works with Axe, Pa11y, Lighthouse, and Contrast Analyzer  

## When to Use

Use interactive authentication when:
- Existing authentication cookies are expired
- Complex login flows (2FA, captcha, etc.)
- First-time setup for a project
- Authentication issues with automated tests

## Technical Implementation

### Backend Changes
- Modified `getAuthContextForSession()` to support interactive mode
- Added `performInteractiveAuthentication()` method
- Updated all tool methods to accept `useInteractiveAuth` parameter
- Modified unified automation controller to pass options through

### Frontend Integration
To add a frontend button for interactive authentication:

```html
<button @click="runWithInteractiveAuth()" 
        class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
    🔐 Login & Test
</button>
```

```javascript
async runWithInteractiveAuth() {
    const requestData = {
        target_mode: 'session',
        tools: ['axe-core'],
        options: { use_interactive_auth: true }
    };
    
    await fetch(`/api/automated-testing/unified-run/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
    });
}
```

## Testing

Use the provided test script:

```bash
node test-interactive-auth.js
```

Update the `sessionId` in the script with your actual session ID.

## Console Output

When running interactive authentication, you'll see:

```
🔐 Starting interactive authentication for session: abc-123
🔐 Opening browser for manual login to: https://example.com
🔐 Project: My Test Project

🔐 INTERACTIVE AUTHENTICATION MODE
================================================
📱 A browser window has opened for manual login
👤 Please complete the following steps:
   1. Log in using your credentials
   2. Navigate to any protected page to verify access
   3. Press ENTER in this terminal when login is complete
================================================

Press ENTER after completing login...
```

After pressing ENTER:

```
📦 Capturing authentication state...
🔍 Current URL after login: https://example.com/dashboard
🍪 Captured 9 cookies
💾 Saved authentication session with ID: abc-456
✅ Authentication captured successfully!
🚀 Starting automated tests with fresh authentication...
```

## Troubleshooting

**Issue**: Browser doesn't open  
**Solution**: Ensure Playwright is installed and system supports GUI

**Issue**: "Session not found" error  
**Solution**: Verify the session ID is correct

**Issue**: Authentication not captured  
**Solution**: Ensure you navigate to a protected page before pressing ENTER

**Issue**: Tests still redirect to login  
**Solution**: Check that cookies were captured (should show > 0 cookies)
