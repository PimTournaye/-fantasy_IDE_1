import NodeSystem from './lib/node-system/index.js';

document.addEventListener('DOMContentLoaded', () => {
    const nodeSystem = new NodeSystem();
    
    // Optional: Add to window for debugging
    window.nodeSystem = nodeSystem;
});