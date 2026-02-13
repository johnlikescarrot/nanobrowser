// ==UserScript==
// @name         Ultimate Transparent Thinking Beast Mode
// @namespace    http://tampermonkey.net/
// @version      1.2.0
// @description  The most powerful autonomous AI web agent. Now with enhanced security, state persistence, and robust API handling.
// @author       Jules
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      api.openai.com
// @connect      api.anthropic.com
// @connect      generativelanguage.googleapis.com
// @require      https://cdn.jsdelivr.net/npm/jsonrepair@3.4.0/lib/umd/jsonrepair.js
// ==/UserScript==

(function() {
    'use strict';

    // --- Configuration & Constants ---
    const CONFIG = {
        MAX_STEPS: 15,
        WAIT_MS: 2000,
        SCROLL_STEP: 500,
        DEBUG: true,
        SNAPSHOT_TEXT_LIMIT: 200,
        TIMEOUT_MS: 30000,
        DEFAULT_MODELS: {
            openai: 'gpt-4o',
            anthropic: 'claude-3-7-sonnet-latest',
            gemini: 'gemini-2.0-flash-exp'
        }
    };

    /**
     * Conditional logger that respects CONFIG.DEBUG
     */
    function debugLog(message, ...args) {
        if (CONFIG.DEBUG) {
            console.debug(`[BEAST-DEBUG] ${message}`, ...args);
        }
    }

    // --- Security & Guardrails ---
    class Guardrails {
        static validateUrl(url) {
            try {
                const parsed = new URL(url);
                return ['http:', 'https:'].includes(parsed.protocol);
            } catch (e) {
                return false;
            }
        }

        static sanitize(text) {
            if (!text) return '';
            // Remove delimiter tags to prevent spoofing
            return text
                .replace(/<nano_user_request>/g, '')
                .replace(/<\/nano_user_request>/g, '')
                .replace(/<nano_untrusted_content>/g, '')
                .replace(/<\/nano_untrusted_content>/g, '');
        }

        static truncate(text, limit = CONFIG.SNAPSHOT_TEXT_LIMIT) {
            if (!text) return '';
            if (text.length <= limit) return text;
            return text.substring(0, limit) + '...';
        }
    }

    // --- Perception Engine ---
    class Perception {
        static async getSnapshot() {
            const elements = [];
            let index = 0;

            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, {
                acceptNode: (node) => {
                    const style = window.getComputedStyle(node);
                    if (style.display === 'none' || style.opacity === '0') return NodeFilter.FILTER_REJECT;
                    if (style.visibility === 'hidden') return NodeFilter.FILTER_SKIP;

                    const isClickable = (
                        node.tagName === 'A' ||
                        node.tagName === 'BUTTON' ||
                        node.tagName === 'INPUT' ||
                        node.tagName === 'SELECT' ||
                        node.tagName === 'TEXTAREA' ||
                        node.getAttribute('role') === 'button' ||
                        node.onclick ||
                        style.cursor === 'pointer'
                    );

                    return isClickable ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
                }
            });

            while (walker.nextNode()) {
                const el = walker.currentNode;
                const rawText = el.innerText?.trim() || el.value || el.placeholder || el.getAttribute('aria-label') || '';
                elements.push({
                    index: index++,
                    tagName: el.tagName,
                    text: Guardrails.truncate(rawText),
                    role: el.getAttribute('role'),
                    type: el.getAttribute('type'),
                    element: el
                });
            }

            return elements;
        }

        static async getContext(goal) {
            const elements = await this.getSnapshot();
            const elementsText = elements.map(e => `[${e.index}] ${e.tagName}: "${e.text}" ${e.role ? `(role: ${e.role})` : ''}`).join('\n');

            return `
GOAL: <nano_user_request>${goal}</nano_user_request>
URL: ${window.location.href}
INTERACTIVE ELEMENTS:
<nano_untrusted_content>
${elementsText}
</nano_untrusted_content>
            `.trim();
        }
    }

    // --- LLM Interface ---
    class BeastLLM {
        static async call(provider, model, apiKey, messages) {
            const config = this.getProviderConfig(provider, model, apiKey, messages);

            return new Promise((resolve, reject) => {
                debugLog(`Calling ${provider} with model ${model}...`);
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: config.url,
                    headers: config.headers,
                    data: JSON.stringify(config.body),
                    timeout: CONFIG.TIMEOUT_MS,
                    ontimeout: () => reject(new Error('LLM API request timed out after 30s.')),
                    onerror: (err) => reject(new Error(`CORS/Network error: ${err.statusText || 'Check Tampermonkey @connect'}`)),
                    onload: (response) => {
                        if (response.status < 200 || response.status >= 300) {
                            reject(new Error(`LLM API returned HTTP ${response.status}: ${response.responseText.substring(0, 200)}`));
                            return;
                        }

                        try {
                            const data = JSON.parse(response.responseText);
                            const content = this.extractContent(provider, data);
                            if (!content) throw new Error('Empty response from LLM');

                            try {
                                const repaired = jsonrepair(content);
                                resolve(JSON.parse(repaired));
                            } catch (e) {
                                debugLog('JSON repair failed, attempting raw parse...', e);
                                resolve(JSON.parse(content));
                            }
                        } catch (e) {
                            debugLog('LLM Response Parsing Error:', e, response.responseText);
                            reject(new Error(`Failed to parse LLM response: ${e.message}`));
                        }
                    }
                });
            });
        }

                static getProviderConfig(provider, model, apiKey, messages) {
            switch (provider) {
                case 'openai': {
                    return {
                        url: 'https://api.openai.com/v1/chat/completions',
                        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                        body: { model, messages, response_format: { type: "json_object" } }
                    };
                }
                case 'anthropic': {
                    const systemMsg = messages.find(m => m.role === 'system')?.content || '';
                    const history = messages.filter(m => m.role !== 'system');
                    return {
                        url: 'https://api.anthropic.com/v1/messages',
                        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
                        body: { model, system: systemMsg, messages: history, max_tokens: 4096 }
                    };
                }
                case 'gemini': {
                    const systemPrompt = messages.find(m => m.role === 'system')?.content || '';
                    const rawHistory = messages.filter(m => m.role !== 'system').map(m => ({
                        role: m.role === 'user' ? 'user' : 'model',
                        parts: [{ text: m.content }]
                    }));

                    const contents = [];
                    for (const msg of rawHistory) {
                        if (contents.length > 0 && contents[contents.length - 1].role === msg.role) {
                            contents[contents.length - 1].parts[0].text += "
" + msg.parts[0].text;
                        } else {
                            contents.push(msg);
                        }
                    }

                    if (contents.length > 0 && contents[0].role !== 'user') {
                        contents.shift();
                    }

                    return {
                        url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                        headers: { 'Content-Type': 'application/json' },
                        body: {
                            system_instruction: { parts: [{ text: systemPrompt }] },
                            contents: contents
                        }
                    };
                }
                default:
                    throw new Error(`Unsupported LLM provider: ${provider}`);
            }
        }

        static extractContent(provider, data) {
            try {
                if (provider === 'openai') return data.choices?.[0]?.message?.content;
                if (provider === 'anthropic') return data.content?.[0]?.text;
                if (provider === 'gemini') return data.candidates?.[0]?.content?.parts?.[0]?.text;
            } catch (e) {
                debugLog(`Property access error in extractContent for ${provider}:`, e);
            }
            return null;
        }
    }

    // --- Agent Logic ---
    class BeastAgent {
        constructor(ui) {
            this.ui = ui;
            this.isRunning = false;
            this.navigating = false;
            this.history = [];
            this.stepCount = 0;
            this.goal = '';

            this.restoreState();
        }

        async restoreState() {
            const savedState = GM_getValue('beast_active_state', null);
            if (savedState) {
                try {
                    const state = JSON.parse(savedState);
                    if (state.isRunning) {
                        this.goal = state.goal;
                        this.stepCount = state.stepCount;
                        this.history = state.history;
                        debugLog('Restoring agent state after navigation...', state);

                        // Clear state from storage now that it's restored
                        GM_setValue('beast_active_state', null);

                        // Resume execution after delay
                        setTimeout(() => this.run(this.goal, true), CONFIG.WAIT_MS);
                    }
                } catch (e) {
                    debugLog('Failed to restore state:', e);
                    GM_setValue('beast_active_state', null);
                }
            }
        }

        saveState() {
            const state = {
                isRunning: true,
                goal: this.goal,
                stepCount: this.stepCount,
                history: this.history
            };
            GM_setValue('beast_active_state', JSON.stringify(state));
        }

        async run(goal, isResuming = false) {
            if (this.isRunning && !isResuming) return;

            this.isRunning = true;
            this.navigating = false;
            this.goal = goal;

            if (!isResuming) {
                this.stepCount = 0;
                this.history = [];
                this.ui.log('SUMMONING BEAST MODE...', 'system');
                this.ui.log(`GOAL: ${goal}`, 'user');
            } else {
                this.ui.log('RESUMING AUTONOMOUS LOOP...', 'system');
            }

            this.ui.setLoading(true);

            try {
                while (this.isRunning && this.stepCount < CONFIG.MAX_STEPS) {
                    this.stepCount++;
                    this.ui.log(`STEP ${this.stepCount}/${CONFIG.MAX_STEPS}`, 'system');

                    const prompt = await Perception.getContext(this.goal);
                    const messages = [
                        { role: 'system', content: this.getSystemPrompt() },
                        ...this.history,
                        { role: 'user', content: prompt }
                    ];

                    const provider = GM_getValue('beast_provider', 'openai');
                    const apiKey = GM_getValue(`beast_key_${provider}`, '');
                    const model = GM_getValue(`beast_model_${provider}`, this.getDefaultModel(provider));

                    if (!apiKey) throw new Error(`Missing API Key for ${provider}`);

                    const response = await BeastLLM.call(provider, model, apiKey, messages);

                    if (response.thought) this.ui.log(`THOUGHT: ${response.thought}`, 'planner');

                    this.history.push({ role: 'user', content: prompt });
                    this.history.push({ role: 'assistant', content: JSON.stringify(response) });

                    if (response.action === 'done') {
                        this.ui.log(`MISSION COMPLETE: ${response.thought}`, 'system');
                        break;
                    }

                    await this.performAction(response.action, response.args);

                    if (this.navigating) {
                        debugLog('Navigation triggered, halting current loop execution.');
                        return;
                    }

                    await new Promise(r => setTimeout(r, CONFIG.WAIT_MS));
                }
            } catch (err) {
                this.ui.log(`FATAL ERROR: ${err.message}`, 'system');
                debugLog('Agent Run Error:', err);
            } finally {
                if (!this.navigating) {
                    this.isRunning = false;
                    this.ui.setLoading(false);
                    GM_setValue('beast_active_state', null);
                }
            }
        }

        getSystemPrompt() {
            return `
You are BEAST MODE, an unstoppable autonomous web agent.
Analyze the provided web page snapshot and execute actions to reach the GOAL.

Output strictly in JSON format:
{
    "thought": "Your step-by-step reasoning",
    "action": "click_element | input_text | scroll | navigate | done",
    "args": {
        "index": number (for click/input),
        "text": "string" (for input),
        "url": "string" (for navigate),
        "direction": "up | down" (for scroll)
    }
}

Rules:
1. Only use indices provided in the INTERACTIVE ELEMENTS list.
2. For navigation, use the 'navigate' action with a full URL.
3. If you get stuck, try scrolling or navigating to a relevant page.
4. When the goal is met, use the 'done' action.
            `.trim();
        }

        async performAction(action, args) {
            const elements = await Perception.getSnapshot();

            switch (action) {
                case 'click_element': {
                    const el = elements.find(e => e.index === args.index);
                    if (el) {
                        this.ui.log(`CLICKING [${args.index}] ${el.tagName}`, 'navigator');
                        el.element.click();
                    } else {
                        this.ui.log(`ACTION FAILED: Element [${args.index}] not found.`, 'system');
                    }
                    break;
                }
                case 'input_text': {
                    const el = elements.find(e => e.index === args.index);
                    if (el) {
                        this.ui.log(`TYPING "${args.text}" INTO [${args.index}]`, 'navigator');
                        el.element.value = args.text;
                        el.element.dispatchEvent(new Event('input', { bubbles: true }));
                        el.element.dispatchEvent(new Event('change', { bubbles: true }));
                    } else {
                        this.ui.log(`ACTION FAILED: Element [${args.index}] not found.`, 'system');
                    }
                    break;
                }
                case 'scroll': {
                    const amount = args.direction === 'up' ? -CONFIG.SCROLL_STEP : CONFIG.SCROLL_STEP;
                    this.ui.log(`SCROLLING ${args.direction.toUpperCase()}`, 'navigator');
                    window.scrollBy(0, amount);
                    break;
                }
                case 'navigate': {
                    if (Guardrails.validateUrl(args.url)) {
                        this.ui.log(`NAVIGATING TO: ${args.url}`, 'navigator');
                        this.navigating = true;
                        this.saveState();
                        window.location.href = args.url;
                    } else {
                        this.ui.log(`BLOCKED: Insecure or invalid URL: ${args.url}`, 'system');
                    }
                    break;
                }
            }
        }

        getDefaultModel(provider) {
            return CONFIG.DEFAULT_MODELS[provider] || 'gpt-4o';
        }
    }

    // --- User Interface ---
    class BeastUI {
        constructor() {
            this.container = document.createElement('div');
            this.container.id = 'beast-mode-root';
            this.shadow = this.container.attachShadow({ mode: 'open' });
            document.body.appendChild(this.container);

            this.initStyles();
            this.initDOM();
        }

        initStyles() {
            const style = document.createElement('style');
            style.textContent = `
                :host { --accent: #19c2ff; --border: rgba(255, 255, 255, 0.1); }
                #beast-sidebar {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    width: 380px;
                    height: 80vh;
                    background: rgba(10, 11, 20, 0.95);
                    backdrop-filter: blur(20px);
                    border: 1px solid var(--border);
                    border-radius: 24px;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
                    z-index: 2147483647;
                    overflow: hidden;
                    font-family: 'Inter', system-ui, -apple-system, sans-serif;
                    color: #fff;
                }
                header {
                    padding: 20px 24px;
                    background: rgba(255, 255, 255, 0.03);
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: move;
                }
                h1 { margin: 0; font-size: 14px; font-weight: 900; letter-spacing: 2px; color: var(--accent); }
                .btn-icon { background: none; border: none; color: #fff; cursor: pointer; opacity: 0.5; transition: 0.2s; }
                .btn-icon:hover { opacity: 1; transform: scale(1.1); }

                #console {
                    flex: 1;
                    padding: 20px;
                    overflow-y: auto;
                    font-size: 13px;
                    line-height: 1.6;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .log-entry { padding-left: 12px; border-left: 2px solid transparent; white-space: pre-wrap; word-break: break-word; }
                .log-system { color: var(--accent); border-color: var(--accent); font-weight: bold; }
                .log-user { color: #fff; border-color: #fff; }
                .log-planner { color: #f6ad55; border-color: #f6ad55; }
                .log-navigator { color: #68d391; border-color: #68d391; }

                #input-area {
                    padding: 24px;
                    background: rgba(0, 0, 0, 0.2);
                    border-top: 1px solid var(--border);
                }
                .input-wrapper {
                    display: flex;
                    gap: 12px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 16px;
                    padding: 8px 16px;
                    border: 1px solid var(--border);
                }
                #goal-input {
                    flex: 1;
                    background: none;
                    border: none;
                    color: #fff;
                    padding: 12px 0;
                    outline: none;
                    font-size: 15px;
                }
                #summon-btn, #stop-btn {
                    border: none;
                    border-radius: 12px;
                    color: #fff;
                    padding: 0 20px;
                    font-weight: 700;
                    font-size: 12px;
                    cursor: pointer;
                    text-transform: uppercase;
                }
                #summon-btn { background: linear-gradient(135deg, #19c2ff 0%, #764ba2 100%); }
                #stop-btn { background: #e53e3e; display: none; }

                #settings-panel {
                    position: absolute;
                    inset: 0;
                    background: #0a0b14;
                    padding: 32px;
                    display: none;
                    flex-direction: column;
                    gap: 16px;
                    z-index: 2;
                    overflow-y: auto;
                }
                .settings-group { display: flex; flex-direction: column; gap: 6px; }
                .settings-group label { font-size: 10px; font-weight: 800; color: var(--accent); text-transform: uppercase; }
                .settings-group input, .settings-group select {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    padding: 10px;
                    color: #fff;
                    outline: none;
                    font-size: 12px;
                }
                #commit-btn {
                    margin-top: 10px;
                    background: linear-gradient(135deg, #764ba2 0%, #19c2ff 100%);
                    border: none;
                    padding: 14px;
                    border-radius: 12px;
                    color: #fff;
                    font-weight: 800;
                    cursor: pointer;
                }
            `;
            this.shadow.appendChild(style);
        }

        initDOM() {
            const sidebar = document.createElement('div');
            sidebar.id = 'beast-sidebar';
            sidebar.innerHTML = `
                <header>
                    <h1>BEAST MODE</h1>
                    <div style="display: flex; gap: 12px;">
                        <button id="toggle-settings" class="btn-icon" title="Settings">⚙️</button>
                        <button id="close-ui" class="btn-icon" title="Close">✕</button>
                    </div>
                </header>
                <div id="console">
                    <div class="log-entry log-system">READY FOR SUMMONING.</div>
                </div>
                <div id="input-area">
                    <div class="input-wrapper">
                        <input type="text" id="goal-input" placeholder="What is your command?">
                        <button id="summon-btn">Summon</button>
                        <button id="stop-btn">Stop</button>
                    </div>
                </div>
                <div id="settings-panel">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 4px;">
                        <h2 style="margin:0; font-size: 20px; font-weight: 800;">PARAMETERS</h2>
                        <button id="close-settings" class="btn-icon">✕</button>
                    </div>
                    <div class="settings-group">
                        <label>Active Provider</label>
                        <select id="provider-select">
                            <option value="openai">OpenAI (GPT-4o)</option>
                            <option value="anthropic">Anthropic (Claude 3.7 Sonnet)</option>
                            <option value="gemini">Google (Gemini 2.0 Flash)</option>
                        </select>
                    </div>
                    <div class="settings-group">
                        <label>OpenAI Key</label>
                        <input type="password" id="key-openai">
                    </div>
                    <div class="settings-group">
                        <label>OpenAI Model</label>
                        <input type="text" id="model-openai" placeholder="gpt-4o">
                    </div>
                    <div class="settings-group">
                        <label>Anthropic Key</label>
                        <input type="password" id="key-anthropic">
                    </div>
                    <div class="settings-group">
                        <label>Anthropic Model</label>
                        <input type="text" id="model-anthropic" placeholder="claude-3-7-sonnet-latest">
                    </div>
                    <div class="settings-group">
                        <label>Gemini Key</label>
                        <input type="password" id="key-gemini">
                    </div>
                    <div class="settings-group">
                        <label>Gemini Model</label>
                        <input type="text" id="model-gemini" placeholder="gemini-2.0-flash-exp">
                    </div>
                    <button id="commit-btn">COMMIT CHANGES</button>
                </div>
            `;
            this.shadow.appendChild(sidebar);

            // Interaction: Settings
            const panel = this.shadow.querySelector('#settings-panel');
            this.shadow.querySelector('#toggle-settings').onclick = () => {
                panel.style.display = 'flex';
                this.loadSettings();
            };
            this.shadow.querySelector('#close-settings').onclick = () => panel.style.display = 'none';
            this.shadow.querySelector('#commit-btn').onclick = () => {
                this.saveSettings();
                panel.style.display = 'none';
            };

            // Interaction: Close UI
            this.shadow.querySelector('#close-ui').onclick = () => {
                this.container.remove();
            };

            // Interaction: Sidebar Dragging
            this.initDraggable(sidebar);
        }

        initDraggable(el) {
            let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
            const header = this.shadow.querySelector('header');

            const onMouseMove = (e) => {
                e.preventDefault();
                pos1 = pos3 - e.clientX;
                pos2 = pos4 - e.clientY;
                pos3 = e.clientX;
                pos4 = e.clientY;
                el.style.top = (el.offsetTop - pos2) + "px";
                el.style.left = (el.offsetLeft - pos1) + "px";
                el.style.right = 'auto';
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            header.onmousedown = (e) => {
                e.preventDefault();
                pos3 = e.clientX;
                pos4 = e.clientY;
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            };
        }

        log(msg, type = 'system') {
            const consoleEl = this.shadow.querySelector('#console');
            const entry = document.createElement('div');
            entry.className = `log-entry log-${type}`;
            entry.textContent = msg;
            consoleEl.appendChild(entry);
            consoleEl.scrollTop = consoleEl.scrollHeight;
        }

        loadSettings() {
            this.shadow.querySelector('#provider-select').value = GM_getValue('beast_provider', 'openai');
            this.shadow.querySelector('#key-openai').value = GM_getValue('beast_key_openai', '');
            this.shadow.querySelector('#model-openai').value = GM_getValue('beast_model_openai', CONFIG.DEFAULT_MODELS.openai);
            this.shadow.querySelector('#key-anthropic').value = GM_getValue('beast_key_anthropic', '');
            this.shadow.querySelector('#model-anthropic').value = GM_getValue('beast_model_anthropic', CONFIG.DEFAULT_MODELS.anthropic);
            this.shadow.querySelector('#key-gemini').value = GM_getValue('beast_key_gemini', '');
            this.shadow.querySelector('#model-gemini').value = GM_getValue('beast_model_gemini', CONFIG.DEFAULT_MODELS.gemini);
        }

        saveSettings() {
            GM_setValue('beast_provider', this.shadow.querySelector('#provider-select').value);
            GM_setValue('beast_key_openai', this.shadow.querySelector('#key-openai').value);
            GM_setValue('beast_model_openai', this.shadow.querySelector('#model-openai').value);
            GM_setValue('beast_key_anthropic', this.shadow.querySelector('#key-anthropic').value);
            GM_setValue('beast_model_anthropic', this.shadow.querySelector('#model-anthropic').value);
            GM_setValue('beast_key_gemini', this.shadow.querySelector('#key-gemini').value);
            GM_setValue('beast_model_gemini', this.shadow.querySelector('#model-gemini').value);
            this.log('SETTINGS COMMITTED.', 'system');
        }

        setLoading(loading) {
            const summonBtn = this.shadow.querySelector('#summon-btn');
            const stopBtn = this.shadow.querySelector('#stop-btn');

            if (loading) {
                summonBtn.style.display = 'none';
                stopBtn.style.display = 'block';
            } else {
                summonBtn.style.display = 'block';
                stopBtn.style.display = 'none';
            }
        }
    }

    // --- Initialization ---
    function init() {
        if (window.self !== window.top) return; // Only run in top frame

        const ui = new BeastUI();
        const agent = new BeastAgent(ui);

        const input = ui.shadow.querySelector('#goal-input');
        const summonBtn = ui.shadow.querySelector('#summon-btn');
        const stopBtn = ui.shadow.querySelector('#stop-btn');

        const executeCommand = () => {
            const goal = input.value.trim();
            if (goal && !agent.isRunning) {
                agent.run(goal).catch(err => {
                    ui.log(`FATAL ERROR: ${err.message}`, 'system');
                    ui.setLoading(false);
                    agent.isRunning = false;
                });
                input.value = '';
            }
        };

        summonBtn.onclick = executeCommand;
        stopBtn.onclick = () => {
            agent.isRunning = false;
            ui.log('STOPPING AGENT...', 'system');
        };
        input.onkeydown = (e) => { if (e.key === 'Enter') executeCommand(); };
    }

    // Delay init to ensure DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
