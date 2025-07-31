/**
 * Babel Configuration for React-Alpine.js Coexistence
 * 
 * This configuration handles JSX compilation and modern JavaScript
 * features while ensuring compatibility with the existing Alpine.js
 * infrastructure during the migration period.
 */

module.exports = {
  // Presets for different JavaScript features
  presets: [
    // Environment preset for modern JavaScript features
    ['@babel/preset-env', {
      // Target browsers - balance between modern features and compatibility
      targets: {
        browsers: [
          '> 1%',
          'last 2 versions',
          'not dead',
          'not ie <= 11'
        ]
      },
      
      // Module handling - let webpack handle modules
      modules: false,
      
      // Loose transformations for better performance
      loose: true
    }],
    
    // React preset for JSX compilation
    ['@babel/preset-react', {
      // Use the new JSX transform (React 17+)
      runtime: 'automatic',
      
      // Development options
      development: process.env.NODE_ENV === 'development'
    }]
  ],
  
  // Plugins for additional transformations
  plugins: [
    // Class properties and private methods
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-private-methods',
    
    // Object spread operator
    '@babel/plugin-proposal-object-rest-spread',
    
    // Optional chaining and nullish coalescing
    '@babel/plugin-proposal-optional-chaining',
    '@babel/plugin-proposal-nullish-coalescing-operator',
    
    // Dynamic imports
    '@babel/plugin-syntax-dynamic-import'
  ],
  
  // Environment-specific overrides
  env: {
    // Development environment
    development: {
      plugins: [
        // React debugging plugins
        '@babel/plugin-transform-react-jsx-source',
        '@babel/plugin-transform-react-jsx-self'
      ]
    },
    
    // Production environment
    production: {
      plugins: [
        // Optimize React for production
        '@babel/plugin-transform-react-constant-elements',
        '@babel/plugin-transform-react-inline-elements'
      ]
    },
    
    // Test environment (for future testing setup)
    test: {
      presets: [
        ['@babel/preset-env', {
          targets: { node: 'current' },
          modules: 'commonjs'
        }],
        ['@babel/preset-react', {
          runtime: 'automatic'
        }]
      ]
    }
  }
}; 