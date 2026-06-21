// ui.js - Vercel Design System Component Architecture

window.SnB_UI = {
    ICON_SVG: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="100%" height="100%"><g stroke="currentColor" stroke-width="14" stroke-linecap="round" fill="none"><line x1="82" y1="38" x2="82" y2="18"/><line x1="52" y1="52" x2="38" y2="38"/><line x1="40" y1="82" x2="18" y2="82"/><line x1="52" y1="112" x2="38" y2="126"/><line x1="112" y1="52" x2="126" y2="38"/></g><path fill="currentColor" d="M95 65 C82 65 73 77 77 89 L120 211 C124 223 140 224 145 212 L165 156 L222 137 C235 133 237 116 225 111 L104 66 C101 65 98 65 95 65 Z"/></svg>`,

    /* --- Selection Highlight Engines --- */
    createSelectionHighlight(rect) {
        const highlight = document.createElement("div");
        highlight.className = "snb-selection-highlight";
        highlight.style.left = `${rect.left}px`;
        highlight.style.top = `${rect.top}px`;
        highlight.style.width = `${rect.width}px`;
        highlight.style.height = `${rect.height}px`;
        return highlight;
    },

    /* --- Canvas Drawing Overlay Context --- */
    createScreenshotOverlay() {
        const overlay = document.createElement("div");
        overlay.id = "snb-screenshot-overlay";
        
        const canvas = document.createElement("canvas");
        overlay.appendChild(canvas);
        return { overlay, canvas };
    },

    /* --- Unified Layout Factories (Shared across Text & Screenshots) --- */
    createToolbarContainer() {
        const toolbar = document.createElement("div");
        toolbar.id = "ai-toolbar"; // Shared ID to maintain styling parity
        return toolbar;
    },

    createActionButton() {
        const btn = document.createElement("button");
        btn.id = "ai-btn";
        btn.type = "button";
        btn.title = "Ask AI";
        btn.setAttribute("aria-label", "Ask AI");
        btn.innerHTML = this.ICON_SVG;
        return btn;
    },

    createPromptInput(placeholder = "Ask about selection...") {
        const promptInput = document.createElement("input");
        promptInput.id = "ai-prompt-input";
        promptInput.type = "text";
        promptInput.placeholder = placeholder;
        promptInput.setAttribute("aria-label", "Prompt for action context");
        promptInput.autocomplete = "off";
        promptInput.spellcheck = true;
        return promptInput;
    },

    /* --- Screenshot Thumbnail Preview Component --- */
    createScreenshotThumbnail(imageUrl) {
        const container = document.createElement("div");
        container.className = "snb-thumb-container";

        const img = document.createElement("img");
        img.src = imageUrl;

        const deleteBadge = document.createElement("div");
        deleteBadge.className = "snb-thumb-delete-badge";
        deleteBadge.innerHTML = "×";
        deleteBadge.title = "Remove image context";

        container.appendChild(img);
        container.appendChild(deleteBadge);
        return { container, deleteBadge };
    },

    /* --- Core Base Modal Structures --- */
    createPopupBase() {
        const popup = document.createElement("div");
        popup.id = "ai-popup";
        return popup;
    },

    /* --- Pure Templates --- */
    getLoadingTemplate(src) {
        return `
            <div class="snb-header-gradient snb-loading-gradient"></div>
            <dotlottie-wc src="${src}" class="snb-lottie-container" autoplay loop>
                <div class="snb-spinner-fallback"></div>
            </dotlottie-wc>
            <div class="snb-label-mono">SnB is thinking</div>
            <div class="snb-title-text snb-loading-title">Explaining context</div>
        `;
    },

    getApiKeyTemplate() {
        return `
            <div class="snb-header-gradient snb-api-gradient"></div>
            <div class="snb-modal-header-block snb-api-header-block">
                <div class="snb-icon-wrapper">
                    ${this.ICON_SVG}
                </div>
                <div>
                    <div class="snb-label-mono">Setup</div>
                    <div class="snb-title-text snb-api-title">API key required</div>
                </div>
            </div>
            <div class="snb-body-desc">
                Please enter your Groq API key to use the explain feature.
            </div>
            <input type="password" id="api-key-input" placeholder="gsk_...">
            <button id="save-api-key-btn">Save & Explain</button>
            <div id="api-key-error" class="snb-api-error-msg" style="color: #ee0000; font-size: 13px; line-height: 18px; margin-top: 12px; display: none;"></div>
        `;
    },

    getPopupTemplate() {
        return `
            <div class="snb-explain-header-block">
                <div class="snb-meta-split">
                    <div class="snb-icon-wrapper">
                        ${this.ICON_SVG}
                    </div>
                    <div>
                        <div class="snb-label-mono">Result</div>
                        <div class="snb-title-text snb-explain-title">Explanation</div>
                    </div>
                </div>
                <button id="close-btn">×</button>
            </div>
            <div id="text-container">
                <div id="explanation-text"></div>
            </div>
            <div class="snb-footer-actions">
                <button id="copy-btn">Copy to clipboard</button>
            </div>
        `;
    }
};