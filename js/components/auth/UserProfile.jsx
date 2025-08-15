import React, { useState, useEffect } from 'react';

const UserProfile = ({ 
    isOpen, 
    onClose, 
    onUpdate, 
    user = null, 
    loading = false 
}) => {
    const [formData, setFormData] = useState({
        full_name: '',
        email: ''
    });

    // Update form data when user prop changes
    useEffect(() => {
        if (user) {
            setFormData({
                full_name: user.full_name || '',
                email: user.email || ''
            });
        }
    }, [user]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onUpdate(formData);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleDateString();
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">User Profile</h3>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Username
                        </label>
                        <div className="px-3 py-2 bg-gray-100 rounded-md text-gray-600">
                            {user?.username || 'N/A'}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email
                        </label>
                        <div className="px-3 py-2 bg-gray-100 rounded-md text-gray-600">
                            {user?.email || 'N/A'}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Full Name
                        </label>
                        <input 
                            name="full_name"
                            type="text" 
                            value={formData.full_name}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Role
                        </label>
                        <div className="px-3 py-2 bg-gray-100 rounded-md text-gray-600">
                            {user?.role || 'N/A'}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Last Login
                        </label>
                        <div className="px-3 py-2 bg-gray-100 rounded-md text-gray-600">
                            {formatDate(user?.last_login)}
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button 
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                        >
                            Close
                        </button>
                        <button 
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                        >
                            {loading ? 'Updating...' : 'Update'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfile; 