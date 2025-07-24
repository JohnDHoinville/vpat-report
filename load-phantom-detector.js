// Load the Phantom Source Detector
console.log('🔍 Loading Phantom Source Detector...');

let script = document.createElement('script');
script.src = 'phantom-source-detector.js?' + new Date().getTime();
script.onload = () => {
    console.log('✅ Phantom Source Detector loaded successfully');
};
script.onerror = () => console.error('❌ Failed to load phantom detector');
document.head.appendChild(script);
