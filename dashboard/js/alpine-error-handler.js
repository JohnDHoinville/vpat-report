/**
 * Alpine.js Error-First Debugging System
 * FAIL FAST: Stop execution when data issues are detected
 * NO SILENT FALLBACKS: Always report what went wrong
 */

class AlpineErrorHandler {
    constructor() {
        this.errorCounts = new Map();
        this.criticalErrors = [];
        this.init();
    }

    init() {
        // Global Alpine error handler - FAIL FAST
        document.addEventListener('alpine:init', () => {
            Alpine.onBeforeCall = (expression, context, result) => {
                try {
                    return result;
                } catch (error) {
                    this.handleAlpineError(error, expression, context);
                    // THROW instead of returning fallback
                    throw new Error(`Alpine Expression Failed: ${error.message} in "${expression}"`);
                }
            };
        });

        // Override console.warn to catch Alpine warnings and escalate them
        const originalWarn = console.warn;
        console.warn = (...args) => {
            const message = args.join(' ');
            if (message.includes('Alpine')) {
                this.handleAlpineWarning(message, args);
                // Escalate warnings to errors in development
                console.error('🚨 ESCALATED ALPINE WARNING:', message);
            }
            return originalWarn.apply(console, args);
        };

        // Global error handler for uncaught Alpine errors
        window.addEventListener('error', (event) => {
            if (event.error && event.error.message && event.error.message.includes('Alpine')) {
                this.handleAlpineError(event.error, 'global', null);
                // Don't prevent default - let it crash visibly
            }
        });
    }

    handleAlpineError(error, expression, context) {
        const errorKey = `${error.message}-${expression}`;
        
        // Track all errors, don't suppress any
        const count = this.errorCounts.get(errorKey) || 0;
        this.errorCounts.set(errorKey, count + 1);

        // Create detailed error report
        const errorReport = {
            message: error.message,
            expression,
            context: context ? this.sanitizeContext(context) : null,
            stack: error.stack,
            count: count + 1,
            timestamp: new Date().toISOString()
        };

        this.criticalErrors.push(errorReport);

        console.error('🚨 ALPINE ERROR DETECTED:', {
            error: error.message,
            expression,
            context: context ? this.sanitizeContext(context) : null,
            stack: error.stack,
            count: count + 1,
            suggestion: this.getErrorSuggestion(error.message, expression)
        });

        // Show visible error in UI
        this.showVisibleError(errorReport);
    }

    handleAlpineWarning(message, args) {
        // Provide specific solutions for common Alpine warnings
        if (message.includes('Duplicate key on x-for')) {
            console.error('🚨 DUPLICATE KEY ERROR: This will cause rendering issues!');
            console.error('💡 SOLUTION: Use unique keys like item.id or combine properties: `${item.id}-${index}`');
        } else if (message.includes('x-for ":key" is undefined')) {
            console.error('🚨 UNDEFINED KEY ERROR: x-for key expression is invalid!');
            console.error('💡 SOLUTION: Check that your key expression returns a valid value');
        } else if (message.includes('is not defined')) {
            console.error('🚨 UNDEFINED VARIABLE ERROR: Referenced property does not exist!');
            console.error('💡 SOLUTION: Check that all referenced properties exist in your x-data');
        }
    }

    getErrorSuggestion(message, expression) {
        if (message.includes('Cannot read properties of undefined')) {
            return `Property access failed in "${expression}". Check if the object exists before accessing properties.`;
        }
        if (message.includes('Cannot read properties of null')) {
            return `Null reference in "${expression}". Verify the data is loaded before use.`;
        }
        if (message.includes('is not a function')) {
            return `Function call failed in "${expression}". Check if the function is defined and accessible.`;
        }
        return `Error in "${expression}". Check the data structure and variable names.`;
    }

    showVisibleError(errorReport) {
        // Create visible error overlay in the UI
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff4444;
            color: white;
            padding: 15px;
            border-radius: 5px;
            z-index: 10000;
            max-width: 400px;
            font-family: monospace;
            font-size: 12px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        `;
        
        errorDiv.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 8px;">🚨 ALPINE ERROR DETECTED</div>
            <div><strong>Expression:</strong> ${errorReport.expression}</div>
            <div><strong>Error:</strong> ${errorReport.message}</div>
            <div><strong>Count:</strong> ${errorReport.count}</div>
            <button onclick="this.parentElement.remove()" style="margin-top: 8px; background: white; color: #ff4444; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer;">Dismiss</button>
        `;

        document.body.appendChild(errorDiv);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.remove();
            }
        }, 10000);
    }

    sanitizeContext(context) {
        // Remove circular references and large objects for logging
        try {
            return JSON.parse(JSON.stringify(context, null, 2));
        } catch {
            return { type: typeof context, keys: Object.keys(context || {}) };
        }
    }

    // Method to get error summary for debugging
    getErrorSummary() {
        return {
            totalErrors: this.criticalErrors.length,
            uniqueErrors: this.errorCounts.size,
            mostCommonErrors: Array.from(this.errorCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5),
            recentErrors: this.criticalErrors.slice(-10)
        };
    }
}

/**
 * STRICT Helper Functions - NO FALLBACKS, IMMEDIATE ERRORS
 */
window.alpineHelpers = {
    // STRICT array validation - throws on invalid data
    strictArray: (arr, context = 'unknown') => {
        if (arr === null) {
            throw new Error(`DATA ERROR: Expected array but got null in context: ${context}`);
        }
        if (arr === undefined) {
            throw new Error(`DATA ERROR: Expected array but got undefined in context: ${context}`);
        }
        if (!Array.isArray(arr)) {
            throw new Error(`DATA ERROR: Expected array but got ${typeof arr} (${JSON.stringify(arr)}) in context: ${context}`);
        }
        return arr;
    },

    // STRICT object validation - throws on invalid data
    strictObject: (obj, context = 'unknown') => {
        if (obj === null) {
            throw new Error(`DATA ERROR: Expected object but got null in context: ${context}`);
        }
        if (obj === undefined) {
            throw new Error(`DATA ERROR: Expected object but got undefined in context: ${context}`);
        }
        if (typeof obj !== 'object') {
            throw new Error(`DATA ERROR: Expected object but got ${typeof obj} (${JSON.stringify(obj)}) in context: ${context}`);
        }
        return obj;
    },

    // STRICT property access - throws on missing properties
    strictGet: (obj, path, context = 'unknown') => {
        if (obj === null || obj === undefined) {
            throw new Error(`DATA ERROR: Cannot access property "${path}" on ${obj} in context: ${context}`);
        }
        
        const keys = path.split('.');
        let current = obj;
        
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (current === null || current === undefined) {
                throw new Error(`DATA ERROR: Property "${keys.slice(0, i).join('.')}" is ${current} when accessing "${path}" in context: ${context}`);
            }
            if (!(key in current)) {
                throw new Error(`DATA ERROR: Property "${key}" does not exist in "${keys.slice(0, i).join('.')}" when accessing "${path}" in context: ${context}. Available properties: ${Object.keys(current).join(', ')}`);
            }
            current = current[key];
        }
        
        return current;
    },

    // Generate unique keys with validation
    strictUniqueKey: (item, index, prefix = 'item', context = 'unknown') => {
        if (index === undefined || index === null) {
            throw new Error(`DATA ERROR: Index is ${index} when generating key in context: ${context}`);
        }
        
        if (item && typeof item === 'object') {
            const key = item.id || item.key || item.url || item.page_id || item.page_url;
            if (key) {
                return `${prefix}-${key}`;
            }
        }
        
        // Use index as last resort but warn about it
        console.warn(`🟡 WARNING: Using index-based key for item in context: ${context}. Consider adding an 'id' property for better performance.`);
        return `${prefix}-${index}`;
    },

    // STRICT function call - throws on invalid functions
    strictCall: (fn, context = 'unknown', ...args) => {
        if (typeof fn !== 'function') {
            throw new Error(`DATA ERROR: Expected function but got ${typeof fn} in context: ${context}`);
        }
        try {
            return fn(...args);
        } catch (error) {
            throw new Error(`FUNCTION ERROR: Function call failed in context: ${context}. Original error: ${error.message}`);
        }
    }
};

/**
 * Alpine.js Magic Properties - STRICT MODE
 */
document.addEventListener('alpine:init', () => {
    // Magic property for STRICT array validation
    Alpine.magic('strictArray', () => {
        return (arr, context = 'template') => {
            return window.alpineHelpers.strictArray(arr, context);
        };
    });

    // Magic property for unique keys with validation
    Alpine.magic('strictKey', () => {
        return (item, index, prefix = 'item', context = 'template') => {
            return window.alpineHelpers.strictUniqueKey(item, index, prefix, context);
        };
    });

    // Magic property for STRICT property access
    Alpine.magic('strictGet', () => {
        return (obj, path, context = 'template') => {
            return window.alpineHelpers.strictGet(obj, path, context);
        };
    });
});

// Initialize error handler
const alpineErrorHandler = new AlpineErrorHandler();

// Export for global access
window.alpineErrorHandler = alpineErrorHandler;

// Development helper: expose error summary to console
if (typeof window !== 'undefined') {
    window.getAlpineErrors = () => alpineErrorHandler.getErrorSummary();
    console.log('🔍 Alpine Error Tracking Active. Use getAlpineErrors() to see error summary.');
} 