/**
 * VPATGenerator Component
 * 
 * Provides interface for generating VPAT (Voluntary Product Accessibility Template) reports
 * from accessibility testing session data.
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAlpineState } from '../utils/alpineIntegration';

const VPATGenerator = ({ 
  sessionId = null,
  onGenerate = () => {},
  onError = () => {},
  className = ''
}) => {
  // Alpine.js state integration
  const [alpineState, updateAlpineState] = useAlpineState();

  // Local state
  const [selectedSession, setSelectedSession] = useState(sessionId);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [vpatConfig, setVpatConfig] = useState({
    format: 'html',
    includeEvidence: true,
    organizationName: '',
    productName: '',
    productVersion: '1.0',
    evaluationDate: new Date().toISOString().split('T')[0],
    contactInfo: '',
    notes: '',
    conformanceLevel: 'AA'
  });

  // Load available sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  // Update session if passed as prop
  useEffect(() => {
    if (sessionId && sessionId !== selectedSession) {
      setSelectedSession(sessionId);
      loadSessionDetails(sessionId);
    }
  }, [sessionId]);

  /**
   * Load available testing sessions
   */
  const loadSessions = async () => {
    setLoading(true);
    try {
      const response = await window.DashboardAPI.getTestingSessions();
      if (response.success) {
        setSessions(response.data || []);
        
        // Auto-select current session if available
        if (alpineState.selectedTestSession && !selectedSession) {
          setSelectedSession(alpineState.selectedTestSession.id);
          loadSessionDetails(alpineState.selectedTestSession.id);
        }
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      onError('Failed to load testing sessions');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load session details and pre-populate configuration
   */
  const loadSessionDetails = async (sessionId) => {
    if (!sessionId) return;

    try {
      const response = await window.DashboardAPI.getTestingSession(sessionId);
      if (response.success && response.data) {
        const session = response.data;
        setVpatConfig(prev => ({
          ...prev,
          productName: session.name || prev.productName,
          organizationName: session.project_name || prev.organizationName,
          evaluationDate: session.created_at ? 
            new Date(session.created_at).toISOString().split('T')[0] : 
            prev.evaluationDate
        }));
      }
    } catch (error) {
      console.error('Error loading session details:', error);
    }
  };

  /**
   * Generate VPAT report
   */
  const generateVPATReport = async () => {
    if (!selectedSession) {
      onError('Please select a testing session');
      return;
    }

    if (!vpatConfig.organizationName.trim()) {
      onError('Organization name is required');
      return;
    }

    if (!vpatConfig.productName.trim()) {
      onError('Product name is required');
      return;
    }

    setGenerating(true);
    try {
      console.log('📋 Generating VPAT report for session:', selectedSession);

      // Build query parameters
      const params = new URLSearchParams({
        format: vpatConfig.format,
        include_evidence: vpatConfig.includeEvidence.toString(),
        organization_name: vpatConfig.organizationName,
        product_name: vpatConfig.productName,
        product_version: vpatConfig.productVersion,
        evaluation_date: vpatConfig.evaluationDate,
        conformance_level: vpatConfig.conformanceLevel,
        contact_info: vpatConfig.contactInfo,
        notes: vpatConfig.notes
      });

      // Call VPAT generation API
      const response = await fetch(`${window.DashboardAPI.apiBaseUrl}/testing-sessions/${selectedSession}/vpat?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${window.DashboardAPI.getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle download based on format
      let content, mimeType, fileExtension;
      
      if (vpatConfig.format === 'html') {
        content = await response.text();
        mimeType = 'text/html';
        fileExtension = 'html';
      } else if (vpatConfig.format === 'json') {
        content = await response.text();
        mimeType = 'application/json';
        fileExtension = 'json';
      } else {
        // Default to HTML
        content = await response.text();
        mimeType = 'text/html';
        fileExtension = 'html';
      }

      // Create and trigger download
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `VPAT-${vpatConfig.productName.replace(/\s+/g, '-')}-${vpatConfig.evaluationDate}.${fileExtension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Success callback
      onGenerate({
        sessionId: selectedSession,
        config: vpatConfig,
        filename: a.download
      });

      console.log('✅ VPAT report generated and downloaded successfully');

    } catch (error) {
      console.error('Error generating VPAT report:', error);
      onError(`VPAT generation failed: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  /**
   * Handle session selection change
   */
  const handleSessionChange = (e) => {
    const sessionId = e.target.value;
    setSelectedSession(sessionId);
    if (sessionId) {
      loadSessionDetails(sessionId);
    }
  };

  /**
   * Handle configuration field changes
   */
  const handleConfigChange = (field, value) => {
    setVpatConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  /**
   * Reset form to defaults
   */
  const resetForm = () => {
    setVpatConfig({
      format: 'html',
      includeEvidence: true,
      organizationName: '',
      productName: '',
      productVersion: '1.0',
      evaluationDate: new Date().toISOString().split('T')[0],
      contactInfo: '',
      notes: '',
      conformanceLevel: 'AA'
    });
    setSelectedSession(null);
  };

  const selectedSessionData = sessions.find(s => s.id === selectedSession);

  return (
    <div className={`vpat-generator bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">VPAT Report Generator</h3>
            <p className="text-sm text-gray-600 mt-1">
              Generate Voluntary Product Accessibility Template reports from testing sessions
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={resetForm}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              disabled={generating}
            >
              Reset
            </button>
            <button
              onClick={generateVPATReport}
              disabled={!selectedSession || generating || !vpatConfig.organizationName.trim() || !vpatConfig.productName.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {generating ? (
                <>
                  <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Generate VPAT</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <svg className="animate-spin h-6 w-6 text-blue-600 mr-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-gray-600">Loading sessions...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Session Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Testing Session <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedSession || ''}
                onChange={handleSessionChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={generating}
              >
                <option value="">Select a testing session...</option>
                {sessions.map(session => (
                  <option key={session.id} value={session.id}>
                    {session.name} - {session.project_name} ({new Date(session.created_at).toLocaleDateString()})
                  </option>
                ))}
              </select>
              {selectedSessionData && (
                <div className="mt-2 p-3 bg-blue-50 rounded-md">
                  <div className="text-sm text-blue-800">
                    <strong>Selected:</strong> {selectedSessionData.name}
                    {selectedSessionData.description && (
                      <div className="mt-1">{selectedSessionData.description}</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Configuration Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Organization Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={vpatConfig.organizationName}
                  onChange={(e) => handleConfigChange('organizationName', e.target.value)}
                  placeholder="Your organization name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={generating}
                />
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={vpatConfig.productName}
                  onChange={(e) => handleConfigChange('productName', e.target.value)}
                  placeholder="Product or website name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={generating}
                />
              </div>

              {/* Product Version */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Version
                </label>
                <input
                  type="text"
                  value={vpatConfig.productVersion}
                  onChange={(e) => handleConfigChange('productVersion', e.target.value)}
                  placeholder="1.0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={generating}
                />
              </div>

              {/* Evaluation Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Evaluation Date
                </label>
                <input
                  type="date"
                  value={vpatConfig.evaluationDate}
                  onChange={(e) => handleConfigChange('evaluationDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={generating}
                />
              </div>

              {/* Conformance Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conformance Level
                </label>
                <select
                  value={vpatConfig.conformanceLevel}
                  onChange={(e) => handleConfigChange('conformanceLevel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={generating}
                >
                  <option value="A">Level A</option>
                  <option value="AA">Level AA</option>
                  <option value="AAA">Level AAA</option>
                </select>
              </div>

              {/* Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Output Format
                </label>
                <select
                  value={vpatConfig.format}
                  onChange={(e) => handleConfigChange('format', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={generating}
                >
                  <option value="html">HTML Report</option>
                  <option value="json">JSON Data</option>
                </select>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Information
              </label>
              <input
                type="text"
                value={vpatConfig.contactInfo}
                onChange={(e) => handleConfigChange('contactInfo', e.target.value)}
                placeholder="Contact email or person responsible"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={generating}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                value={vpatConfig.notes}
                onChange={(e) => handleConfigChange('notes', e.target.value)}
                placeholder="Any additional notes or context for the VPAT report..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={generating}
              />
            </div>

            {/* Options */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={vpatConfig.includeEvidence}
                  onChange={(e) => handleConfigChange('includeEvidence', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={generating}
                />
                <span className="ml-2 text-sm text-gray-700">
                  Include evidence and detailed findings in the report
                </span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

VPATGenerator.propTypes = {
  sessionId: PropTypes.string,
  onGenerate: PropTypes.func,
  onError: PropTypes.func,
  className: PropTypes.string
};

export default VPATGenerator; 