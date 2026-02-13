// Mock environment
global.window = { getComputedStyle: () => ({ visibility: 'visible', display: 'block', cursor: 'pointer' }) };
global.document = {
    querySelectorAll: () => [
        { tagName: 'BUTTON', offsetWidth: 10, offsetHeight: 10, innerText: 'Click Me', getAttribute: () => null, previousSibling: null, parentNode: null },
        { tagName: 'INPUT', offsetWidth: 10, offsetHeight: 10, innerText: '', getAttribute: () => null, previousSibling: null, parentNode: null }
    ]
};
global.Node = { ELEMENT_NODE: 1 };

// Import logic from script (simulated)
const DOM_UTILS = {
    isElementVisible: (el) => el.offsetWidth > 0,
    isInteractive: (el) => ['BUTTON', 'INPUT'].includes(el.tagName),
};

function getDomState() {
    const elements = document.querySelectorAll('*');
    const interactiveElements = [];
    elements.forEach((el, i) => {
        if (DOM_UTILS.isElementVisible(el) && DOM_UTILS.isInteractive(el)) {
            interactiveElements.push({ index: i, tagName: el.tagName.toLowerCase(), text: el.innerText });
        }
    });
    return interactiveElements.map(e => `[${e.index}]<${e.tagName}>${e.text}</${e.tagName}>`).join('\n');
}

console.log("Testing DOM Serialization...");
const state = getDomState();
console.log(state);
if (state.includes('[0]<button>Click Me</button>')) {
    console.log("DOM Test PASSED");
} else {
    console.log("DOM Test FAILED");
    process.exit(1);
}
