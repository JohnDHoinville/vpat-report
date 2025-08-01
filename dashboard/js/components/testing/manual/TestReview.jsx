import React, { useState, useEffect } from 'react';
import { useAlpineState } from '../../utils/alpineIntegration.js';

/**
 * TestReview Component
 * 
 * Modal component for conducting individual manual accessibility tests.
 * Replaces the manual testing modal from dashboard/components/testing-modals.html
 */
const TestReview = () => {
  // Get manual testing state from Alpine.js bridge
  const [showManualTestingModal] = useAlpineState('showManualTestingModal', false);
  const [currentManualTest] = useAlpineState('currentManualTest', null);
  const [manualTestingProcedure] = useAlpineState('manualTestingProcedure', null);
  const [manualTestingContext] = useAlpineState('manualTestingContext', null);
  const [loading] = useAlpineState('loading', false);

  // Local state for the test result form
  const [formData, setFormData] = useState({
    testResult: '',
    confidenceLevel: 'medium',
    testNotes: '',
    testEvidence: {
      screenshot: '',
      element_selector: ''
    }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal closes or test changes
  useEffect(() => {
    if (!showManualTestingModal || !currentManualTest) {
      setFormData({
        testResult: '',
        confidenceLevel: 'medium',
        testNotes: '',
        testEvidence: {
          screenshot: '',
          element_selector: ''
        }
      });
    }
  }, [showManualTestingModal, currentManualTest]);

  // Handle form field changes
  const handleFormChange = (field, value) => {
    if (field.startsWith('testEvidence.')) {
      const evidenceField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        testEvidence: {
          ...prev.testEvidence,
          [evidenceField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.testResult) {
      alert('Please select a test result before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Call Alpine.js function to submit manual test result
      if (window.dashboardInstance && window.dashboardInstance.submitManualTestResult) {
        await window.dashboardInstance.submitManualTestResult(
          formData.testResult,
          formData.confidenceLevel,
          formData.testNotes,
          formData.testEvidence
        );
      }
    } catch (error) {
      console.error('Error submitting manual test result:', error);
      alert('Failed to submit test result. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle closing the modal
  const handleCloseModal = () => {
    if (window.alpineReactBridge) {
      window.alpineReactBridge.setState('showManualTestingModal', false);
    }
  };

  // Get result option styling
  const getResultOptionClass = (value) => {
    switch (value) {
      case 'passed':
        return 'text-green-700';
      case 'failed':
        return 'text-red-700';
      case 'not_applicable':
        return 'text-gray-700';
      case 'needs_review':
        return 'text-yellow-700';
      default:
        return 'text-gray-700';
    }
  };

  // Don't render if modal is not shown
  if (!showManualTestingModal) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && handleCloseModal()}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Manual Test: {currentManualTest?.assignment?.criterion_number || 'Unknown'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {manualTestingProcedure?.title || 'Loading test procedure...'}
              </p>
            </div>
            <button
              onClick={handleCloseModal}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>

        {manualTestingProcedure ? (
          <div className="p-6">
            {/* Test Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-blue-900 mb-2">Test Requirements</h4>
              <p className="text-sm text-blue-800 mb-3">
                {manualTestingProcedure.description || ''}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <strong>WCAG Level:</strong>{' '}
                  <span>{manualTestingProcedure.level || 'AA'}</span>
                </div>
                <div>
                  <strong>Type:</strong>
                  <span>{manualTestingProcedure.requirement_type || 'WCAG'}</span>
                </div>
                <div>
                  <strong>Page:</strong>
                  <span>{currentManualTest?.pageGroup?.page_title || 'Unknown'}</span>
                </div>
                <div>
                  <strong>URL:</strong>
                  <a
                    href={currentManualTest?.pageGroup?.page_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-xs"
                  >
                    {currentManualTest?.pageGroup?.page_url || ''}
                  </a>
                </div>
              </div>
            </div>

            {/* Testing Procedure */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Testing Procedure</h4>
              <div className="bg-gray-50 border rounded-lg p-4">
                {manualTestingProcedure.manual_test_procedure ? (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: manualTestingProcedure.manual_test_procedure
                    }}
                  />
                ) : (
                  <div className="text-gray-500 italic">
                    No specific testing procedure available. Follow general accessibility testing guidelines.
                  </div>
                )}
              </div>
            </div>

            {/* Test Context (Related Automated Findings) */}
            {manualTestingContext?.violations?.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Related Automated Findings</h4>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 mb-3">
                    Automated testing found potential issues in this area. Please verify manually:
                  </p>
                  <div className="space-y-2">
                    {manualTestingContext.violations.map((violation, index) => (
                      <div key={violation.id || index} className="text-sm">
                        <strong>{violation.description}</strong>
                        <p className="text-gray-600">{violation.help_text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Test Result Form */}
            <div className="border-t pt-6">
              <h4 className="font-semibold text-gray-900 mb-4">Test Result</h4>
              <form onSubmit={handleSubmit}>
                {/* Result Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test Result
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="passed"
                        checked={formData.testResult === 'passed'}
                        onChange={(e) => handleFormChange('testResult', e.target.value)}
                        className="text-green-600 focus:ring-green-500 mr-2"
                      />
                      <span className={getResultOptionClass('passed')}>
                        ✅ Passed - No accessibility issues found
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="failed"
                        checked={formData.testResult === 'failed'}
                        onChange={(e) => handleFormChange('testResult', e.target.value)}
                        className="text-red-600 focus:ring-red-500 mr-2"
                      />
                      <span className={getResultOptionClass('failed')}>
                        ❌ Failed - Accessibility issues found
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="not_applicable"
                        checked={formData.testResult === 'not_applicable'}
                        onChange={(e) => handleFormChange('testResult', e.target.value)}
                        className="text-gray-600 focus:ring-gray-500 mr-2"
                      />
                      <span className={getResultOptionClass('not_applicable')}>
                        ➖ Not Applicable - Criterion does not apply to this page
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="needs_review"
                        checked={formData.testResult === 'needs_review'}
                        onChange={(e) => handleFormChange('testResult', e.target.value)}
                        className="text-yellow-600 focus:ring-yellow-500 mr-2"
                      />
                      <span className={getResultOptionClass('needs_review')}>
                        ⚠️ Needs Review - Uncertain or requires expert evaluation
                      </span>
                    </label>
                  </div>
                </div>

                {/* Confidence Level */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confidence Level
                  </label>
                  <select
                    value={formData.confidenceLevel}
                    onChange={(e) => handleFormChange('confidenceLevel', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="high">High - Very confident in the result</option>
                    <option value="medium">Medium - Reasonably confident</option>
                    <option value="low">Low - Uncertain, may need further review</option>
                  </select>
                </div>

                {/* Notes */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes & Observations
                  </label>
                  <textarea
                    value={formData.testNotes}
                    onChange={(e) => handleFormChange('testNotes', e.target.value)}
                    rows="4"
                    placeholder="Describe what you tested, any issues found, steps taken, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Evidence */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Evidence (Optional)
                  </label>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Screenshot URL or Description
                      </label>
                      <input
                        type="text"
                        value={formData.testEvidence.screenshot}
                        onChange={(e) => handleFormChange('testEvidence.screenshot', e.target.value)}
                        placeholder="URL to screenshot or description of visual evidence"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Element Selector (if applicable)
                      </label>
                      <input
                        type="text"
                        value={formData.testEvidence.element_selector}
                        onChange={(e) => handleFormChange('testEvidence.element_selector', e.target.value)}
                        placeholder="CSS selector for the problematic element"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!formData.testResult || isSubmitting || loading}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-purple-400"
                  >
                    {isSubmitting || loading ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Saving...
                      </>
                    ) : (
                      'Save Test Result'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* Loading State */
          <div className="p-6">
            <div className="text-center py-8">
              <i className="fas fa-spinner fa-spin text-gray-400 text-3xl mb-4"></i>
              <p className="text-gray-600">Loading test procedure...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestReview; 