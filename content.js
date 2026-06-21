// content.js - Runtime Flow Management Engine
console.log("SnB content.js loaded");

const DEFAULT_PROMPT = "Explain simply dont think too much";
const DOTLOTTIE_SCRIPT_ID = "dotlottie-wc-script";
const DOTLOTTIE_SCRIPT_SRC = "https://unpkg.com/@lottiefiles/dotlottie-wc@0.9.14/dist/dotlottie-wc.js";
const LOADING_LOTTIE_SRC = "https://lottie.host/9c818cf9-113f-4925-a279-5d6432465b90/zsUBC2pSGa.lottie";

let lastExplainRequest = null;
let activeRange = null;
let positionUpdater = null;

const UI = window.SnB_UI;

function clearComponents({ toolbar = true, popup = true, highlights = true } = {}) {
    if (toolbar) document.getElementById("ai-toolbar")?.remove();
    if (popup) document.getElementById("ai-popup")?.remove();
    if (highlights) document.querySelectorAll(".snb-selection-highlight").forEach(el => el.remove());
}

function updateSelectionUI() {
    if (!activeRange) return;

    const toolbar = document.getElementById("ai-toolbar");
    if (!toolbar) return;

    showSelectionHighlights(activeRange);

    const rect = activeRange.getBoundingClientRect();
    const toolbarWidth = toolbar.offsetWidth || 276;
    const toolbarHeight = toolbar.offsetHeight || 44;

    let leftPos = rect.left + (rect.width / 2) - (toolbarWidth / 2);
    let topPos = rect.top - toolbarHeight - 5;

    if (leftPos + toolbarWidth > window.innerWidth - 5) leftPos = window.innerWidth - toolbarWidth - 5;
    if (leftPos < 5) leftPos = 5;
    if (topPos < 5) topPos = rect.bottom + 5;

    toolbar.style.left = `${leftPos}px`;
    toolbar.style.top = `${topPos}px`;
}

function showSelectionHighlights(range) {
    document.querySelectorAll(".snb-selection-highlight").forEach(el => el.remove());
    Array.from(range.getClientRects()).forEach((rect) => {
        if (!rect.width || !rect.height) return;
        const highlight = UI.createSelectionHighlight(rect);
        document.body.appendChild(highlight);
    });
}

function ensureDotLottieScript() {
    if (document.getElementById(DOTLOTTIE_SCRIPT_ID)) return;

    const script = document.createElement("script");
    script.id = DOTLOTTIE_SCRIPT_ID;
    script.type = "module";
    script.src = DOTLOTTIE_SCRIPT_SRC;
    document.head.appendChild(script);
}

window.addEventListener("scroll", () => {
    if (!positionUpdater) {
        positionUpdater = requestAnimationFrame(() => {
            updateSelectionUI();
            positionUpdater = null;
        });
    }
});

window.addEventListener("resize", updateSelectionUI);

document.addEventListener("mouseup", (e) => {
    // Escape check if interacting directly with the shared toolbar, output window, or drawing board context
    if (e.target.id === "ai-btn" || e.target.closest("#ai-toolbar") || e.target.closest("#ai-popup") || e.target.closest("#snb-screenshot-overlay")) return;

    const text = window.getSelection().toString().trim();
    showTextToolbar(text);
});

function showTextToolbar(selectedText) {
    clearComponents();
    if (!selectedText) return;

    const selection = window.getSelection();
    activeRange = selection.rangeCount ? selection.getRangeAt(0).cloneRange() : null;

    if (activeRange) {
        showSelectionHighlights(activeRange);
    }

    // Assemble the baseline structural layout rules via shared UI component engines
    const toolbar = UI.createToolbarContainer();
    const btn = UI.createActionButton();
    const promptInput = UI.createPromptInput("Ask about selection...");

    const submitPrompt = () => {
        const prompt = promptInput.value.trim() || DEFAULT_PROMPT;
        clearComponents();
        activeRange = null;
        explain(selectedText, prompt);
    };

    btn.onclick = (e) => {
        e.preventDefault(); e.stopPropagation();
        submitPrompt();
    };

    promptInput.onkeydown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault(); e.stopPropagation();
            submitPrompt();
        }
        if (e.key === "Escape") {
            clearComponents();
            activeRange = null;
        }
    };

    promptInput.oncopy = (e) => {
        if (promptInput.selectionStart !== promptInput.selectionEnd) return;
        e.preventDefault();
        e.clipboardData.setData("text/plain", selectedText);
    };

    toolbar.appendChild(btn);
    toolbar.appendChild(promptInput);
    document.body.appendChild(toolbar);

    updateSelectionUI();
    setTimeout(() => promptInput.focus(), 0);
}

function explain(text, prompt = DEFAULT_PROMPT, image = null) {
    lastExplainRequest = { text, prompt, image };
    showLoadingPopup();

    try {
        chrome.runtime.sendMessage({
            type: "EXPLAIN",
            text: text,
            prompt: prompt,
            image: image
        }, (response) => {
            const loadingPopup = document.getElementById("ai-popup");
            if (loadingPopup && loadingPopup.dataset.loading === "true") {
                loadingPopup.remove();
            }

            if (chrome.runtime.lastError || response?.answer?.includes("No API key configured")) {
                showApiKeyPopup();
                return;
            }

            if (!response || !response.answer) {
                showPopup("Error: Could not get explanation. Please check your API key.");
                return;
            }

            showPopup(response.answer);
        });
    } catch (error) {
        console.error("Error in explain():", error);
        const loadingPopup = document.getElementById("ai-popup");
        if (loadingPopup && loadingPopup.dataset.loading === "true") {
            loadingPopup.remove();
        }
        showPopup("Error: " + error.message);
    }
}

// Expose explain to window scope so screenshots.js orchestration execution path can call it cleanly
window.explain = explain;

function showLoadingPopup() {
    ensureDotLottieScript();
    clearComponents();

    const popup = UI.createPopupBase();
    popup.dataset.loading = "true";
    popup.className = "snb-state-loading";

    popup.innerHTML = UI.getLoadingTemplate(LOADING_LOTTIE_SRC);
    document.body.appendChild(popup);
}

function showApiKeyPopup() {
    clearComponents();

    const popup = UI.createPopupBase();
    popup.className = "snb-state-api";
    popup.innerHTML = UI.getApiKeyTemplate();

    const input = popup.querySelector("#api-key-input");
    const saveBtn = popup.querySelector("#save-api-key-btn");
    const errorDiv = popup.querySelector("#api-key-error");

    document.body.appendChild(popup);
    setTimeout(() => input.focus(), 100);

    saveBtn.onclick = async () => {
        const key = input.value.trim();

        if (!key || !key.startsWith("gsk_")) {
            if (errorDiv) {
                errorDiv.textContent = !key ? "Please enter an API key" : "API key should start with 'gsk_'";
                errorDiv.style.display = "block";
            }
            return;
        }

        try {
            await chrome.storage.sync.set({ groqKey: key });
            popup.remove();
            if (lastExplainRequest) {
                explain(lastExplainRequest.text, lastExplainRequest.prompt, lastExplainRequest.image);
            }
        } catch (error) {
            if (errorDiv) {
                errorDiv.textContent = "Error saving API key: " + error.message;
                errorDiv.style.display = "block";
            }
        }
    };

    input.onkeypress = (e) => {
        if (e.key === "Enter") saveBtn.click();
    };
}

function showPopup(text) {
    clearComponents();

    const popup = UI.createPopupBase();
    popup.className = "snb-state-explain";
    popup.innerHTML = UI.getPopupTemplate();

    const explanationTextEl = popup.querySelector("#explanation-text");
    if (window.formatLLMOutput) {
        // This injects our new native HTML details layout seamlessly
        explanationTextEl.innerHTML = window.formatLLMOutput(text);
        // REMOVED: window.initThinkingAccordions(popup);
    } else {
        explanationTextEl.textContent = text;
    }

    const copyBtn = popup.querySelector("#copy-btn");
    const closeBtn = popup.querySelector("#close-btn");

    if (closeBtn) closeBtn.onclick = () => clearComponents();

    if (copyBtn) {
        copyBtn.onclick = async () => {
            await navigator.clipboard.writeText(text);
            copyBtn.textContent = "Copied!";
            copyBtn.style.background = "#10b981";
            copyBtn.style.color = "#fff";
            copyBtn.style.borderColor = "#10b981";

            setTimeout(() => {
                copyBtn.textContent = "Copy to clipboard";
                copyBtn.removeAttribute("style");
            }, 1500);
        };
    }

    document.body.appendChild(popup);
}