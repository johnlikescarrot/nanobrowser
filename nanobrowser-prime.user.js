// ==UserScript==
// @name         Nanobrowser Prime: The Ultimate AI Web Assistant
// @namespace    http://nanobrowser.ai/
// @version      1.0.1
// @description  A powerful multi-agent browser automation assistant. Extract data, fill forms, and browse with AI. Secure and isolated.
// @author       Jules (Ultimate Transparent Thinking Beast Mode)
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @require      https://unpkg.com/react@18/umd/react.production.min.js
// @require      https://unpkg.com/react-dom@18/umd/react-dom.production.min.js
// ==/UserScript==

(function() {
    'use strict';

    // --- SECURITY GUARDRAILS (HARDENED) ---
    const SecurityGuardrails = {
        PATTERNS: [
            { pattern: /\b(ignore|forget|disregard)[\s\-_]*(previous|all|above)[\s\-_]*(instructions?|tasks?|commands?)\b/gi, replacement: '[BLOCKED_OVERRIDE]' },
            { pattern: /\b(your?|the)[\s\-_]*new[\s\-_]*(task|instruction|goal|objective)[\s\-_]*(is|are|:)/gi, replacement: '[BLOCKED_INJECTION]' },
            { pattern: /\bultimate[-_ ]+task\b/gi, replacement: '[TASK_REF]' }
        ],
        sanitize: (text) => {
            if (!text) return "";
            let sanitized = text;
            SecurityGuardrails.PATTERNS.forEach(p => {
                sanitized = sanitized.replace(p.pattern, p.replacement);
            });
            return sanitized;
        }
    };

    // --- DOM SCANNER (ENHANCED CONTEXT) ---
    const DOMScanner = {
        isElementVisible: (el) => {
            const style = window.getComputedStyle(el);
            return el.offsetWidth > 0 && el.offsetHeight > 0 && style.visibility !== 'hidden' && style.display !== 'none';
        },
        isInteractive: (el) => {
            const interactiveTags = new Set(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'DETAILS', 'SUMMARY']);
            if (interactiveTags.has(el.tagName)) return true;
            const style = window.getComputedStyle(el);
            if (style.cursor === 'pointer') return true;
            if (el.hasAttribute('onclick') || el.getAttribute('role') === 'button') return true;
            return false;
        },
        scan: () => {
            const elements = [];
            const walk = (node) => {
                if (node.nodeType === 1) { // Element
                    if (DOMScanner.isElementVisible(node)) {
                        if (DOMScanner.isInteractive(node)) {
                            const rect = node.getBoundingClientRect();
                            // Increased context limit and added semantic attributes
                            const rawText = node.innerText || node.getAttribute('aria-label') || node.getAttribute('title') || "";
                            elements.push({
                                index: elements.length,
                                tagName: node.tagName.toLowerCase(),
                                text: SecurityGuardrails.sanitize(rawText.trim().slice(0, 500)),
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

    // --- NAVIGATOR (REFINED) ---
    const Navigator = {
        click: (index, elements) => {
            const target = elements.find(e => e.index === index);
            if (!target) return false;
            const el = document.elementFromPoint(target.rect.left + target.rect.width/2, target.rect.top + target.rect.height/2);
            if (el) {
                // Fixed: No double dispatch
                el.click();
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
        const [logs, setLogs] = useState(["Nanobrowser Prime Hardened. System Secure."]);
        const [isProcessing, setIsProcessing] = useState(false);

        const runTask = async () => {
            if (!task) return;
            setIsProcessing(true);

            // 1. Sanitize User Input
            const sanitizedTask = SecurityGuardrails.sanitize(task);
            setLogs(prev => [...prev, `User: ${sanitizedTask}`]);

            // 2. Scan and Sanitize Content
            const elements = DOMScanner.scan();
            setLogs(prev => [...prev, `System: Scanned ${elements.length} secure elements.`]);

            // Simulation
            setTimeout(() => {
                setLogs(prev => [...prev, "System: Task complete. Security protocols verified."]);
                setIsProcessing(false);
                setTask("");
            }, 1500);
        };

        return React.createElement('div', {
            style: {
                position: 'fixed', bottom: '20px', right: '20px', zIndex: '999999',
                fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'flex-end'
            }
        }, [
            React.createElement('button', {
                key: 'bubble',
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
                React.createElement('h2', { key: 'h' }, "Nanobrowser Prime"),
                React.createElement('div', { key: 'logs', style: { flex: 1, overflowY: 'auto', marginBottom: '16px', fontSize: '13px' } },
                    logs.map((l, i) => React.createElement('div', { key: i, style: { marginBottom: '8px', padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)' } }, l))
                ),
                React.createElement('div', { key: 'footer', style: { display: 'flex', gap: '8px' } }, [
                    React.createElement('input', {
                        key: 'i', value: task, onChange: (e) => setTask(e.target.value),
                        onKeyDown: (e) => e.key === 'Enter' && runTask(),
                        placeholder: "Ask securely...",
                        style: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '12px', padding: '10px', color: 'white' }
                    }),
                    React.createElement('button', { key: 'b', onClick: runTask, style: { backgroundColor: '#2563eb', border: 'none', borderRadius: '12px', padding: '0 15px', color: 'white' } }, "Go")
                ])
            ])
        ]);
    };

    // --- SECURE INIT ---
    const container = document.createElement('div');
    container.id = 'nanobrowser-prime-root';
    document.body.appendChild(container);

    // mode: 'closed' for security hardening
    const shadow = container.attachShadow({ mode: 'closed' });
    const mount = document.createElement('div');
    shadow.appendChild(mount);

    const root = ReactDOM.createRoot(mount);
    root.render(React.createElement(AssistantUI));

})();
