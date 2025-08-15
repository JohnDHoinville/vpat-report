/**
 * Authentication Token Management Service
 * Handles JWT token refresh, automatic renewal, and session management
 * 
 * Features:
 * - Automatic token refresh before expiration
 * - Queue API calls during token refresh to prevent race conditions
 * - Fallback to login when refresh fails
 * - Integration with existing dashboard authentication
 */

window.AuthTokenService = {
    // Configuration
    config: {
        refreshThresholdMinutes: 10, // Refresh token when 10 minutes left
        maxRetryAttempts: 3,
        refreshCheckInterval: 60000, // Check every minute
    },

    // Internal state
    state: {
        isRefreshing: false,
        pendingRequests: [],
        refreshTimer: null,
        tokenExpiryTime: null,
        refreshToken: null
    },

    /**
     * Initialize the token service
     */
    init() {
        console.log('🔐 Initializing Auth Token Service');
        
        // Load existing tokens from storage
        this.loadTokensFromStorage();
        
        // Start periodic token checks
        this.startTokenMonitoring();
        
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.checkTokenExpiry();
            }
        });

        console.log('✅ Auth Token Service initialized');
    },

    /**
     * Load tokens from localStorage
     */
    loadTokensFromStorage() {
        try {
            const authToken = localStorage.getItem('authToken');
            const refreshToken = localStorage.getItem('refreshToken');
            const tokenExpiry = localStorage.getItem('tokenExpiry');

            if (authToken && refreshToken) {
                this.state.refreshToken = refreshToken;
                this.state.tokenExpiryTime = tokenExpiry ? new Date(tokenExpiry) : null;
                
                console.log('🔑 Loaded existing tokens from storage');
                
                // Check if token needs immediate refresh
                if (this.shouldRefreshToken()) {
                    console.log('⏰ Token expires soon, scheduling immediate refresh');
                    setTimeout(() => this.refreshToken(), 1000);
                }
            }
        } catch (error) {
            console.error('❌ Error loading tokens from storage:', error);
        }
    },

    /**
     * Store tokens in localStorage
     */
    storeTokens(authToken, refreshToken, expiresIn = '2h') {
        try {
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('refreshToken', refreshToken);
            
            // Calculate expiry time
            const expiryTime = new Date();
            if (expiresIn.endsWith('h')) {
                const hours = parseInt(expiresIn.slice(0, -1));
                expiryTime.setHours(expiryTime.getHours() + hours);
            } else if (expiresIn.endsWith('m')) {
                const minutes = parseInt(expiresIn.slice(0, -1));
                expiryTime.setMinutes(expiryTime.getMinutes() + minutes);
            } else {
                // Default to 2 hours
                expiryTime.setHours(expiryTime.getHours() + 2);
            }
            
            localStorage.setItem('tokenExpiry', expiryTime.toISOString());
            
            this.state.refreshToken = refreshToken;
            this.state.tokenExpiryTime = expiryTime;
            
            console.log(`🔑 Stored new tokens, expires at: ${expiryTime.toLocaleTimeString()}`);
        } catch (error) {
            console.error('❌ Error storing tokens:', error);
        }
    },

    /**
     * Clear all tokens
     */
    clearTokens() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('tokenExpiry');
        
        this.state.refreshToken = null;
        this.state.tokenExpiryTime = null;
        
        console.log('🗑️ Cleared all authentication tokens');
    },

    /**
     * Check if token should be refreshed
     */
    shouldRefreshToken() {
        if (!this.state.tokenExpiryTime || !this.state.refreshToken) {
            return false;
        }

        const now = new Date();
        const timeUntilExpiry = this.state.tokenExpiryTime.getTime() - now.getTime();
        const thresholdMs = this.config.refreshThresholdMinutes * 60 * 1000;

        return timeUntilExpiry <= thresholdMs && timeUntilExpiry > 0;
    },

    /**
     * Check if token is expired
     */
    isTokenExpired() {
        if (!this.state.tokenExpiryTime) {
            return false;
        }

        return new Date() >= this.state.tokenExpiryTime;
    },

    /**
     * Start periodic token monitoring
     */
    startTokenMonitoring() {
        if (this.state.refreshTimer) {
            clearInterval(this.state.refreshTimer);
        }

        this.state.refreshTimer = setInterval(() => {
            this.checkTokenExpiry();
        }, this.config.refreshCheckInterval);

        console.log('⏰ Started token monitoring (check every minute)');
    },

    /**
     * Stop token monitoring
     */
    stopTokenMonitoring() {
        if (this.state.refreshTimer) {
            clearInterval(this.state.refreshTimer);
            this.state.refreshTimer = null;
        }
    },

    /**
     * Check token expiry and refresh if needed
     */
    async checkTokenExpiry() {
        if (this.state.isRefreshing) {
            return;
        }

        if (this.isTokenExpired()) {
            console.log('❌ Token is expired, clearing auth state');
            this.handleTokenExpired();
            return;
        }

        if (this.shouldRefreshToken()) {
            console.log('🔄 Token expires soon, refreshing...');
            await this.refreshToken();
        }
    },

    /**
     * Refresh the authentication token
     */
    async refreshToken() {
        if (this.state.isRefreshing) {
            // Wait for ongoing refresh
            return new Promise((resolve) => {
                this.state.pendingRequests.push(resolve);
            });
        }

        if (!this.state.refreshToken) {
            console.log('❌ No refresh token available');
            this.handleTokenExpired();
            return false;
        }

        this.state.isRefreshing = true;
        console.log('🔄 Starting token refresh...');

        try {
            const response = await fetch(`${window.DashboardAPI.config.baseUrl}/api/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    refresh_token: this.state.refreshToken
                })
            });

            if (!response.ok) {
                throw new Error(`Refresh failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            // Store new tokens
            this.storeTokens(data.token, data.refresh_token, data.expires_in || '2h');
            
            // Notify pending requests
            this.state.pendingRequests.forEach(resolve => resolve(true));
            this.state.pendingRequests = [];
            
            console.log('✅ Token refreshed successfully');
            
            // Notify dashboard of token update if available
            if (window.handleTokenRefresh) {
                window.handleTokenRefresh(data.token);
            } else if (window.dashboard && typeof window.dashboard === 'function') {
                const dashboardInstance = window.dashboard();
                if (dashboardInstance.handleTokenRefresh) {
                    dashboardInstance.handleTokenRefresh(data.token);
                }
            }

            return true;

        } catch (error) {
            console.error('❌ Token refresh failed:', error);
            
            // Notify pending requests of failure
            this.state.pendingRequests.forEach(resolve => resolve(false));
            this.state.pendingRequests = [];
            
            // Handle refresh failure
            this.handleTokenExpired();
            return false;

        } finally {
            this.state.isRefreshing = false;
        }
    },

    /**
     * Handle token expiration
     */
    handleTokenExpired() {
        console.log('🔐 Handling token expiration');
        
        this.clearTokens();
        this.stopTokenMonitoring();
        
        // Notify dashboard of auth error
        if (window.handleAuthError) {
            window.handleAuthError();
        } else if (window.dashboard && typeof window.dashboard === 'function') {
            const dashboardInstance = window.dashboard();
            if (dashboardInstance.handleAuthError) {
                dashboardInstance.handleAuthError();
            }
        }

        // Fallback to clearing auth state
        if (window.DashboardAPI && window.DashboardAPI.client) {
            window.DashboardAPI.client.handleAuthError();
        }
    },

    /**
     * Handle successful login - store tokens and start monitoring
     */
    handleLogin(authToken, refreshToken, expiresIn) {
        console.log('🔐 Handling successful login');
        
        this.storeTokens(authToken, refreshToken, expiresIn);
        this.startTokenMonitoring();
        
        // Check if we need immediate refresh (shouldn't happen on login, but safety check)
        setTimeout(() => this.checkTokenExpiry(), 5000);
    },

    /**
     * Handle logout - clear tokens and stop monitoring
     */
    handleLogout() {
        console.log('🔐 Handling logout');
        
        this.clearTokens();
        this.stopTokenMonitoring();
    },

    /**
     * Get time until token expiry (for UI display)
     */
    getTimeUntilExpiry() {
        if (!this.state.tokenExpiryTime) {
            return null;
        }

        const now = new Date();
        const timeLeft = this.state.tokenExpiryTime.getTime() - now.getTime();
        
        if (timeLeft <= 0) {
            return 'Expired';
        }

        const minutes = Math.floor(timeLeft / (1000 * 60));
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else {
            return `${minutes}m`;
        }
    },

    /**
     * Get token status for debugging
     */
    getStatus() {
        return {
            hasToken: !!localStorage.getItem('authToken'),
            hasRefreshToken: !!this.state.refreshToken,
            expiryTime: this.state.tokenExpiryTime,
            timeUntilExpiry: this.getTimeUntilExpiry(),
            shouldRefresh: this.shouldRefreshToken(),
            isExpired: this.isTokenExpired(),
            isRefreshing: this.state.isRefreshing,
            pendingRequests: this.state.pendingRequests.length
        };
    }
};

// Auto-initialize when loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.AuthTokenService.init();
    });
} else {
    window.AuthTokenService.init();
}

console.log('✅ Auth Token Service loaded');
