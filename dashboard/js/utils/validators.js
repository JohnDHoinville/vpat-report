/**
 * Validation Utilities
 * Extracted from dashboard.js for better organization and reusability
 */

/**
 * Validate email format using regex
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
export function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate user form data
 * @param {Object} userForm - User form data
 * @returns {Object} Validation result with errors object and isValid boolean
 */
export function validateUserForm(userForm) {
    const errors = {};
    
    if (!userForm.username || !userForm.username.trim()) {
        errors.username = 'Username is required';
    }
    
    if (!userForm.email || !userForm.email.trim()) {
        errors.email = 'Email is required';
    } else if (!isValidEmail(userForm.email)) {
        errors.email = 'Invalid email format';
    }
    
    if (!userForm.id && !userForm.password) {
        errors.password = 'Password is required for new users';
    }
    
    if (userForm.password && userForm.password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
    }
    
    if (userForm.password !== userForm.confirm_password) {
        errors.confirm_password = 'Passwords do not match';
    }
    
    return {
        errors,
        isValid: Object.keys(errors).length === 0
    };
}

/**
 * Validate that required fields are not empty
 * @param {Object} fields - Object with field name as key and value as value
 * @returns {Object} Validation result with errors object and isValid boolean
 */
export function validateRequiredFields(fields) {
    const errors = {};
    
    Object.keys(fields).forEach(fieldName => {
        const value = fields[fieldName];
        if (!value || (typeof value === 'string' && !value.trim())) {
            errors[fieldName] = `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
        }
    });
    
    return {
        errors,
        isValid: Object.keys(errors).length === 0
    };
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL format
 */
export function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with strength level and requirements
 */
export function validatePasswordStrength(password) {
    const requirements = {
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /\d/.test(password),
        hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    const metRequirements = Object.values(requirements).filter(Boolean).length;
    let strength = 'weak';
    
    if (metRequirements >= 4) strength = 'strong';
    else if (metRequirements >= 3) strength = 'medium';
    
    return {
        strength,
        requirements,
        isValid: metRequirements >= 3
    };
}

/**
 * Validate that passwords match
 * @param {string} password - Primary password
 * @param {string} confirmPassword - Confirmation password
 * @returns {boolean} True if passwords match
 */
export function passwordsMatch(password, confirmPassword) {
    return password === confirmPassword;
} 