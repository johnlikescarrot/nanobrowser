import assert from 'node:assert';
import { isInteractive } from './sanitizer-logic.js';

console.log("Running Integration Tests (ESM)...");

/**
 * Mocking a Navigator-like scenario
 */
const mockElements = [
    { index: 0, tagName: 'button', selector: '#btn-1', text: 'Click Me' },
    { index: 1, tagName: 'div', selector: '#editable', text: 'Edit Me' }
];

const mockState = {
    elements: mockElements,
    lastAction: null
};

function performAction(type, index) {
    const target = mockState.elements.find(e => e.index === index);
    if (!target) return false;
    mockState.lastAction = { type, index, selector: target.selector };
    return true;
}

// Test 1: Action Targeting
const success = performAction('click', 0);
assert.strictEqual(success, true);
assert.strictEqual(mockState.lastAction.selector, '#btn-1');

// Test 2: Production logic check
const mockButton = { tagName: 'BUTTON', hasAttribute: () => true };
assert.strictEqual(isInteractive(mockButton), true, "Production interactivity logic must pass");

console.log("✅ Integration Tests Passed.");
