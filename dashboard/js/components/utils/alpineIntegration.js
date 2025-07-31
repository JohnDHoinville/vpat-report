/**
 * Alpine.js - React Integration Utilities
 * 
 * These utilities enable React components to be rendered within Alpine.js
 * contexts using React portals, allowing for gradual migration while
 * maintaining full compatibility.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';

/**
 * Alpine-React Bridge for seamless coexistence during migration
 * 
 * This class provides the core infrastructure for rendering React components
 * within Alpine.js contexts using React portals and state synchronization.
 */
class AlpineReactBridge {
  constructor() {
    this.reactRoots = new Map(); // Track all React roots for cleanup
    this.stateStore = new Map(); // Shared state between Alpine and React
    this.listeners = new Map(); // State change listeners
    this.componentRegistry = new Map(); // Registered React components
    this.mountedComponents = new Map(); // Track mounted component instances
    
    // Initialize global bridge
    this.setupGlobalBridge();
    
    console.log('🌉 Alpine-React Bridge initialized');
  }

  /**
   * Setup global bridge functions for Alpine.js access
   */
  setupGlobalBridge() {
    // Make bridge available globally for Alpine.js
    window.alpineReactBridge = this;
    
    // Global function for rendering React components from Alpine
    window.renderReactComponent = this.renderComponent.bind(this);
    
    // Global function for unmounting React components
    window.unmountReactComponent = this.unmountComponent.bind(this);
    
    // Global function for state management
    window.bridgeState = {
      get: this.getState.bind(this),
      set: this.setState.bind(this),
      subscribe: this.subscribe.bind(this),
      unsubscribe: this.unsubscribe.bind(this)
    };
  }

  /**
   * Register a React component for use in Alpine contexts
   * @param {string} name - Component name
   * @param {React.Component} component - React component
   */
  registerComponent(name, component) {
    this.componentRegistry.set(name, component);
    console.log(`📝 Registered React component: ${name}`);
  }

  /**
   * Render a React component using a portal within an Alpine.js context
   * @param {string} componentName - Name of the registered component
   * @param {Object} props - Props to pass to the component
   * @param {string|HTMLElement} container - Container ID or element
   * @param {Object} options - Additional options
   * @returns {string} Unique instance ID for tracking
   */
  renderComponent(componentName, props = {}, container, options = {}) {
    try {
      // Get the component from registry
      const Component = this.componentRegistry.get(componentName);
      if (!Component) {
        throw new Error(`Component '${componentName}' not registered`);
      }

      // Get container element
      const containerElement = typeof container === 'string' 
        ? document.getElementById(container) 
        : container;
      
      if (!containerElement) {
        throw new Error(`Container not found: ${container}`);
      }

      // Generate unique instance ID
      const instanceId = `react-${componentName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create React root if not exists for this container
      let root = this.reactRoots.get(containerElement);
      if (!root) {
        root = createRoot(containerElement);
        this.reactRoots.set(containerElement, root);
      }

      // Create enhanced props with bridge access
      const enhancedProps = {
        ...props,
        bridgeId: instanceId,
        bridge: this,
        // Provide state helpers
        getState: this.getState.bind(this),
        setState: this.setState.bind(this),
        subscribe: this.subscribe.bind(this),
        // Alpine integration helpers
        alpineData: options.alpineData || {},
        onAlpineUpdate: options.onAlpineUpdate || (() => {}),
        // Component lifecycle hooks
        onMount: options.onMount || (() => {}),
        onUnmount: options.onUnmount || (() => {})
      };

      // Render the component
      const element = React.createElement(Component, enhancedProps);
      root.render(element);

      // Track the mounted component
      this.mountedComponents.set(instanceId, {
        componentName,
        props: enhancedProps,
        container: containerElement,
        root,
        options
      });

      // Call mount callback
      if (options.onMount) {
        options.onMount(instanceId, enhancedProps);
      }

      console.log(`✅ Rendered React component '${componentName}' with ID: ${instanceId}`);
      return instanceId;

    } catch (error) {
      console.error(`❌ Failed to render React component '${componentName}':`, error);
      throw error;
    }
  }

  /**
   * Unmount a React component instance
   * @param {string} instanceId - Instance ID returned from renderComponent
   */
  unmountComponent(instanceId) {
    const instance = this.mountedComponents.get(instanceId);
    if (!instance) {
      console.warn(`⚠️ Component instance not found: ${instanceId}`);
      return false;
    }

    try {
      // Call unmount callback
      if (instance.options.onUnmount) {
        instance.options.onUnmount(instanceId, instance.props);
      }

      // Unmount the component (render null)
      instance.root.render(null);
      
      // Remove from tracking
      this.mountedComponents.delete(instanceId);

      console.log(`🗑️ Unmounted React component instance: ${instanceId}`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to unmount component ${instanceId}:`, error);
      return false;
    }
  }

  /**
   * Unmount all React components in a container
   * @param {string|HTMLElement} container - Container ID or element
   */
  unmountContainer(container) {
    const containerElement = typeof container === 'string' 
      ? document.getElementById(container) 
      : container;

    if (!containerElement) {
      console.warn(`⚠️ Container not found for unmounting: ${container}`);
      return;
    }

    const root = this.reactRoots.get(containerElement);
    if (root) {
      root.unmount();
      this.reactRoots.delete(containerElement);
      
      // Remove all component instances for this container
      for (const [instanceId, instance] of this.mountedComponents.entries()) {
        if (instance.container === containerElement) {
          this.mountedComponents.delete(instanceId);
        }
      }
      
      console.log(`🗑️ Unmounted all React components in container`);
    }
  }

  /**
   * Update props for a mounted component instance
   * @param {string} instanceId - Instance ID
   * @param {Object} newProps - New props to merge
   */
  updateComponent(instanceId, newProps) {
    const instance = this.mountedComponents.get(instanceId);
    if (!instance) {
      console.warn(`⚠️ Component instance not found for update: ${instanceId}`);
      return false;
    }

    try {
      // Merge new props with existing props
      const updatedProps = { ...instance.props, ...newProps };
      
      // Get the component
      const Component = this.componentRegistry.get(instance.componentName);
      
      // Re-render with updated props
      const element = React.createElement(Component, updatedProps);
      instance.root.render(element);
      
      // Update stored props
      instance.props = updatedProps;
      this.mountedComponents.set(instanceId, instance);
      
      console.log(`🔄 Updated React component instance: ${instanceId}`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to update component ${instanceId}:`, error);
      return false;
    }
  }

  /**
   * State management - Get state value
   * @param {string} key - State key
   * @param {any} defaultValue - Default value if key doesn't exist
   */
  getState(key, defaultValue = null) {
    return this.stateStore.get(key) || defaultValue;
  }

  /**
   * State management - Set state value
   * @param {string} key - State key
   * @param {any} value - State value
   * @param {boolean} notify - Whether to notify listeners (default: true)
   */
  setState(key, value, notify = true) {
    const oldValue = this.stateStore.get(key);
    this.stateStore.set(key, value);
    
    if (notify && oldValue !== value) {
      this.notifyListeners(key, value, oldValue);
    }
    
    console.log(`📊 Bridge state updated: ${key} =`, value);
  }

  /**
   * Subscribe to state changes
   * @param {string} key - State key to watch
   * @param {Function} callback - Callback function (newValue, oldValue) => {}
   * @returns {Function} Unsubscribe function
   */
  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    
    this.listeners.get(key).add(callback);
    
    // Return unsubscribe function
    return () => {
      const keyListeners = this.listeners.get(key);
      if (keyListeners) {
        keyListeners.delete(callback);
        if (keyListeners.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }

  /**
   * Unsubscribe from state changes
   * @param {string} key - State key
   * @param {Function} callback - Callback function to remove
   */
  unsubscribe(key, callback) {
    const keyListeners = this.listeners.get(key);
    if (keyListeners) {
      keyListeners.delete(callback);
      if (keyListeners.size === 0) {
        this.listeners.delete(key);
      }
    }
  }

  /**
   * Notify all listeners for a state key
   * @param {string} key - State key
   * @param {any} newValue - New value
   * @param {any} oldValue - Old value
   */
  notifyListeners(key, newValue, oldValue) {
    const keyListeners = this.listeners.get(key);
    if (keyListeners) {
      keyListeners.forEach(callback => {
        try {
          callback(newValue, oldValue, key);
        } catch (error) {
          console.error(`❌ State listener error for key '${key}':`, error);
        }
      });
    }
  }

  /**
   * Alpine.js directive registration
   * Creates x-react directive for declarative React component rendering
   */
  registerAlpineDirective() {
    if (typeof Alpine !== 'undefined') {
      Alpine.directive('react', (el, { expression }, { evaluate }) => {
        const config = evaluate(expression);
        
        if (typeof config === 'string') {
          // Simple component name
          this.renderComponent(config, {}, el);
        } else if (typeof config === 'object') {
          // Full configuration object
          const { component, props = {}, options = {} } = config;
          this.renderComponent(component, props, el, options);
        }
      });
      
      console.log('🔌 Registered Alpine.js x-react directive');
    } else {
      console.warn('⚠️ Alpine.js not found - directive not registered');
    }
  }

  /**
   * Synchronize Alpine.js data with React state
   * @param {Object} alpineComponent - Alpine component instance
   * @param {string} dataKey - Alpine data key
   * @param {string} stateKey - Bridge state key
   * @param {boolean} bidirectional - Enable two-way sync (default: true)
   */
  syncWithAlpine(alpineComponent, dataKey, stateKey, bidirectional = true) {
    // Alpine -> React sync
    if (alpineComponent && alpineComponent.$watch) {
      alpineComponent.$watch(dataKey, (newValue) => {
        this.setState(stateKey, newValue, true);
      });
    }

    // React -> Alpine sync (if bidirectional)
    if (bidirectional) {
      this.subscribe(stateKey, (newValue) => {
        if (alpineComponent && alpineComponent[dataKey] !== newValue) {
          alpineComponent[dataKey] = newValue;
        }
      });
    }

    console.log(`🔄 Synced Alpine data '${dataKey}' with React state '${stateKey}'`);
  }

  /**
   * Cleanup all React components and listeners
   */
  cleanup() {
    console.log('🧹 Cleaning up Alpine-React Bridge...');
    
    // Unmount all React components
    for (const [containerElement, root] of this.reactRoots.entries()) {
      root.unmount();
    }
    
    // Clear all maps
    this.reactRoots.clear();
    this.componentRegistry.clear();
    this.mountedComponents.clear();
    this.stateStore.clear();
    this.listeners.clear();
    
    console.log('✅ Alpine-React Bridge cleanup complete');
  }

  /**
   * Debug helper - Get bridge status
   */
  getDebugInfo() {
    return {
      registeredComponents: Array.from(this.componentRegistry.keys()),
      mountedComponents: Array.from(this.mountedComponents.keys()),
      activeRoots: this.reactRoots.size,
      stateKeys: Array.from(this.stateStore.keys()),
      listenerKeys: Array.from(this.listeners.keys())
    };
  }
}

// Create and export the global bridge instance
const alpineReactBridge = new AlpineReactBridge();

export default alpineReactBridge;
export { AlpineReactBridge }; 