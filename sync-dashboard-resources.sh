#!/bin/bash

echo "🔄 Syncing resources from root to dashboard directory..."

# Ensure dashboard directories exist
mkdir -p dashboard/css
mkdir -p dashboard/js/components

# Copy CSS files
if [ -f "css/print-requirement-details.css" ]; then
    cp css/print-requirement-details.css dashboard/css/
    echo "✅ Copied print-requirement-details.css"
else
    echo "⚠️ Warning: css/print-requirement-details.css not found"
fi

# Copy JS components
if [ -f "js/components/requirements-status.js" ]; then
    cp js/components/requirements-status.js dashboard/js/components/
    echo "✅ Copied requirements-status.js"
else
    echo "⚠️ Warning: js/components/requirements-status.js not found"
fi

# Copy any other shared resources that might be needed
# Add more files here as they are identified

echo "🎉 Resource sync complete!"
