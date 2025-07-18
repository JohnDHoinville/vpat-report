/**
 * Dynamic Authentication Service
 * Handles real-time authentication prompts during site crawling
 */

class DynamicAuthService {
    constructor(pool, wsService) {
        this.pool = pool;
        this.wsService = wsService;
        this.pendingAuthPrompts = new Map(); // discoveryId -> authPrompt
    }

    /**
     * Detect if a page requires authentication
     */
    detectAuthenticationRequired(url, responseBody, statusCode) {
        // Common login indicators
        const loginIndicators = [
            // Form-based indicators
            'type="password"',
            'name="password"',
            'id="password"',
            
            // Text-based indicators
            'sign in',
            'log in',
            'login',
            'please log in',
            'authentication required',
            'unauthorized',
            'access denied',
            
            // SAML/SSO indicators
            'shibboleth',
            'saml',
            'single sign',
            'institutional login',
            'login through your institution',
            
            // Common login URLs
            '/login',
            '/signin',
            '/auth',
            '/sso',
            
            // HTTP status indicators
            statusCode === 401,
            statusCode === 403
        ];

        const urlLower = url.toLowerCase();
        const bodyLower = responseBody ? responseBody.toLowerCase() : '';

        // Check for login indicators
        const hasLoginIndicator = loginIndicators.some(indicator => {
            if (typeof indicator === 'boolean') return indicator;
            return urlLower.includes(indicator.toLowerCase()) || 
                   bodyLower.includes(indicator.toLowerCase());
        });

        // Extract login form details if found
        if (hasLoginIndicator && responseBody) {
            const formInfo = this.extractLoginFormInfo(responseBody, url);
            return {
                requiresAuth: true,
                loginForm: formInfo,
                loginUrl: url,
                authType: this.detectAuthType(responseBody, url)
            };
        }

        return { requiresAuth: false };
    }

    /**
     * Extract login form information from HTML
     */
    extractLoginFormInfo(html, pageUrl) {
        try {
            const formRegex = /<form[^>]*>([\s\S]*?)<\/form>/gi;
            const forms = [];
            let match;

            while ((match = formRegex.exec(html)) !== null) {
                const formHtml = match[0];
                const formBody = match[1];

                // Check if this form contains password fields
                if (formBody.includes('type="password"') || 
                    formBody.includes('name="password"') ||
                    formBody.includes('id="password"')) {
                    
                    const form = {
                        action: this.extractAttribute(formHtml, 'action') || pageUrl,
                        method: (this.extractAttribute(formHtml, 'method') || 'POST').toUpperCase(),
                        fields: this.extractFormFields(formBody)
                    };

                    forms.push(form);
                }
            }

            return forms.length > 0 ? forms[0] : null;
        } catch (error) {
            console.error('Error extracting login form:', error);
            return null;
        }
    }

    /**
     * Extract form fields from HTML
     */
    extractFormFields(formHtml) {
        const fieldRegex = /<input[^>]*>/gi;
        const fields = [];
        let match;

        while ((match = fieldRegex.exec(formHtml)) !== null) {
            const input = match[0];
            const type = this.extractAttribute(input, 'type') || 'text';
            const name = this.extractAttribute(input, 'name');
            const id = this.extractAttribute(input, 'id');
            const value = this.extractAttribute(input, 'value') || '';

            if (name && type !== 'hidden') {
                fields.push({
                    name,
                    id,
                    type,
                    value,
                    label: this.guessFieldLabel(name, id, type)
                });
            }
        }

        return fields;
    }

    /**
     * Extract attribute value from HTML tag
     */
    extractAttribute(html, attribute) {
        const regex = new RegExp(`${attribute}\\s*=\\s*["']([^"']*)["']`, 'i');
        const match = regex.exec(html);
        return match ? match[1] : null;
    }

    /**
     * Guess field label based on name/id/type
     */
    guessFieldLabel(name, id, type) {
        const fieldName = (name || id || '').toLowerCase();
        
        if (type === 'password') return 'Password';
        if (fieldName.includes('user')) return 'Username';
        if (fieldName.includes('email')) return 'Email';
        if (fieldName.includes('login')) return 'Login';
        
        // Capitalize first letter
        return fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
    }

    /**
     * Detect authentication type
     */
    detectAuthType(html, url) {
        const htmlLower = html.toLowerCase();
        const urlLower = url.toLowerCase();

        if (htmlLower.includes('shibboleth') || htmlLower.includes('saml') || 
            htmlLower.includes('institutional login') || urlLower.includes('shibboleth')) {
            return 'sso';
        }
        
        if (htmlLower.includes('oauth') || htmlLower.includes('sign in with')) {
            return 'oauth';
        }
        
        return 'form';
    }

    /**
     * Prompt user for authentication credentials
     */
    async promptForCredentials(discoveryId, authInfo) {
        const projectId = await this.getProjectIdFromDiscovery(discoveryId);
        
        const authPrompt = {
            id: `auth_${Date.now()}`,
            discoveryId,
            projectId,
            authInfo,
            status: 'pending',
            createdAt: new Date()
        };

        this.pendingAuthPrompts.set(discoveryId, authPrompt);

        // Emit auth prompt via WebSocket
        if (this.wsService) {
            this.wsService.emitAuthPrompt(projectId, discoveryId, {
                promptId: authPrompt.id,
                loginUrl: authInfo.loginUrl,
                authType: authInfo.authType,
                formFields: authInfo.loginForm?.fields || [],
                message: 'Authentication required to continue discovery'
            });
        }

        // Wait for user response (with timeout)
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingAuthPrompts.delete(discoveryId);
                reject(new Error('Authentication prompt timeout'));
            }, 300000); // 5 minute timeout

            authPrompt.resolve = (credentials) => {
                clearTimeout(timeout);
                this.pendingAuthPrompts.delete(discoveryId);
                resolve(credentials);
            };

            authPrompt.reject = (error) => {
                clearTimeout(timeout);
                this.pendingAuthPrompts.delete(discoveryId);
                reject(error);
            };
        });
    }

    /**
     * Handle user response to auth prompt
     */
    async handleAuthResponse(discoveryId, promptId, credentials) {
        const authPrompt = this.pendingAuthPrompts.get(discoveryId);
        
        if (!authPrompt || authPrompt.id !== promptId) {
            throw new Error('Invalid or expired auth prompt');
        }

        if (credentials) {
            authPrompt.resolve(credentials);
        } else {
            authPrompt.reject(new Error('Authentication cancelled by user'));
        }
    }

    /**
     * Get project ID from discovery ID
     */
    async getProjectIdFromDiscovery(discoveryId) {
        const result = await this.pool.query(
            'SELECT project_id FROM site_discoveries WHERE id = $1',
            [discoveryId]
        );
        return result.rows[0]?.project_id;
    }

    /**
     * Create authentication configuration from user credentials
     */
    createAuthConfig(credentials, authInfo) {
        return {
            type: authInfo.authType,
            baseUrl: new URL(authInfo.loginUrl).origin,
            loginUrl: authInfo.loginUrl,
            credentials: credentials,
            formInfo: authInfo.loginForm
        };
    }
}

module.exports = DynamicAuthService; 