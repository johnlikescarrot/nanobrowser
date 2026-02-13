const fs = require('fs');
const path = require('path');

// Mock browser environment
global.window = {
    getComputedStyle: (el) => el.style || { visibility: 'visible', display: 'block', cursor: 'default' }
};
global.document = {
    querySelectorAll: () => [] // Will be overridden in tests
};
global.Node = { ELEMENT_NODE: 1 };

// Load the userscript and extract logic
const scriptContent = fs.readFileSync(path.resolve(__dirname, 'nanobrowser-transcendent.user.js'), 'utf8');

// We need to strip the metadata and IIFE wrapper or just evaluate it
// For simplicity, we'll re-extract DOM_UTILS and getDomState using a regex or simple split
// But to be robust, let's just use the export we added
let DOM_UTILS, getDomState;

try {
    // Evaluate the script in a context that captures module.exports
    const mockModule = { exports: {} };
    const contextFunc = new Function('module', 'exports', 'GM_getValue', 'GM_setValue', 'GM_xmlhttpRequest', 'GM_registerMenuCommand', scriptContent);
    contextFunc(mockModule, mockModule.exports, () => {}, () => {}, () => {}, () => {});

    DOM_UTILS = mockModule.exports.DOM_UTILS;
    getDomState = mockModule.exports.getDomState;
} catch (e) {
    console.error("Failed to load script logic for testing:", e);
    process.exit(1);
}

function assert(condition, message) {
    if (!condition) {
        console.error("Assertion FAILED: " + message);
        process.exit(1);
    }
}

console.log("Running Robust Test Suite...");

// 1. Mock elements
const elements = [
    {
        tagName: 'BUTTON',
        offsetWidth: 10, offsetHeight: 10,
        innerText: 'Click Me',
        style: { visibility: 'visible', display: 'block', cursor: 'pointer' },
        getAttribute: () => null, getAttributeNames: () => [],
        previousSibling: null, parentNode: { nodeType: 1, tagName: 'BODY' }
    },
    {
        tagName: 'INPUT',
        offsetWidth: 10, offsetHeight: 10,
        innerText: '',
        style: { visibility: 'visible', display: 'block', cursor: 'text' },
        getAttribute: () => null, getAttributeNames: () => [],
        previousSibling: null, parentNode: { nodeType: 1, tagName: 'BODY' }
    },
    {
        tagName: 'DIV',
        offsetWidth: 0, offsetHeight: 0, // Hidden
        innerText: 'Hidden Text',
        style: { visibility: 'hidden', display: 'none' },
        getAttribute: () => null, getAttributeNames: () => [],
        previousSibling: null, parentNode: { nodeType: 1, tagName: 'BODY' }
    }
];

// 2. Mock document.querySelectorAll
global.document.querySelectorAll = () => elements;

// 3. Run getDomState
const { serialized, map } = getDomState();
console.log("Serialized DOM:\n" + serialized);

// 4. Assertions
console.log("Asserting Happy Path (Button)...");
assert(serialized.includes('[0]<button>Click Me</button>'), "Button should be serialized with text");

console.log("Asserting Void Element (Input)...");
assert(serialized.includes('[1]<input />'), "Input should be serialized as self-closing void element");
assert(!serialized.includes('<input></input>'), "Input should NOT have a separate closing tag");

console.log("Asserting Negative Case (Hidden Element)...");
assert(!serialized.includes('Hidden Text'), "Hidden element should not be serialized");
assert(map.length === 2, "Only 2 interactive elements should be found");

console.log("Asserting Order and Indexing...");
assert(map[0].index === 0 && map[0].tagName === 'button', "First element should be button with index 0");
assert(map[1].index === 1 && map[1].tagName === 'input', "Second element should be input with index 1");

console.log("TEST SUITE PASSED SUCCESSFULLY!");
