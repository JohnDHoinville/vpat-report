import React, { useState, useEffect } from 'react';

const CreateCrawlerModal = ({ 
    isOpen, 
    onClose, 
    onCreateCrawler, 
    selectedProject = null,
    loading = false, 
    error = null 
}) => {
    const [formData, setFormData] = useState({
        name: '',
        browser_type: 'chromium',
        base_url: '',
        max_pages: 50,
        max_depth: 3,
        request_delay_ms: 1000,
        respect_robots_txt: true,
        include_subdomains: false,
        extract_links: true,
        extract_forms: true,
        extract_images: true,
        extract_metadata: true,
        viewport_width: 1920,
        viewport_height: 1080,
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        timeout_ms: 30000,
        concurrent_requests: 5,
        retry_attempts: 3,
        follow_redirects: true,
        javascript_enabled: true,
        wait_for_load: true,
        take_screenshots: true,
        extract_text: true,
        mode: 'advanced',
        // Auth configuration
        auth_type: 'none',
        auth_credentials: {
            username: '',
            password: '',
            domain: ''
        },
        saml_config: {
            idp_url: '',
            sp_entity_id: '',
            assertion_consumer_service_url: ''
        },
        auth_workflow: {
            login_url: '',
            username_selector: 'input[name="username"]',
            password_selector: 'input[type="password"]',
            submit_selector: 'button[type="submit"]',
            success_indicator: ''
        }
    });

    const [showAdvanced, setShowAdvanced] = useState(false);
    const [activeTab, setActiveTab] = useState('basic');

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setFormData(prev => ({
                ...prev,
                name: '',
                base_url: '',
                auth_type: 'none'
            }));
            setActiveTab('basic');
            setShowAdvanced(false);
        }
    }, [isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Validate required fields
        if (!formData.name.trim()) {
            return;
        }
        if (!formData.base_url.trim()) {
            return;
        }
        if (!selectedProject) {
            return;
        }

        onCreateCrawler({
            ...formData,
            project_id: selectedProject.id
        });
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [child]: type === 'checkbox' ? checked : value
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : 
                        type === 'number' ? parseInt(value, 10) || 0 : 
                        value
            }));
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Create Web Crawler</h3>
                        <p className="text-sm text-gray-600 mt-1">Setup a new Playwright-based web crawler</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                    
                    {/* Tab Navigation */}
                    <div className="flex space-x-4 border-b border-gray-200">
                        <button
                            type="button"
                            onClick={() => setActiveTab('basic')}
                            className={`pb-2 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'basic' 
                                    ? 'border-blue-500 text-blue-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Basic Configuration
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('advanced')}
                            className={`pb-2 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'advanced' 
                                    ? 'border-blue-500 text-blue-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Advanced Settings
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('auth')}
                            className={`pb-2 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'auth' 
                                    ? 'border-blue-500 text-blue-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Authentication
                        </button>
                    </div>

                    {/* Basic Configuration Tab */}
                    {activeTab === 'basic' && (
                        <fieldset className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Crawler Name *
                                </label>
                                <input 
                                    name="name"
                                    type="text" 
                                    required
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., Main Site Crawler"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Browser Type
                                </label>
                                <select 
                                    name="browser_type"
                                    value={formData.browser_type}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="chromium">Chromium</option>
                                    <option value="firefox">Firefox</option>
                                    <option value="webkit">WebKit</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Base URL *
                                </label>
                                <input 
                                    name="base_url"
                                    type="url" 
                                    required
                                    value={formData.base_url}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="https://example.com"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Max Pages
                                    </label>
                                    <input 
                                        name="max_pages"
                                        type="number" 
                                        min="1" 
                                        max="1000"
                                        value={formData.max_pages}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Max Depth
                                    </label>
                                    <input 
                                        name="max_depth"
                                        type="number" 
                                        min="1" 
                                        max="10"
                                        value={formData.max_depth}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </fieldset>
                    )}

                    {/* Advanced Settings Tab */}
                    {activeTab === 'advanced' && (
                        <fieldset className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Request Delay (ms)
                                </label>
                                <input 
                                    name="request_delay_ms"
                                    type="number" 
                                    min="0" 
                                    max="10000"
                                    value={formData.request_delay_ms}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Viewport Width
                                    </label>
                                    <input 
                                        name="viewport_width"
                                        type="number"
                                        value={formData.viewport_width}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Viewport Height
                                    </label>
                                    <input 
                                        name="viewport_height"
                                        type="number"
                                        value={formData.viewport_height}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="font-medium text-gray-900">Crawler Options</h4>
                                {[
                                    { name: 'respect_robots_txt', label: 'Respect robots.txt' },
                                    { name: 'include_subdomains', label: 'Include subdomains' },
                                    { name: 'javascript_enabled', label: 'Enable JavaScript' },
                                    { name: 'take_screenshots', label: 'Take screenshots' },
                                    { name: 'follow_redirects', label: 'Follow redirects' }
                                ].map(option => (
                                    <label key={option.name} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            name={option.name}
                                            checked={formData[option.name]}
                                            onChange={handleInputChange}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                    )}

                    {/* Authentication Tab */}
                    {activeTab === 'auth' && (
                        <fieldset className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Authentication Type
                                </label>
                                <select 
                                    name="auth_type"
                                    value={formData.auth_type}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="none">No Authentication</option>
                                    <option value="basic">Basic Auth</option>
                                    <option value="form">Form-based Login</option>
                                    <option value="saml">SAML SSO</option>
                                </select>
                            </div>

                            {formData.auth_type === 'basic' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Username
                                        </label>
                                        <input 
                                            name="auth_credentials.username"
                                            type="text"
                                            value={formData.auth_credentials.username}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Password
                                        </label>
                                        <input 
                                            name="auth_credentials.password"
                                            type="password"
                                            value={formData.auth_credentials.password}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            )}

                            {formData.auth_type === 'form' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Login URL
                                        </label>
                                        <input 
                                            name="auth_workflow.login_url"
                                            type="url"
                                            value={formData.auth_workflow.login_url}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Username Selector
                                            </label>
                                            <input 
                                                name="auth_workflow.username_selector"
                                                type="text"
                                                value={formData.auth_workflow.username_selector}
                                                onChange={handleInputChange}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Password Selector
                                            </label>
                                            <input 
                                                name="auth_workflow.password_selector"
                                                type="text"
                                                value={formData.auth_workflow.password_selector}
                                                onChange={handleInputChange}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </fieldset>
                    )}

                    {error && (
                        <div className="text-red-600 text-sm">{error}</div>
                    )}

                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={loading || !selectedProject}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400"
                        >
                            {loading ? 'Creating...' : 'Create Crawler'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateCrawlerModal; 