import React, { useState } from 'react';

const ChangePassword = ({ 
    isOpen, 
    onClose, 
    onChangePassword, 
    loading = false, 
    error = null 
}) => {
    const [formData, setFormData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });

    const [validationError, setValidationError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Validation
        if (formData.new_password !== formData.confirm_password) {
            setValidationError('New passwords do not match');
            return;
        }
        
        if (formData.new_password.length < 8) {
            setValidationError('Password must be at least 8 characters long');
            return;
        }
        
        setValidationError('');
        onChangePassword({
            current_password: formData.current_password,
            new_password: formData.new_password
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Clear validation error when user starts typing
        if (validationError) {
            setValidationError('');
        }
    };

    const handleClose = () => {
        setFormData({
            current_password: '',
            new_password: '',
            confirm_password: ''
        });
        setValidationError('');
        onClose();
    };

    if (!isOpen) return null;

    const displayError = validationError || error;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Current Password
                        </label>
                        <input 
                            name="current_password"
                            type="password" 
                            required 
                            autoComplete="current-password"
                            value={formData.current_password}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            New Password
                        </label>
                        <input 
                            name="new_password"
                            type="password" 
                            required 
                            autoComplete="new-password"
                            value={formData.new_password}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Confirm New Password
                        </label>
                        <input 
                            name="confirm_password"
                            type="password" 
                            required 
                            autoComplete="new-password"
                            value={formData.confirm_password}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    {displayError && (
                        <div className="text-red-600 text-sm">{displayError}</div>
                    )}
                    <div className="flex justify-end space-x-3 pt-4">
                        <button 
                            type="button" 
                            onClick={handleClose}
                            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                        >
                            {loading ? 'Changing...' : 'Change Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChangePassword; 