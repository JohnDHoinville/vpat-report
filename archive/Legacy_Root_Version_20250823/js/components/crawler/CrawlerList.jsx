import React from 'react';

const CrawlerList = ({ 
    crawlers = [], 
    onStartCrawler, 
    onStopCrawler, 
    onDeleteCrawler,
    onViewPages,
    crawlerInProgress = false,
    loading = false 
}) => {
    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleDateString();
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'running':
                return <i className="fas fa-spinner fa-spin text-blue-600"></i>;
            case 'completed':
                return <i className="fas fa-check-circle text-green-600"></i>;
            case 'failed':
                return <i className="fas fa-exclamation-circle text-red-600"></i>;
            case 'stopped':
                return <i className="fas fa-stop-circle text-yellow-600"></i>;
            default:
                return <i className="fas fa-circle text-gray-400"></i>;
        }
    };

    const getStatusBadge = (status) => {
        const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full";
        switch (status) {
            case 'running':
                return `${baseClasses} bg-blue-100 text-blue-800`;
            case 'completed':
                return `${baseClasses} bg-green-100 text-green-800`;
            case 'failed':
                return `${baseClasses} bg-red-100 text-red-800`;
            case 'stopped':
                return `${baseClasses} bg-yellow-100 text-yellow-800`;
            default:
                return `${baseClasses} bg-gray-100 text-gray-800`;
        }
    };

    const getBrowserIcon = (browserType) => {
        switch (browserType) {
            case 'chromium':
                return <i className="fab fa-chrome text-blue-600"></i>;
            case 'firefox':
                return <i className="fab fa-firefox text-orange-600"></i>;
            case 'webkit':
                return <i className="fab fa-safari text-blue-400"></i>;
            default:
                return <i className="fas fa-globe text-gray-600"></i>;
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="animate-pulse space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                            <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            </div>
                            <div className="w-20 h-6 bg-gray-200 rounded"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (crawlers.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center py-12">
                    <i className="fas fa-spider text-4xl text-gray-400 mb-4"></i>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No web crawlers yet</h3>
                    <p className="text-gray-600 mb-6">
                        Create your first crawler to start discovering pages for accessibility testing
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Web Crawlers ({crawlers.length})
                    </h3>
                    <div className="text-sm text-gray-500">
                        {crawlers.filter(c => c.status === 'completed').length} completed
                    </div>
                </div>
            </div>
            
            <div className="divide-y divide-gray-200">
                {crawlers.map((crawler) => (
                    <div key={crawler.id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="flex-shrink-0">
                                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                        {getBrowserIcon(crawler.browser_type)}
                                    </div>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-3">
                                        <h4 className="text-lg font-medium text-gray-900 truncate">
                                            {crawler.name}
                                        </h4>
                                        <span className={getStatusBadge(crawler.status)}>
                                            {crawler.status}
                                        </span>
                                    </div>
                                    
                                    <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                                        <span className="flex items-center">
                                            <i className="fas fa-link mr-1"></i>
                                            {crawler.base_url}
                                        </span>
                                        <span className="flex items-center">
                                            <i className="fas fa-file-alt mr-1"></i>
                                            {crawler.pages_found || 0} pages
                                        </span>
                                        <span className="flex items-center">
                                            <i className="fas fa-calendar mr-1"></i>
                                            {formatDate(crawler.created_at)}
                                        </span>
                                    </div>

                                    {crawler.auth_type && crawler.auth_type !== 'none' && (
                                        <div className="mt-2 flex items-center text-sm text-blue-600">
                                            <i className="fas fa-shield-alt mr-1"></i>
                                            Authentication: {crawler.auth_type.toUpperCase()}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                                {/* Status Icon */}
                                <div className="flex items-center justify-center w-8 h-8">
                                    {getStatusIcon(crawler.status)}
                                </div>
                                
                                {/* Action Buttons */}
                                <div className="flex items-center space-x-2">
                                    {crawler.status === 'completed' && (
                                        <button
                                            onClick={() => onViewPages(crawler.id)}
                                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                            title="View discovered pages"
                                        >
                                            <i className="fas fa-eye mr-1"></i>
                                            View Pages
                                        </button>
                                    )}
                                    
                                    {crawler.status === 'idle' && (
                                        <button
                                            onClick={() => onStartCrawler(crawler.id)}
                                            disabled={crawlerInProgress}
                                            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                                            title="Start crawler"
                                        >
                                            <i className="fas fa-play mr-1"></i>
                                            Start
                                        </button>
                                    )}
                                    
                                    {crawler.status === 'running' && (
                                        <button
                                            onClick={() => onStopCrawler(crawler.id)}
                                            className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
                                            title="Stop crawler"
                                        >
                                            <i className="fas fa-stop mr-1"></i>
                                            Stop
                                        </button>
                                    )}
                                    
                                    {['idle', 'completed', 'failed', 'stopped'].includes(crawler.status) && (
                                        <button
                                            onClick={() => onDeleteCrawler(crawler.id)}
                                            disabled={crawlerInProgress}
                                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 transition-colors"
                                            title="Delete crawler"
                                        >
                                            <i className="fas fa-trash mr-1"></i>
                                            Delete
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {/* Progress Bar for Running Crawlers */}
                        {crawler.status === 'running' && crawler.progress && (
                            <div className="mt-4">
                                <div className="flex justify-between items-center text-sm text-gray-600 mb-1">
                                    <span>{crawler.progress.message || 'Crawling in progress...'}</span>
                                    <span>{crawler.progress.percentage || 0}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${crawler.progress.percentage || 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CrawlerList; 