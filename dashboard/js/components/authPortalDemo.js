/**
 * Authentication Portal Demo
 * Demonstrates how React authentication components can be rendered via portals
 * and integrated with the existing Alpine.js dashboard
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import AuthModals from './auth/AuthModals.jsx';

class AuthPortalDemo {
    constructor() {
        this.root = null;
        this.dashboardInstance = null;
    }

    // Initialize the React portal
    init() {
        const container = document.getElementById('react-auth-portals');
        if (!container) {
            console.warn('React auth portal container not found');
            return;
        }

        // Get the dashboard instance for state synchronization
        if (window.dashboard && typeof window.dashboard === 'function') {
            this.dashboardInstance = window.dashboard();
        }

        // Create React root and render AuthModals
        this.root = createRoot(container);
        this.renderAuthModals();

        console.log('✅ React Authentication Portal initialized');
    }

    // Render the authentication modals
    renderAuthModals() {
        if (!this.root) return;

        // Get current Alpine.js state for initial render
        const alpineData = this.dashboardInstance ? {
            showLogin: this.dashboardInstance.showLogin || false,
            showProfile: this.dashboardInstance.showProfile || false,
            showChangePassword: this.dashboardInstance.showChangePassword || false,
            user: this.dashboardInstance.user || null,
            loading: this.dashboardInstance.loading || false
        } : {};

        this.root.render(
            <AuthModals alpineData={alpineData} />
        );
    }

    // Method to sync state changes from Alpine.js
    syncWithAlpine() {
        if (this.dashboardInstance) {
            this.renderAuthModals();
        }
    }

    // Cleanup method
    destroy() {
        if (this.root) {
            this.root.unmount();
            this.root = null;
        }
    }
}

// Create global instance
window.AuthPortalDemo = new AuthPortalDemo();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.AuthPortalDemo.init();
    });
} else {
    window.AuthPortalDemo.init();
}

export default AuthPortalDemo; 