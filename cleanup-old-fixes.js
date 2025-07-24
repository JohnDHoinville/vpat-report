// CLEANUP OLD FIXES - Remove old modal fix scripts that are no longer needed
console.log('🧹 CLEANUP: Removing old modal fix scripts...');

// List of old fix scripts that are now obsolete
const OLD_SCRIPTS = [
    'startup-modal-fix.js',
    'modal-click-fix.js', 
    'crawler-modal-clean.js',
    'nuclear-modal-fix.js',
    'emergency-modal-block.js',
    'tab-specific-modal-fix.js',
    'root-cause-fix.js',
    'test-root-cause-fix.js'
];

// Remove old script tags from DOM
OLD_SCRIPTS.forEach(scriptName => {
    const scripts = document.querySelectorAll(`script[src*="${scriptName}"]`);
    scripts.forEach(script => {
        script.remove();
        console.log(`🧹 CLEANUP: Removed old script: ${scriptName}`);
    });
});

console.log('✅ CLEANUP: Old modal fix scripts removed');
console.log('🎉 SUCCESS: Phantom Modal Killer is now the only active modal protection system!');
