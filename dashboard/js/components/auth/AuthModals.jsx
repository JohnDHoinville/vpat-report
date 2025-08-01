import React, { useState, useEffect } from 'react';
import LoginForm from './LoginForm.jsx';
import UserProfile from './UserProfile.jsx';
import ChangePassword from './ChangePassword.jsx';

const AuthModals = ({ alpineData }) => {
    const [state, setState] = useState({
        showLogin: false,
        showProfile: false,
        showChangePassword: false,
        loading: false,
        loginError: null,
        passwordError: null,
        user: null
    });

    // Sync with Alpine.js state
    useEffect(() => {
        if (alpineData) {
            setState(prev => ({
                ...prev,
                showLogin: alpineData.showLogin || false,
                showProfile: alpineData.showProfile || false,
                showChangePassword: alpineData.showChangePassword || false,
                user: alpineData.user || null,
                loading: alpineData.loading || false
            }));
        }
    }, [alpineData]);

    // Login handler
    const handleLogin = async (formData) => {
        setState(prev => ({ ...prev, loading: true, loginError: null }));
        
        try {
            const response = await window.DashboardAPI.auth.login(formData);
            
            // Update Alpine.js state through the dashboard instance
            if (window.dashboard && typeof window.dashboard === 'function') {
                const dashboardInstance = window.dashboard();
                
                // Set organized state first
                dashboardInstance.auth.token = response.token;
                dashboardInstance.auth.user = response.user;
                dashboardInstance.auth.isAuthenticated = true;
                dashboardInstance.ui.modals.showLogin = false;
                
                // Set legacy state for template compatibility
                dashboardInstance.token = response.token;
                dashboardInstance.user = response.user;
                dashboardInstance.isAuthenticated = true;
                dashboardInstance.showLogin = false;
                
                // Store token
                localStorage.setItem('auth_token', response.token);
                
                // Initialize profile form
                dashboardInstance.profileForm.full_name = response.user.full_name || '';
                dashboardInstance.profileForm.email = response.user.email || '';
                
                // Show success notification
                dashboardInstance.showNotification('success', 'Welcome Back', `Welcome back, ${response.user.full_name || response.user.username}!`);
                
                // Go to projects tab
                dashboardInstance.activeTab = 'projects';
                
                // Initialize WebSocket and load data
                dashboardInstance.initializeWebSocket();
                dashboardInstance.loadInitialData();
            }
            
            setState(prev => ({ 
                ...prev, 
                loading: false, 
                showLogin: false,
                user: response.user 
            }));
            
        } catch (error) {
            setState(prev => ({ 
                ...prev, 
                loading: false, 
                loginError: error.message || 'Login failed' 
            }));
        }
    };

    // Profile update handler
    const handleProfileUpdate = async (formData) => {
        setState(prev => ({ ...prev, loading: true }));
        
        try {
            await window.DashboardAPI.auth.updateProfile(formData);
            
            // Update Alpine.js state
            if (window.dashboard && typeof window.dashboard === 'function') {
                const dashboardInstance = window.dashboard();
                dashboardInstance.showProfile = false;
                dashboardInstance.ui.modals.showProfile = false;
                dashboardInstance.showNotification('success', 'Success', 'Profile updated successfully');
            }
            
            setState(prev => ({ 
                ...prev, 
                loading: false, 
                showProfile: false 
            }));
            
        } catch (error) {
            setState(prev => ({ ...prev, loading: false }));
            
            // Show error notification through Alpine.js
            if (window.dashboard && typeof window.dashboard === 'function') {
                const dashboardInstance = window.dashboard();
                dashboardInstance.showNotification('error', 'Error', error.message || 'Failed to update profile');
            }
        }
    };

    // Change password handler
    const handleChangePassword = async (formData) => {
        setState(prev => ({ ...prev, loading: true, passwordError: null }));
        
        try {
            await window.DashboardAPI.auth.changePassword(formData.current_password, formData.new_password);
            
            // Update Alpine.js state
            if (window.dashboard && typeof window.dashboard === 'function') {
                const dashboardInstance = window.dashboard();
                dashboardInstance.showChangePassword = false;
                dashboardInstance.ui.modals.showChangePassword = false;
                dashboardInstance.passwordForm = { current_password: '', new_password: '', confirm_password: '' };
                dashboardInstance.showNotification('success', 'Success', 'Password changed successfully');
            }
            
            setState(prev => ({ 
                ...prev, 
                loading: false, 
                showChangePassword: false 
            }));
            
        } catch (error) {
            setState(prev => ({ 
                ...prev, 
                loading: false, 
                passwordError: error.message || 'Failed to change password' 
            }));
        }
    };

    // Close handlers that sync with Alpine.js
    const handleCloseLogin = () => {
        if (window.dashboard && typeof window.dashboard === 'function') {
            const dashboardInstance = window.dashboard();
            dashboardInstance.showLogin = false;
            dashboardInstance.ui.modals.showLogin = false;
        }
        setState(prev => ({ ...prev, showLogin: false, loginError: null }));
    };

    const handleCloseProfile = () => {
        if (window.dashboard && typeof window.dashboard === 'function') {
            const dashboardInstance = window.dashboard();
            dashboardInstance.showProfile = false;
            dashboardInstance.ui.modals.showProfile = false;
        }
        setState(prev => ({ ...prev, showProfile: false }));
    };

    const handleCloseChangePassword = () => {
        if (window.dashboard && typeof window.dashboard === 'function') {
            const dashboardInstance = window.dashboard();
            dashboardInstance.showChangePassword = false;
            dashboardInstance.ui.modals.showChangePassword = false;
        }
        setState(prev => ({ ...prev, showChangePassword: false, passwordError: null }));
    };

    return (
        <>
            <LoginForm
                isOpen={state.showLogin}
                onClose={handleCloseLogin}
                onLogin={handleLogin}
                loading={state.loading}
                error={state.loginError}
            />
            
            <UserProfile
                isOpen={state.showProfile}
                onClose={handleCloseProfile}
                onUpdate={handleProfileUpdate}
                user={state.user}
                loading={state.loading}
            />
            
            <ChangePassword
                isOpen={state.showChangePassword}
                onClose={handleCloseChangePassword}
                onChangePassword={handleChangePassword}
                loading={state.loading}
                error={state.passwordError}
            />
        </>
    );
};

export default AuthModals; 