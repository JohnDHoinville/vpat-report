import React, { useState, useEffect } from 'react';

/**
 * Test React Component for Alpine.js Integration
 * 
 * This component demonstrates:
 * - React component rendering within Alpine.js contexts
 * - State bridge communication
 * - Props passing from Alpine to React
 * - Component lifecycle integration
 */
const TestComponent = ({ 
  message = 'Hello from React!', 
  bridgeId,
  bridge,
  getState,
  setState,
  subscribe,
  onMount,
  onUnmount,
  alpineData = {}
}) => {
  const [counter, setCounter] = useState(0);
  const [bridgeMessage, setBridgeMessage] = useState('');
  const [alpineValue, setAlpineValue] = useState(alpineData.testValue || '');

  useEffect(() => {
    console.log(`🎯 React TestComponent mounted with ID: ${bridgeId}`);
    
    // Call mount callback
    if (onMount) {
      onMount(bridgeId, { message, counter });
    }

    // Subscribe to bridge state changes
    const unsubscribe = subscribe('testMessage', (newValue) => {
      setBridgeMessage(newValue);
      console.log('📨 React received bridge message:', newValue);
    });

    // Subscribe to Alpine data changes
    const unsubscribeAlpine = subscribe('alpineTestValue', (newValue) => {
      setAlpineValue(newValue);
      console.log('🔄 React received Alpine value:', newValue);
    });

    // Cleanup on unmount
    return () => {
      console.log(`🧹 React TestComponent unmounting: ${bridgeId}`);
      unsubscribe();
      unsubscribeAlpine();
      
      if (onUnmount) {
        onUnmount(bridgeId, { message, counter });
      }
    };
  }, [bridgeId, onMount, onUnmount, subscribe]);

  const handleCounterIncrement = () => {
    const newCounter = counter + 1;
    setCounter(newCounter);
    
    // Update bridge state to notify Alpine
    setState('reactCounter', newCounter);
    console.log('📊 React updated counter in bridge:', newCounter);
  };

  const sendMessageToBridge = () => {
    const message = `Hello from React component ${bridgeId} at ${new Date().toLocaleTimeString()}`;
    setState('reactMessage', message);
    console.log('📤 React sent message to bridge:', message);
  };

  const requestAlpineData = () => {
    setState('reactRequest', {
      type: 'getData',
      component: bridgeId,
      timestamp: Date.now()
    });
  };

  return (
    <div className="react-test-component p-4 border border-blue-300 rounded-lg bg-blue-50 m-2">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">
          🔧 React Test Component
        </h3>
        <p className="text-sm text-blue-600 mb-1">Bridge ID: {bridgeId}</p>
        <p className="text-sm text-blue-600">Message: {message}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Counter Section */}
        <div className="space-y-2">
          <h4 className="font-medium text-blue-700">React State</h4>
          <div className="flex items-center space-x-2">
            <span className="text-sm">Counter: {counter}</span>
            <button
              onClick={handleCounterIncrement}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
            >
              +1
            </button>
          </div>
        </div>

        {/* Bridge Communication */}
        <div className="space-y-2">
          <h4 className="font-medium text-blue-700">Bridge Communication</h4>
          <button
            onClick={sendMessageToBridge}
            className="block w-full px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors"
          >
            Send to Alpine
          </button>
          {bridgeMessage && (
            <div className="text-xs bg-green-100 p-2 rounded border">
              <strong>From Bridge:</strong> {bridgeMessage}
            </div>
          )}
        </div>

        {/* Alpine Integration */}
        <div className="space-y-2">
          <h4 className="font-medium text-blue-700">Alpine Integration</h4>
          <button
            onClick={requestAlpineData}
            className="block w-full px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 transition-colors"
          >
            Request Alpine Data
          </button>
          {alpineValue && (
            <div className="text-xs bg-purple-100 p-2 rounded border">
              <strong>Alpine Value:</strong> {alpineValue}
            </div>
          )}
        </div>

        {/* Status Display */}
        <div className="space-y-2">
          <h4 className="font-medium text-blue-700">Status</h4>
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span>React Active:</span>
              <span className="text-green-600">✅ Yes</span>
            </div>
            <div className="flex justify-between">
              <span>Bridge Connected:</span>
              <span className="text-green-600">✅ {bridge ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between">
              <span>Alpine Data:</span>
              <span className="text-blue-600">{Object.keys(alpineData).length} keys</span>
            </div>
          </div>
        </div>
      </div>

      {/* Debug Info */}
      <details className="mt-4">
        <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
          🔍 Debug Info
        </summary>
        <div className="mt-2 text-xs bg-gray-100 p-2 rounded">
          <pre className="whitespace-pre-wrap">
            {JSON.stringify({
              bridgeId,
              counter,
              bridgeMessage,
              alpineValue,
              alpineData,
              timestamp: new Date().toISOString()
            }, null, 2)}
          </pre>
        </div>
      </details>
    </div>
  );
};

export default TestComponent; 