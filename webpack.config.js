const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  const isDevelopment = argv.mode === 'development';
  
  return {
    // Entry points for React components
    entry: {
      // Main React components bundle
      'react-components': './dashboard/js/components/index.js',
      // Individual component entries will be added as we migrate
      // 'auth-components': './dashboard/js/components/auth/index.js',
      // 'crawler-components': './dashboard/js/components/crawler/index.js',
    },
    
    // Output configuration
    output: {
      path: path.resolve(__dirname, 'dashboard/dist'),
      filename: isProduction ? '[name].[contenthash].js' : '[name].js',
      chunkFilename: isProduction ? '[name].[contenthash].chunk.js' : '[name].chunk.js',
      publicPath: isDevelopment ? 'http://localhost:8081/dashboard/dist/' : '/dashboard/dist/',
      // Make React components available globally for Alpine.js integration
      library: 'ReactComponents',
      libraryTarget: 'window',
      clean: true
    },
    
    // Module resolution
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      alias: {
        '@components': path.resolve(__dirname, 'dashboard/js/components'),
        '@services': path.resolve(__dirname, 'dashboard/js/services'),
        '@utils': path.resolve(__dirname, 'dashboard/js/utils'),
        '@constants': path.resolve(__dirname, 'dashboard/js/constants'),
        '@helpers': path.resolve(__dirname, 'dashboard/js/helpers'),
        '@stores': path.resolve(__dirname, 'dashboard/js/stores')
      }
    },
    
    // Module rules for different file types
    module: {
      rules: [
        // JavaScript and JSX files
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  targets: { browsers: ['> 1%', 'last 2 versions'] },
                  modules: false
                }],
                ['@babel/preset-react', {
                  runtime: 'automatic' // Use new JSX transform
                }]
              ],
              // Enable fast refresh for development
              plugins: isDevelopment ? [
                require.resolve('react-refresh/babel')
              ] : []
            }
          }
        },
        
        // CSS files
        {
          test: /\.css$/,
          use: [
            isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                modules: {
                  // Enable CSS modules for component isolation
                  auto: (resourcePath) => resourcePath.includes('/components/'),
                  localIdentName: isProduction 
                    ? '[hash:base64:8]' 
                    : '[name]__[local]--[hash:base64:5]'
                },
                sourceMap: isDevelopment
              }
            }
          ]
        }
      ]
    },
    
    // Plugins
    plugins: [
      // Extract CSS in production
      ...(isProduction ? [
        new MiniCssExtractPlugin({
          filename: '[name].[contenthash].css',
          chunkFilename: '[name].[contenthash].chunk.css'
        })
      ] : []),
      
      // Add React Fast Refresh plugin for development
      ...(isDevelopment ? [
        new (require('@pmmmwh/react-refresh-webpack-plugin'))({
          overlay: {
            sockIntegration: 'whm'
          }
        })
      ] : [])
    ],
    
    // External dependencies (don't bundle these)
    externals: {
      // Keep Alpine.js as external since it's already loaded
      'alpinejs': 'Alpine',
      // Socket.io is already available globally
      'socket.io-client': 'io'
    },
    
    // Development server configuration
    devServer: {
      static: [
        {
          directory: path.join(__dirname),
          publicPath: '/'
        },
        {
          directory: path.join(__dirname, 'dashboard/dist'),
          publicPath: '/dashboard/dist/'
        }
      ],
      port: 8081,
      host: 'localhost',
      hot: true,
      liveReload: true,
      
      // Enable CORS for cross-origin requests
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
      },
      
      // Proxy API requests to backend
      proxy: [
        {
          context: ['/api'],
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false
        }
      ],
      
      // Client configuration for better error overlay
      client: {
        logging: 'info',
        overlay: {
          errors: true,
          warnings: false
        },
        progress: true,
        reconnect: true
      },
      
      // Compression for better performance
      compress: true,
      
      // History API fallback for SPA routing (if needed later)
      historyApiFallback: false,
      
      // Watch options for better file watching
      watchFiles: {
        paths: ['dashboard/js/components/**/*'],
        options: {
          usePolling: false,
          interval: 1000
        }
      }
    },
    
    // Development vs Production optimizations
    mode: isProduction ? 'production' : 'development',
    devtool: isDevelopment ? 'eval-source-map' : 'source-map',
    
    // Watch options for build:watch
    watchOptions: {
      aggregateTimeout: 300,
      poll: false,
      ignored: /node_modules/
    },
    
    // Optimization settings
    optimization: {
      // Enable module concatenation in production
      concatenateModules: isProduction,
      
      // Split chunks configuration
      splitChunks: {
        cacheGroups: {
          // Separate vendor bundle for React and related libraries
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10
          },
          // Common utilities that can be shared between components
          common: {
            name: 'common',
            chunks: 'all',
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true
          }
        }
      },
      
      // Runtime chunk optimization
      runtimeChunk: isDevelopment ? 'single' : false
    },
    
    // Performance hints
    performance: {
      hints: isProduction ? 'warning' : false,
      maxEntrypointSize: 250000,
      maxAssetSize: 250000
    },
    
    // Cache configuration for faster rebuilds
    cache: {
      type: 'filesystem'
    }
  };
}; 