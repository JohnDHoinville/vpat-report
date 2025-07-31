// Minimal dashboard function to bypass Alpine.js timeout
window.dashboard = function() {
    console.log('🚀 Minimal Dashboard function called - initializing...');
    
    return {
        // Authentication
        loginForm: { username: '', password: '' },
        isAuthenticated: false,
        currentUser: null,
        
        // Basic methods
        async login() {
            console.log('🔐 Login attempted');
            // For now, just log success
            this.isAuthenticated = true;
            this.currentUser = { username: this.loginForm.username };
            console.log('✅ Login successful');
        },
        
        logout() {
            this.isAuthenticated = false;
            this.currentUser = null;
            this.loginForm = { username: '', password: '' };
        },
        
        // Placeholder methods
        loading: false,
        error: null,
        showNotification(type, title, message) {
            console.log(`${type.toUpperCase()}: ${title} - ${message}`);
        }
    };
};

console.log('✅ Minimal dashboard function registered');
