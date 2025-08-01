import React from 'react';

const SessionManagement = ({ 
    sessionInfo = {}, 
    onCaptureSession, 
    onUpdateSessionStatus,
    sessionCapturing = false,
    sessionAwaitingLogin = false,
    loading = false 
}) => {
    const getSessionStatusColor = () => {
        if (sessionInfo.isVeryOld) return 'border-red-200 bg-red-50';
        if (sessionInfo.isOld) return 'border-yellow-200 bg-yellow-50';
        if (sessionInfo.isValid) return 'border-green-200 bg-green-50';
        return 'border-gray-200 bg-gray-50';
    };

    const getSessionStatusIcon = () => {
        if (sessionInfo.isVeryOld) return 'bg-red-500';
        if (sessionInfo.isOld) return 'bg-yellow-500';
        if (sessionInfo.isValid) return 'bg-green-500';
        return 'bg-gray-400';
    };

    const getSessionStatusText = () => {
        if (sessionInfo.isVeryOld) return { status: 'Expired', description: 'Session is very old and likely invalid' };
        if (sessionInfo.isOld) return { status: 'Aging', description: 'Session is getting old, consider refreshing' };
        if (sessionInfo.isValid) return { status: 'Active', description: 'Session is valid and ready for crawling' };
        return { status: 'Unknown', description: 'No session information available' };
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleString();
    };

    const statusInfo = getSessionStatusText();

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                <i className="fas fa-cookie-bite mr-2"></i>
                Browser Session Management
            </h3>
            
            <p className="text-sm text-gray-600 mb-4">
                SAML authentication requires an active browser session for crawling authenticated pages
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Session Status */}
                <div className="space-y-4">
                    <div className={`flex items-center justify-between p-4 border rounded-lg ${getSessionStatusColor()}`}>
                        <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${getSessionStatusIcon()}`}></div>
                            <div>
                                <div className="font-medium text-gray-900">{statusInfo.status}</div>
                                <div className="text-sm text-gray-600">{statusInfo.description}</div>
                            </div>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                            <div>Pages: {sessionInfo.pagesCount || 0}</div>
                            <div>Cookies: {sessionInfo.cookies || 0}</div>
                        </div>
                    </div>

                    {/* Session Details */}
                    {sessionInfo.sessionId && (
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Session ID:</span>
                                <span className="font-mono text-xs text-gray-800">
                                    {sessionInfo.sessionId.substring(0, 8)}...
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Crawler:</span>
                                <span className="text-gray-800">{sessionInfo.crawlerName || 'Unknown'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">User:</span>
                                <span className="text-gray-800">{sessionInfo.username || 'Unknown'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Captured:</span>
                                <span className="text-gray-800">{formatDate(sessionInfo.capturedDate)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Expires:</span>
                                <span className="text-gray-800">{formatDate(sessionInfo.expirationDate)}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Session Actions */}
                <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-3">Session Actions</h4>
                        
                        <div className="space-y-3">
                            {/* Capture Session Button */}
                            <button
                                onClick={onCaptureSession}
                                disabled={sessionCapturing || loading}
                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                            >
                                {sessionCapturing ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin mr-2"></i>
                                        Capturing Session...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-download mr-2"></i>
                                        {sessionInfo.isValid ? 'Refresh Session' : 'Capture Session'}
                                    </>
                                )}
                            </button>

                            {/* Awaiting Login State */}
                            {sessionAwaitingLogin && (
                                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                    <div className="flex items-center">
                                        <i className="fas fa-clock text-yellow-600 mr-2"></i>
                                        <div>
                                            <div className="text-sm font-medium text-yellow-800">
                                                Waiting for Login
                                            </div>
                                            <div className="text-sm text-yellow-700">
                                                Please complete authentication in the opened browser window
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Update Status Button */}
                            <button
                                onClick={onUpdateSessionStatus}
                                disabled={loading}
                                className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 transition-colors"
                            >
                                {loading ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin mr-2"></i>
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-sync mr-2"></i>
                                        Update Status
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Session Tips */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h5 className="font-medium text-blue-900 mb-2">
                            <i className="fas fa-info-circle mr-1"></i>
                            Session Tips
                        </h5>
                        <ul className="text-sm text-blue-800 space-y-1">
                            <li>• Sessions capture authentication cookies</li>
                            <li>• Valid sessions enable authenticated crawling</li>
                            <li>• Refresh sessions before they expire</li>
                            <li>• Use SAML authentication when available</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SessionManagement; 