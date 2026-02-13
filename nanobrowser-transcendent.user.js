// ==UserScript==
// @name         Nanobrowser Transcendent
// @namespace    http://nanobrowser.ai/
// @version      1.2.0
// @description  The Ultimate Multi-Agent Browser Automation Userscript
// @author       Nanobrowser Team
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @connect      api.openai.com
// @connect      api.anthropic.com
// @connect      api.google.com
// @connect      localhost
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // Direct CSS injection for glass-morphism (more reliable than CDN Tailwind in Shadow DOM)
    const STYLES = `
        #nano-container {
            all: initial;
            position: fixed;
            top: 20px;
            right: 20px;
            width: 350px;
            height: 80vh;
            z-index: 2147483647;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            transform: translateX(120%);
        }
        #nano-glass {
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.4);
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 24px;
            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .nano-header {
            padding: 20px;
            background: rgba(255, 255, 255, 0.2);
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .nano-title {
            font-weight: 900;
            color: #2563eb;
            font-size: 20px;
            letter-spacing: -1px;
        }
        .nano-logs {
            flex: 1;
            padding: 15px;
            overflow-y: auto;
            font-size: 11px;
            font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
            color: #475569;
        }
        .nano-input-area {
            padding: 20px;
            background: rgba(255, 255, 255, 0.2);
            border-top: 1px solid rgba(255, 255, 255, 0.2);
        }
        .nano-textarea {
            width: 100%;
            height: 80px;
            background: rgba(255, 255, 255, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 16px;
            padding: 12px;
            font-size: 14px;
            color: #1e293b;
            resize: none;
            outline: none;
            box-sizing: border-box;
            margin-bottom: 12px;
        }
        .nano-btn {
            width: 100%;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 12px;
            padding: 12px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }
        .nano-btn:hover { background: #1d4ed8; transform: translateY(-1px); }
        .nano-btn:active { transform: translateY(0); }
        .nano-close { cursor: pointer; color: #94a3b8; font-size: 18px; }
    `;

    function initUI() {
        const wrapper = document.createElement('div');
        wrapper.id = 'nano-container';
        const shadow = wrapper.attachShadow({ mode: 'open' });

        const styleTag = document.createElement('style');
        styleTag.textContent = STYLES;
        shadow.appendChild(styleTag);

        const glass = document.createElement('div');
        glass.id = 'nano-glass';
        glass.innerHTML = `
            <div class="nano-header">
                <span class="nano-title">NANO</span>
                <span class="nano-close" id="close-btn">✕</span>
            </div>
            <div class="nano-logs" id="logs">
                [SYSTEM] Nanobrowser Transcendent v1.2.0 Online.
            </div>
            <div class="nano-input-area">
                <textarea class="nano-textarea" id="input" placeholder="How can I automate your browser?"></textarea>
                <button class="nano-btn" id="run-btn">Execute Task</button>
            </div>
        `;
        shadow.appendChild(glass);
        document.body.appendChild(wrapper);

        const logEl = shadow.getElementById('logs');
        const inputEl = shadow.getElementById('input');
        const runBtn = shadow.getElementById('run-btn');
        const updateLog = (m) => {
            const div = document.createElement('div');
            div.style.marginBottom = '4px';
            div.textContent = `[${new Date().toLocaleTimeString()}] ${m}`;
            logEl.appendChild(div);
            logEl.scrollTop = logEl.scrollHeight;
        };

        shadow.getElementById('close-btn').onclick = () => wrapper.style.transform = 'translateX(120%)';
        GM_registerMenuCommand('Open Nanobrowser', () => wrapper.style.transform = 'translateX(0)');

        runBtn.onclick = async () => {
            const task = inputEl.value;
            if (!task) return;
            runBtn.disabled = true;
            runBtn.innerText = 'Thinking...';
            // Loop logic (omitted here for UI test brevity, same as v1.1.0)
            updateLog(`Starting: ${task}`);
            setTimeout(() => {
                updateLog("Goal achieved (Mock).");
                runBtn.disabled = false;
                runBtn.innerText = 'Execute Task';
            }, 1000);
        };

        // For initial visual verification
        setTimeout(() => { wrapper.style.transform = 'translateX(0)'; }, 500);
    }

    if (document.readyState === 'complete') initUI();
    else window.addEventListener('load', initUI);
})();
