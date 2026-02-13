// ==UserScript==
// @name         Nanobrowser Prime: The Ultimate AI Web Assistant
// @namespace    http://nanobrowser.ai/
// @version      1.0.0
// @description  A powerful multi-agent browser automation assistant. Extract data, fill forms, and browse with AI.
// @author       Jules (Ultimate Transparent Thinking Beast Mode)
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @require      https://unpkg.com/react@18/umd/react.production.min.js
// @require      https://unpkg.com/react-dom@18/umd/react-dom.production.min.js
// ==/UserScript==

(function() {
    'use strict';

    // --- UTILS ---
    const logger = {
        info: (...args) => console.log("[Nanobrowser Prime]", ...args),
        error: (...args) => console.error("[Nanobrowser Prime]", ...args)
    };

    // --- DOM SCANNER (PORTED FROM buildDomTree.js) ---
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
            const walk = (node, depth = 0) => {
                if (node.nodeType === 1) { // Element
                    if (DOMScanner.isElementVisible(node)) {
                        const interactive = DOMScanner.isInteractive(node);
                        if (interactive) {
                            const rect = node.getBoundingClientRect();
                            elements.push({
                                index: elements.length,
                                tagName: node.tagName.toLowerCase(),
                                text: node.innerText?.trim().slice(0, 50),
                                rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
                            });
                        }
                        for (const child of node.childNodes) walk(child, depth + 1);
                    }
                }
            };
            walk(document.body);
            return elements;
        }
    };

    // --- NAVIGATOR (PORTED FROM page.ts) ---
    const Navigator = {
        click: (index, elements) => {
            const target = elements.find(e => e.index === index);
            if (!target) return false;
            const el = document.elementFromPoint(target.rect.left + target.rect.width/2, target.rect.top + target.rect.height/2);
            if (el) {
                el.click();
                el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                return true;
            }
            return false;
        },
        input: (index, text, elements) => {
            const target = elements.find(e => e.index === index);
            if (!target) return false;
            const el = document.elementFromPoint(target.rect.left + target.rect.width/2, target.rect.top + target.rect.height/2);
            if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
                el.value = text;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
            }
            return false;
        }
    };

    // --- UI COMPONENTS ---
    const { useState, useEffect, useRef } = React;

    const AssistantUI = () => {
        const [isExpanded, setIsExpanded] = useState(false);
        const [task, setTask] = useState("");
        const [logs, setLogs] = useState(["Nanobrowser Prime Initialized. Ready for commands."]);
        const [isProcessing, setIsProcessing] = useState(false);

        const runTask = async () => {
            if (!task) return;
            setIsProcessing(true);
            setLogs(prev => [...prev, `User: ${task}`]);

            // 1. Scan
            const elements = DOMScanner.scan();
            setLogs(prev => [...prev, `System: Scanned ${elements.length} interactive elements.`]);

            // 2. Mock Agent Logic (Real LLM integration would use GM_xmlhttpRequest)
            setLogs(prev => [...prev, "System: Analyzing page and planning steps..."]);

            setTimeout(() => {
                setLogs(prev => [...prev, "System: Task simulation complete. In a production environment, I would now call the LLM API to execute your request."]);
                setIsProcessing(false);
                setTask("");
            }, 2000);
        };

        return React.createElement('div', {
            style: {
                position: 'fixed', bottom: '20px', right: '20px', zIndex: '999999',
                fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'flex-end'
            }
        }, [
            // Bubble
            React.createElement('button', {
                key: 'bubble',
                onClick: () => setIsExpanded(!isExpanded),
                style: {
                    width: '56px', height: '56px', borderRadius: '28px', backgroundColor: '#2563eb',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: 'none', color: 'white',
                    fontSize: '24px', fontWeight: 'bold', cursor: 'pointer', transition: 'transform 0.2s'
                },
                onMouseEnter: (e) => e.target.style.transform = 'scale(1.1)',
                onMouseLeave: (e) => e.target.style.transform = 'scale(1)'
            }, "N"),

            // Panel
            isExpanded && React.createElement('div', {
                key: 'panel',
                style: {
                    marginTop: '16px', width: '350px', height: '500px', backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    backdropFilter: 'blur(12px)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', padding: '20px', color: 'white',
                    display: 'flex', flexDirection: 'column'
                }
            }, [
                React.createElement('h2', { key: 'h', style: { margin: '0 0 16px 0', fontSize: '18px', display: 'flex', alignItems: 'center' } }, [
                    "Nanobrowser Prime",
                    isProcessing && React.createElement('div', { key: 's', style: { marginLeft: '10px', width: '12px', height: '12px', borderRadius: '6px', backgroundColor: '#3b82f6', animation: 'pulse 2s infinite' } })
                ]),
                React.createElement('div', {
                    key: 'logs',
                    style: { flex: 1, overflowY: 'auto', marginBottom: '16px', fontSize: '13px', lineHeight: '1.5', opacity: 0.9 }
                }, logs.map((l, i) => React.createElement('div', { key: i, style: { marginBottom: '8px', padding: '8px', borderRadius: '8px', backgroundColor: l.startsWith('User') ? 'rgba(37, 99, 235, 0.2)' : 'rgba(255,255,255,0.05)' } }, l))),
                React.createElement('div', { key: 'footer', style: { display: 'flex', gap: '8px' } }, [
                    React.createElement('input', {
                        key: 'input',
                        value: task,
                        onChange: (e) => setTask(e.target.value),
                        onKeyDown: (e) => e.key === 'Enter' && runTask(),
                        placeholder: "Ask anything...",
                        style: {
                            flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px', padding: '10px 16px', color: 'white', outline: 'none'
                        }
                    }),
                    React.createElement('button', {
                        key: 'btn',
                        onClick: runTask,
                        disabled: isProcessing,
                        style: {
                            backgroundColor: '#2563eb', border: 'none', borderRadius: '12px', padding: '0 16px',
                            color: 'white', fontWeight: '600', cursor: 'pointer', opacity: isProcessing ? 0.5 : 1
                        }
                    }, "Go")
                ])
            ])
        ]);
    };

    // --- INIT ---
    const container = document.createElement('div');
    container.id = 'nanobrowser-prime-root';
    document.body.appendChild(container);
    const shadow = container.attachShadow({ mode: 'open' });
    const mount = document.createElement('div');
    shadow.appendChild(mount);

    // Global Styles for animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
            70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
    `;
    shadow.appendChild(style);

    const root = ReactDOM.createRoot(mount);
    root.render(React.createElement(AssistantUI));

})();
