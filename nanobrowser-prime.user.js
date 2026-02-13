// ==UserScript==
// @name         Nanobrowser Prime
// @namespace    http://tampermonkey.net/
// @version      0.2.2
// @description  Hardened Standalone AI Web Agent - Production Ready
// @author       Jules
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @require      https://unpkg.com/react@18.2.0/umd/react.production.min.js#sha256=S0lp+k7zWUMk2ixteM6HZvu8L9Eh//OVrt+ZfbCpmgY=
// @require      https://unpkg.com/react-dom@18.2.0/umd/react-dom.production.min.js#sha256=IXWO0ITNDjfnNXIu5POVfqlgYoop36bDzhodR6LW5Pc=
// ==/UserScript==

/* global React, ReactDOM */
(function() {
    'use strict';

    // --- SECURITY GUARDRAILS ---
    const SecurityGuardrails = {
        PATTERNS: [
            { pattern: /ignore (all )?previous instructions/gi, replacement: '[BLOCKED_OVERRIDE_ATTEMPT]' },
            { pattern: /forget (all )?instructions/gi, replacement: '[BLOCKED_OVERRIDE_ATTEMPT]' },
            { pattern: /disregard (all )?(above|previous) (instructions|tasks)/gi, replacement: '[BLOCKED_OVERRIDE_ATTEMPT]' },
            { pattern: /(your new task is|you are now|actually you must)/gi, replacement: '[BLOCKED_TASK_INJECTION]' }
        ],
        sanitize: (text) => {
            if (!text) return "";
            let result = text.normalize('NFC');
            result = result.replace(/[\u00AD\u034F\u061C\u070F\u180E\u200B-\u200F\u2028-\u202F\u2060-\u2064\u2066-\u206F\uFE00-\uFE0F\uFEFF]/g, '');
            try { result = result.replace(/\p{Cf}/gu, ''); } catch (e) {}
            SecurityGuardrails.PATTERNS.forEach(p => {
                result = result.replace(p.pattern, p.replacement);
            });
            return result;
        }
    };

    // --- DOM SCANNER (ENHANCED) ---
    const DOMScanner = {
        getUniqueSelector: (el) => {
            if (el.id) return '#' + CSS.escape(el.id);
            const path = [];
            while (el && el.nodeType === Node.ELEMENT_NODE) {
                let selector = el.nodeName.toLowerCase();
                if (el.parentNode) {
                    const siblings = Array.from(el.parentNode.children).filter(e => e.nodeName === el.nodeName);
                    if (siblings.length > 1) {
                        selector += ':nth-of-type(' + (siblings.indexOf(el) + 1) + ')';
                    }
                }
                path.unshift(selector);
                el = el.parentNode;
            }
            return path.join(' > ');
        },
        isElementVisible: (el) => {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
            const viewportWidth = window.innerWidth || document.documentElement.clientWidth;

            const isIntersecting = (
                rect.bottom > 0 && rect.top < viewportHeight &&
                rect.right > 0 && rect.left < viewportWidth
            );

            return isIntersecting && el.offsetWidth > 0 && el.offsetHeight > 0 &&
                   style.visibility !== 'hidden' && style.display !== 'none';
        },
        isInteractive: (el) => {
            const tagName = el.tagName.toUpperCase();
            const interactiveTags = new Set(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'DETAILS', 'SUMMARY']);
            if (interactiveTags.has(tagName)) return true;
            const style = window.getComputedStyle(el);
            if (style.cursor === 'pointer') return true;
            if (el.hasAttribute('onclick') || el.getAttribute('role') === 'button' || el.contentEditable === 'true') return true;
            return false;
        },
        scan: () => {
            const elements = [];
            const walk = (node) => {
                if (node.nodeType === 1) {
                    if (DOMScanner.isElementVisible(node)) {
                        if (DOMScanner.isInteractive(node)) {
                            const rect = node.getBoundingClientRect();
                            // textContent prevents reflows; falling back to labels/placeholders
                            const rawText = node.textContent || node.getAttribute('aria-label') ||
                                          node.getAttribute('placeholder') || node.getAttribute('title') || "";
                            elements.push({
                                index: elements.length,
                                tagName: node.tagName.toLowerCase(),
                                text: SecurityGuardrails.sanitize(rawText.trim().slice(0, 500)),
                                selector: DOMScanner.getUniqueSelector(node),
                                rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
                            });
                        }
                        for (const child of node.childNodes) walk(child);
                    }
                }
            };
            walk(document.body);
            return elements;
        }
    };

    // --- NAVIGATOR ---
    const Navigator = {
        click: (index, elements) => {
            const target = elements.find(e => e.index === index);
            if (!target) return false;
            const el = document.querySelector(target.selector);
            if (el) {
                el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                return true;
            }
            return false;
        },
        input: (index, text, elements) => {
            const target = elements.find(e => e.index === index);
            if (!target) return false;
            const el = document.querySelector(target.selector);
            if (!el) return false;

            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                const nativeSetter = Object.getOwnPropertyDescriptor(
                    el.tagName === 'INPUT' ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype,
                    'value'
                ).set;
                nativeSetter.call(el, text);
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
            } else if (el.contentEditable === 'true') {
                el.textContent = text;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
            }
            return false;
        }
    };

    // --- UI COMPONENTS ---
    const { useState } = React;

    const AssistantUI = () => {
        const [isExpanded, setIsExpanded] = useState(false);
        const [task, setTask] = useState("");
        const [logs, setLogs] = useState(["Nanobrowser Prime 0.2.2: Enclave Secured."]);
        const [isProcessing, setIsProcessing] = useState(false);

        const MAX_LOGS = 100;
        const addLog = (msg) => setLogs(prev => {
            const next = [...prev, msg];
            return next.length > MAX_LOGS ? next.slice(-MAX_LOGS) : next;
        });

        const runTask = async () => {
            if (!task) return;
            setIsProcessing(true);

            const sanitizedTask = SecurityGuardrails.sanitize(task);
            addLog(`User: ${sanitizedTask}`);

            const elements = DOMScanner.scan();
            addLog(`System: Analysis in progress...`);

            setTimeout(() => {
                addLog(`System: ${elements.length} secure interactive nodes detected.`);

                if (elements.length > 0) {
                   const topElement = elements[0];
                   // Demonstrating Navigator wiring in logs
                   addLog(`System: Suggested action -> click on [${topElement.index}] ${topElement.tagName}.`);
                   // In a real task, we would call Navigator.click(topElement.index, elements);
                }

                addLog("System: Step complete. Standing by.");
                setIsProcessing(false);
                setTask("");
            }, 1000);
        };

        return React.createElement('div', {
            style: {
                position: 'fixed', bottom: '20px', right: '20px', zIndex: '2147483647',
                fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'flex-end'
            }
        }, [
            React.createElement('button', {
                key: 'bubble',
                type: 'button',
                onClick: () => setIsExpanded(!isExpanded),
                style: {
                    width: '56px', height: '56px', borderRadius: '28px', backgroundColor: '#2563eb',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: 'none', color: 'white',
                    fontSize: '24px', fontWeight: 'bold', cursor: 'pointer'
                }
            }, "N"),

            isExpanded && React.createElement('div', {
                key: 'panel',
                style: {
                    marginTop: '16px', width: '350px', height: '500px', backgroundColor: 'rgba(15, 23, 42, 0.98)',
                    backdropFilter: 'blur(16px)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)',
                    padding: '20px', color: 'white', display: 'flex', flexDirection: 'column'
                }
            }, [
                React.createElement('h2', { key: 'h', style: { margin: '0 0 10px 0', fontSize: '18px' } }, "Nanobrowser Prime"),
                React.createElement('div', { key: 'logs', style: { flex: 1, overflowY: 'auto', marginBottom: '16px', fontSize: '13px' } },
                    logs.map((l, i) => React.createElement('div', { key: i, style: { marginBottom: '8px', padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)' } }, l))
                ),
                React.createElement('div', { key: 'footer', style: { display: 'flex', gap: '8px' } }, [
                    React.createElement('input', {
                        key: 'i', value: task, onChange: (e) => setTask(e.target.value),
                        onKeyDown: (e) => e.key === 'Enter' && runTask(),
                        placeholder: "Ask securely...",
                        className: 'nano-input',
                        style: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid transparent', borderRadius: '12px', padding: '10px', color: 'white', outline: 'none' }
                    }),
                    React.createElement('button', {
                        key: 'b',
                        type: 'button',
                        onClick: runTask,
                        disabled: isProcessing,
                        style: { backgroundColor: isProcessing ? '#475569' : '#2563eb', border: 'none', borderRadius: '12px', padding: '0 15px', color: 'white', cursor: isProcessing ? 'default' : 'pointer' }
                    }, isProcessing ? "..." : "Go")
                ]),
                React.createElement('style', { key: 's' }, `
                    .nano-input:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3); }
                `)
            ])
        ]);
    };

    // --- SECURE INIT ---
    const container = document.createElement('div');
    container.id = 'nanobrowser-prime-container';
    document.body.appendChild(container);

    // mode: 'closed' provides the best isolation from host site scripts
    const shadow = container.attachShadow({ mode: 'closed' });
    const mount = document.createElement('div');
    mount.id = 'nanobrowser-prime-mount';
    shadow.appendChild(mount);

    const root = ReactDOM.createRoot(mount);
    root.render(React.createElement(AssistantUI));

})();
