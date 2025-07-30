#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Accessibility Tools Setup...\n');

// Test 1: Check if reports directory exists
console.log('1. Checking reports directory...');
const reportsDir = path.join(__dirname, 'reports');
if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
    console.log('✅ Created reports directory');
} else {
    console.log('✅ Reports directory exists');
}

// Test 2: Check npm packages
console.log('\n2. Checking installed packages...');
const packages = [
    '@axe-core/cli',
    'pa11y',
    'pa11y-ci', 
    'lighthouse',
    'accessibility-checker',
    'color-contrast-checker'
];

packages.forEach(pkg => {
    try {
        const packagePath = require.resolve(pkg);
        console.log(`✅ ${pkg} is installed`);
    } catch (error) {
        console.log(`❌ ${pkg} is NOT installed`);
    }
});

// Test 3: Check configuration files
console.log('\n3. Checking configuration files...');
const configFiles = [
    '.axerc.json',
    '.pa11yrc.json',
    'sitemap.xml'
];

configFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file} exists`);
    } else {
        console.log(`❌ ${file} is missing`);
    }
});

// Test 4: Check scripts directory
console.log('\n4. Checking scripts...');
const scriptsDir = path.join(__dirname, 'scripts');
if (fs.existsSync(path.join(scriptsDir, 'generate-consolidated-report.js'))) {
    console.log('✅ Consolidated report generator exists');
} else {
    console.log('❌ Consolidated report generator is missing');
}

// Test 5: Verify npm scripts
console.log('\n5. Checking npm scripts...');
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredScripts = [
        'a11y:axe',
        'a11y:pa11y',
        'a11y:lighthouse',
        'a11y:ibm',
        'a11y:all',
        'a11y:generate-report'
    ];
    
    requiredScripts.forEach(script => {
        if (packageJson.scripts[script]) {
            console.log(`✅ npm script "${script}" is configured`);
        } else {
            console.log(`❌ npm script "${script}" is missing`);
        }
    });
} catch (error) {
    console.log('❌ Error reading package.json');
}

console.log('\n🎯 Setup Test Complete!');
console.log('\nTo run the accessibility testing platform:');
console.log('1. npm start (to start the local server)');
console.log('2. Open http://localhost:3000 in your browser');
console.log('3. Click "Run All Accessibility Tools" or upload WAVE/consolidated reports');
console.log('\nTo run individual tools manually:');
console.log('- npm run a11y:axe');
console.log('- npm run a11y:pa11y'); 
console.log('- npm run a11y:lighthouse');
console.log('- npm run a11y:ibm');
console.log('- npm run a11y:all (runs all tools)');
console.log('- npm run a11y:generate-report (creates consolidated report)'); 