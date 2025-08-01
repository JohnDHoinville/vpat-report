import React, { useState, useEffect } from 'react';
import CreateCrawlerModal from './CreateCrawlerModal.jsx';
import CrawlerList from './CrawlerList.jsx';
import SessionManagement from './SessionManagement.jsx';

const WebCrawlerInterface = ({ alpineData }) => {
    const [state, setState] = useState({
        showCreateCrawler: false,
        webCrawlers: [],
        crawlerInProgress: false,
        sessionCapturing: false,
        sessionAwaitingLogin: false,
        sessionInfo: {},
        selectedProject: null,
        loading: false,
        error: null
    });

    // Sync with Alpine.js state
    useEffect(() => {
        if (alpineData) {
            setState(prev => ({
                ...prev,
                showCreateCrawler: alpineData.showCreateCrawler || false,
                webCrawlers: alpineData.webCrawlers || [],
                crawlerInProgress: alpineData.crawlerInProgress || false,
                sessionCapturing: alpineData.sessionCapturing || false,
                sessionAwaitingLogin: alpineData.sessionAwaitingLogin || false,
                sessionInfo: alpineData.sessionInfo || {},
                selectedProject: alpineData.selectedProject || null,
                loading: alpineData.loading || false
            }));
        }
    }, [alpineData]);

    // Create crawler handler
    const handleCreateCrawler = async (crawlerData) => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        
        try {
            const response = await window.DashboardAPI.webCrawlers.create(crawlerData);
            
            // Update Alpine.js state through the dashboard instance
            if (window.dashboard && typeof window.dashboard === 'function') {
                const dashboardInstance = window.dashboard();
                
                // Close modal and refresh crawler list
                dashboardInstance.showCreateCrawler = false;
                dashboardInstance.ui.modals.showCreateCrawler = false;
                
                // Show success notification
                dashboardInstance.showNotification('success', 'Success', `Crawler "${crawlerData.name}" created successfully`);
                
                // Refresh crawler list
                dashboardInstance.loadWebCrawlers();
            }
            
            setState(prev => ({ 
                ...prev, 
                loading: false, 
                showCreateCrawler: false 
            }));
            
        } catch (error) {
            setState(prev => ({ 
                ...prev, 
                loading: false, 
                error: error.message || 'Failed to create crawler' 
            }));
            
            // Show error notification through Alpine.js
            if (window.dashboard && typeof window.dashboard === 'function') {
                const dashboardInstance = window.dashboard();
                dashboardInstance.showNotification('error', 'Error', error.message || 'Failed to create crawler');
            }
        }
    };

    // Start crawler handler
    const handleStartCrawler = async (crawlerId) => {
        setState(prev => ({ ...prev, loading: true }));
        
        try {
            await window.DashboardAPI.webCrawlers.start(crawlerId);
            
            // Update Alpine.js state
            if (window.dashboard && typeof window.dashboard === 'function') {
                const dashboardInstance = window.dashboard();
                dashboardInstance.crawlerInProgress = true;
                dashboardInstance.showNotification('success', 'Success', 'Crawler started successfully');
                dashboardInstance.loadWebCrawlers();
            }
            
            setState(prev => ({ ...prev, loading: false, crawlerInProgress: true }));
            
        } catch (error) {
            setState(prev => ({ ...prev, loading: false }));
            
            if (window.dashboard && typeof window.dashboard === 'function') {
                const dashboardInstance = window.dashboard();
                dashboardInstance.showNotification('error', 'Error', error.message || 'Failed to start crawler');
            }
        }
    };

    // Stop crawler handler
    const handleStopCrawler = async (crawlerId) => {
        setState(prev => ({ ...prev, loading: true }));
        
        try {
            await window.DashboardAPI.webCrawlers.stop(crawlerId);
            
            // Update Alpine.js state
            if (window.dashboard && typeof window.dashboard === 'function') {
                const dashboardInstance = window.dashboard();
                dashboardInstance.crawlerInProgress = false;
                dashboardInstance.showNotification('success', 'Success', 'Crawler stopped successfully');
                dashboardInstance.loadWebCrawlers();
            }
            
            setState(prev => ({ ...prev, loading: false, crawlerInProgress: false }));
            
        } catch (error) {
            setState(prev => ({ ...prev, loading: false }));
            
            if (window.dashboard && typeof window.dashboard === 'function') {
                const dashboardInstance = window.dashboard();
                dashboardInstance.showNotification('error', 'Error', error.message || 'Failed to stop crawler');
            }
        }
    };

    // Delete crawler handler
    const handleDeleteCrawler = async (crawlerId) => {
        if (!confirm('Are you sure you want to delete this crawler? This action cannot be undone.')) {
            return;
        }
        
        setState(prev => ({ ...prev, loading: true }));
        
        try {
            await window.DashboardAPI.webCrawlers.delete(crawlerId);
            
            // Update Alpine.js state
            if (window.dashboard && typeof window.dashboard === 'function') {
                const dashboardInstance = window.dashboard();
                dashboardInstance.showNotification('success', 'Success', 'Crawler deleted successfully');
                dashboardInstance.loadWebCrawlers();
            }
            
            setState(prev => ({ ...prev, loading: false }));
            
        } catch (error) {
            setState(prev => ({ ...prev, loading: false }));
            
            if (window.dashboard && typeof window.dashboard === 'function') {
                const dashboardInstance = window.dashboard();
                dashboardInstance.showNotification('error', 'Error', error.message || 'Failed to delete crawler');
            }
        }
    };

    // View pages handler
    const handleViewPages = async (crawlerId) => {
        try {
            if (window.dashboard && typeof window.dashboard === 'function') {
                const dashboardInstance = window.dashboard();
                dashboardInstance.showCrawlerPagesModal = true;
                dashboardInstance.selectedCrawlerId = crawlerId;
                dashboardInstance.ui.modals.showCrawlerPagesModal = true;
            }
        } catch (error) {
            console.error('Failed to show crawler pages:', error);
        }
    };

    // Capture session handler
    const handleCaptureSession = async () => {
        setState(prev => ({ ...prev, sessionCapturing: true }));
        
        try {
            if (window.dashboard && typeof window.dashboard === 'function') {
                const dashboardInstance = window.dashboard();
                await dashboardInstance.captureSession();
            }
            
            setState(prev => ({ ...prev, sessionCapturing: false }));
            
        } catch (error) {
            setState(prev => ({ ...prev, sessionCapturing: false }));
            
            if (window.dashboard && typeof window.dashboard === 'function') {
                const dashboardInstance = window.dashboard();
                dashboardInstance.showNotification('error', 'Error', error.message || 'Failed to capture session');
            }
        }
    };

    // Update session status handler
    const handleUpdateSessionStatus = async () => {
        setState(prev => ({ ...prev, loading: true }));
        
        try {
            if (window.dashboard && typeof window.dashboard === 'function') {
                const dashboardInstance = window.dashboard();
                await dashboardInstance.updateSessionStatus();
                dashboardInstance.showNotification('success', 'Success', 'Session status updated');
            }
            
            setState(prev => ({ ...prev, loading: false }));
            
        } catch (error) {
            setState(prev => ({ ...prev, loading: false }));
            
            if (window.dashboard && typeof window.dashboard === 'function') {
                const dashboardInstance = window.dashboard();
                dashboardInstance.showNotification('error', 'Error', error.message || 'Failed to update session status');
            }
        }
    };

    // Close create crawler modal
    const handleCloseCreateCrawler = () => {
        if (window.dashboard && typeof window.dashboard === 'function') {
            const dashboardInstance = window.dashboard();
            dashboardInstance.showCreateCrawler = false;
            dashboardInstance.ui.modals.showCreateCrawler = false;
        }
        setState(prev => ({ ...prev, showCreateCrawler: false, error: null }));
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                            Web Crawler Sessions for{' '}
                            <span className="text-blue-600">
                                {state.selectedProject?.name || 'Project'}
                            </span>{' '}
                            ({state.webCrawlers.length} Testing)
                        </h2>
                        <p className="mt-2 text-gray-600">
                            Advanced Playwright-based crawling with SAML authentication support
                        </p>
                    </div>
                    <div className="flex items-center space-x-4">
                        {/* WebSocket Status Indicator */}
                        <div className="flex items-center space-x-2 text-sm">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="text-green-700">Live updates</span>
                        </div>
                        
                        <button
                            onClick={() => setState(prev => ({ ...prev, showCreateCrawler: true }))}
                            disabled={!state.selectedProject}
                            className={`px-4 py-2 text-white rounded-lg font-medium transition-colors ${
                                !state.selectedProject 
                                    ? 'bg-gray-400 cursor-not-allowed' 
                                    : 'bg-green-600 hover:bg-green-700'
                            }`}
                        >
                            <i className="fas fa-plus mr-2"></i>
                            New Crawler
                        </button>
                    </div>
                </div>
            </div>

            {/* Session Management */}
            <SessionManagement
                sessionInfo={state.sessionInfo}
                onCaptureSession={handleCaptureSession}
                onUpdateSessionStatus={handleUpdateSessionStatus}
                sessionCapturing={state.sessionCapturing}
                sessionAwaitingLogin={state.sessionAwaitingLogin}
                loading={state.loading}
            />

            {/* Crawler List */}
            <CrawlerList
                crawlers={state.webCrawlers}
                onStartCrawler={handleStartCrawler}
                onStopCrawler={handleStopCrawler}
                onDeleteCrawler={handleDeleteCrawler}
                onViewPages={handleViewPages}
                crawlerInProgress={state.crawlerInProgress}
                loading={state.loading}
            />

            {/* Create Crawler Modal */}
            <CreateCrawlerModal
                isOpen={state.showCreateCrawler}
                onClose={handleCloseCreateCrawler}
                onCreateCrawler={handleCreateCrawler}
                selectedProject={state.selectedProject}
                loading={state.loading}
                error={state.error}
            />
        </div>
    );
};

export default WebCrawlerInterface; 