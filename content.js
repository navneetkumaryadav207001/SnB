console.log("SnB content.js loaded");

// Vercel Geist design system - inline SVG icon for button
const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="100%" height="100%"><g stroke="currentColor" stroke-width="14" stroke-linecap="round" fill="none"><line x1="82" y1="38" x2="82" y2="18"/><line x1="52" y1="52" x2="38" y2="38"/><line x1="40" y1="82" x2="18" y2="82"/><line x1="52" y1="112" x2="38" y2="126"/><line x1="112" y1="52" x2="126" y2="38"/></g><path fill="currentColor" d="M95 65 C82 65 73 77 77 89 L120 211 C124 223 140 224 145 212 L165 156 L222 137 C235 133 237 116 225 111 L104 66 C101 65 98 65 95 65 Z"/></svg>`;

// Vercel Geist design system colors
const GEIST = {
    ink: '#ededed',
    canvas: '#0a0a0a',
    canvasElevated: '#111111',
    hairline: '#2a2a2a',
    hairlineSoft: '#1f1f1f',
    body: '#c7c7c7',
    mute: '#8f8f8f',
    faint: '#666666',
    link: '#0070f3',
    primary: '#ededed',
    onPrimary: '#0a0a0a',
    gradientDevelopStart: '#007cf0',
    gradientDevelopEnd: '#00dfd8',
    gradientPreviewStart: '#7928ca',
    gradientPreviewEnd: '#ff0080',
    gradientShipStart: '#ff4d4d',
    gradientShipEnd: '#f9cb28',
};

const FONT_SANS = "Geist, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";
const FONT_MONO = "'Geist Mono', 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";
const FLOATING_SHADOW = "0 1px 1px rgba(0, 0, 0, 0.42), 0 18px 36px -18px rgba(0, 0, 0, 0.75), inset 0 0 0 1px rgba(255, 255, 255, 0.04)";
const DEFAULT_PROMPT = "Explain simply";
let lastExplainRequest = null;


let activeRange = null;
let positionUpdater = null;

function updateSelectionUI() {
    if (!activeRange) return;

    const toolbar = document.getElementById("ai-toolbar");
    if (!toolbar) return;

    // Update highlights
    showSelectionHighlights(activeRange);

    // Update toolbar position
    const rect = activeRange.getBoundingClientRect();

    const toolbarWidth = toolbar.offsetWidth || 276;
    const toolbarHeight = toolbar.offsetHeight || 44;

    let leftPos =
        rect.left +
        (rect.width / 2) -
        (toolbarWidth / 2);

    let topPos =
        rect.top -
        toolbarHeight -
        5;

    if (leftPos + toolbarWidth > window.innerWidth - 5) {
        leftPos = window.innerWidth - toolbarWidth - 5;
    }

    if (leftPos < 5) {
        leftPos = 5;
    }

    if (topPos < 5) {
        topPos = rect.bottom + 5;
    }

    toolbar.style.left = `${leftPos}px`;
    toolbar.style.top = `${topPos}px`;
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

function removeSelectionHighlights() {
    document.querySelectorAll(".snb-selection-highlight").forEach((highlight) => highlight.remove());
}

function showSelectionHighlights(range) {
    removeSelectionHighlights();

    Array.from(range.getClientRects()).forEach((rect) => {
        if (!rect.width || !rect.height) return;

        const highlight = document.createElement("div");
        highlight.className = "snb-selection-highlight";
        highlight.style.cssText = `
            position: fixed !important;
            z-index: 2147483645 !important;
            pointer-events: none !important;
            left: ${rect.left}px !important;
            top: ${rect.top}px !important;
            width: ${rect.width}px !important;
            height: ${rect.height}px !important;
            border-radius: 3px !important;
            background: rgba(0, 124, 240, 0.32) !important;
            box-shadow: 0 0 0 1px rgba(0, 223, 216, 0.24) !important;
        `;
        document.body.appendChild(highlight);
    });
}

const DOTLOTTIE_SCRIPT_ID = "dotlottie-wc-script";
const DOTLOTTIE_SCRIPT_SRC = "https://unpkg.com/@lottiefiles/dotlottie-wc@0.9.14/dist/dotlottie-wc.js";
const LOADING_LOTTIE_SRC = "https://lottie.host/9c818cf9-113f-4925-a279-5d6432465b90/zsUBC2pSGa.lottie";

function ensureDotLottieScript() {
    if (document.getElementById(DOTLOTTIE_SCRIPT_ID)) return;

    const script = document.createElement("script");
    script.id = DOTLOTTIE_SCRIPT_ID;
    script.type = "module";
    script.src = DOTLOTTIE_SCRIPT_SRC;
    document.head.appendChild(script);
}

document.addEventListener("mouseup", (e) => {
    // Don't show button if clicking on the button itself or popup
    if (e.target.id === "ai-btn" || e.target.closest("#ai-toolbar") || e.target.closest("#ai-popup")) {
        console.log("mouseup: Ignoring click on toolbar/popup");
        return;
    }

    const text = window.getSelection().toString().trim();
    console.log("mouseup event, selected text:", text ? `"${text.substring(0, 30)}..."` : "(empty)");

    // if (!text){
    //     return;
    // }

    // Pass mouse position to position button at cursor
    showExplainButton(text, e.clientX, e.clientY);
});

function showExplainButton(selectedText, mouseX, mouseY) {
    console.log("showExplainButton called with text:", selectedText.substring(0, 30) + "...");
    console.log("Mouse position: x =", mouseX, "y =", mouseY);

    const old = document.getElementById("ai-toolbar");
    if (old) old.remove();
    removeSelectionHighlights();

    if(!selectedText) return; //  dismiss

    const selection = window.getSelection();
    const selectedRange = selection.rangeCount
    ? selection.getRangeAt(0).cloneRange()
    : null;

    activeRange = selectedRange;

    if (selectedRange) {
        showSelectionHighlights(selectedRange);
    }

    const toolbar = document.createElement("div");
    toolbar.id = "ai-toolbar";

    toolbar.style.cssText = `
        position: fixed !important;
        z-index: 2147483647 !important;
        display: flex !important;
        align-items: center !important;
        gap: 0 !important;
        padding: 0 !important;
        border: 1px solid ${GEIST.hairline} !important;
        border-radius: 9999px !important;
        background: ${GEIST.canvasElevated} !important;
        box-shadow: ${FLOATING_SHADOW} !important;
        overflow: hidden !important;
        visibility: visible !important;
        opacity: 1 !important;
        margin: 0 !important;
    `;

    const btn = document.createElement("button");
    console.log("Button element created, appending to body");

    btn.id = "ai-btn";
    btn.type = "button";
    btn.title = "Ask AI";
    btn.setAttribute("aria-label", "Ask AI");
    // Use SVG icon instead of text
    btn.innerHTML = ICON_SVG;

    // Vercel Geist design system - light theme with near-white canvas
    btn.style.cssText = `
        background: ${GEIST.canvasElevated} !important;
        color: ${GEIST.ink} !important;
        border: none !important;
        border-right: 1px solid ${GEIST.hairline} !important;
        padding: 0 !important;
        border-radius: 9999px 0 0 9999px !important;
        cursor: pointer !important;
        font-weight: 500 !important;
        font-size: 14px !important;
        font-family: ${FONT_SANS} !important;
        box-shadow: ${FLOATING_SHADOW} !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        visibility: visible !important;
        opacity: 1 !important;
        width: 48px !important;
        height: 44px !important;
        flex: 0 0 48px !important;
        margin: 0 !important;
        transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease !important;
    `;

    const promptInput = document.createElement("input");
    promptInput.id = "ai-prompt-input";
    promptInput.type = "text";
    promptInput.placeholder = "Ask about selection...";
    promptInput.setAttribute("aria-label", "Prompt for selected text");
    promptInput.autocomplete = "off";
    promptInput.spellcheck = true;
    promptInput.style.cssText = `
        width: 220px !important;
        max-width: calc(100vw - 76px) !important;
        height: 44px !important;
        box-sizing: border-box !important;
        padding: 0 14px !important;
        border: none !important;
        border-radius: 0 9999px 9999px 0 !important;
        outline: none !important;
        background: ${GEIST.canvasElevated} !important;
        color: ${GEIST.ink} !important;
        font-family: ${FONT_SANS} !important;
        font-size: 13px !important;
        line-height: 18px !important;
        box-shadow: none !important;
        transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
    `;

    // Hover effect
    btn.onmouseenter = () => {
        btn.style.background = GEIST.ink;
        btn.style.color = GEIST.onPrimary;
        btn.style.borderColor = GEIST.ink;
        btn.style.boxShadow = '0 2px 2px rgba(0, 0, 0, 0.04), 0 12px 24px -8px rgba(0, 0, 0, 0.18)';
        btn.style.transform = 'translateY(-1px)';
    };
    btn.onmouseleave = () => {
        btn.style.background = GEIST.canvasElevated;
        btn.style.color = GEIST.ink;
        btn.style.borderColor = GEIST.hairline;
        btn.style.boxShadow = FLOATING_SHADOW;
        btn.style.transform = 'translateY(0)';
    };

    promptInput.onfocus = () => {
        toolbar.style.borderColor = GEIST.ink;
        toolbar.style.boxShadow = `${FLOATING_SHADOW}, 0 0 0 3px ${GEIST.hairlineSoft}`;
        if (selectedRange) showSelectionHighlights(selectedRange);
    };
    promptInput.onblur = () => {
        toolbar.style.borderColor = GEIST.hairline;
        toolbar.style.boxShadow = FLOATING_SHADOW;
    };

    toolbar.appendChild(btn);
    toolbar.appendChild(promptInput);
    document.body.appendChild(toolbar);
    console.log("Toolbar appended to body, element:", toolbar);

    // Position button just above the selected text, horizontally centered
    // try {
    //     const range = window.getSelection().getRangeAt(0);
    //     const rect = range.getBoundingClientRect();
    //     const toolbarWidth = toolbar.offsetWidth || 276;
    //     const toolbarHeight = toolbar.offsetHeight || 44;
    //     const viewportWidth = window.innerWidth;

    //     // Center horizontally on the selection, position above it
    //     let leftPos = rect.left + (rect.width / 2) - (toolbarWidth / 2);
    //     let topPos = rect.top - toolbarHeight - 5; // 5px above the selection

    //     // Keep button on screen - adjust if too close to edges
    //     if (leftPos + toolbarWidth > viewportWidth - 5) {
    //         leftPos = viewportWidth - toolbarWidth - 5;
    //     }
    //     if (leftPos < 5) {
    //         leftPos = 5;
    //     }
    //     if (topPos < 5) {
    //         // If not enough space above, position below instead
    //         topPos = rect.bottom + 5;
    //     }

    //     toolbar.style.left = `${leftPos}px`;
    //     toolbar.style.top = `${topPos}px`;
    //     console.log("Toolbar positioned at left:", toolbar.style.left, "top:", toolbar.style.top);
    // } catch (e) {
    //     console.error("Error getting selection range:", e);
    //     // Fallback: use mouse position
    //     const toolbarWidth = toolbar.offsetWidth || 276;
    //     const toolbarHeight = toolbar.offsetHeight || 44;
    //     let leftPos = mouseX - (toolbarWidth / 2);
    //     let topPos = mouseY - toolbarHeight - 5;
    //     if (topPos < 5) topPos = mouseY + 5;
    //     toolbar.style.left = `${leftPos}px`;
    //     toolbar.style.top = `${topPos}px`;
    // }
    updateSelectionUI();

    const submitPrompt = () => {
        const prompt = promptInput.value.trim() || DEFAULT_PROMPT;
        console.log("Selected text for explanation:", selectedText);
        console.log("User prompt:", prompt);
        toolbar.remove();
        activeRange = null;
        removeSelectionHighlights();
        explain(selectedText, prompt);
    };

    btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("Explain button clicked! Event:", e.type);
        submitPrompt();
    };

    promptInput.onkeydown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            submitPrompt();
        }
        if (e.key === "Escape") {
            toolbar.remove();
            activeRange = null;
            removeSelectionHighlights();
        }
    };

    setTimeout(() => promptInput.focus(), 0);
}

function explain(text, prompt = DEFAULT_PROMPT) {
    console.log("explain() called with text:", text.substring(0, 50) + "...");
    lastExplainRequest = { text, prompt };

    // Show loading state
    showLoadingPopup();

    try {
        chrome.runtime.sendMessage({
            type: "EXPLAIN",
            text: text,
            prompt: prompt
        }, (response) => {
            console.log("sendMessage callback received, response:", response);

            // Remove loading popup
            const loadingPopup = document.getElementById("ai-popup");
            if (loadingPopup && loadingPopup.dataset.loading === "true") {
                loadingPopup.remove();
            }

            // Check for runtime errors (e.g., extension context invalidated)
            if (chrome.runtime.lastError) {
                console.error("Extension error:", chrome.runtime.lastError.message);
                showApiKeyPopup();
                return;
            }

            // Check if response indicates no API key
            if (response && response.answer && response.answer.includes("No API key configured")) {
                console.log("API key not set, showing input popup");
                showApiKeyPopup();
                return;
            }

            // Check if response is valid
            if (!response || !response.answer) {
                console.error("Invalid response:", response);
                showPopup("Error: Could not get explanation. Please check your API key in options.");
                return;
            }

            console.log("Showing popup with answer:", response.answer.substring(0, 50) + "...");
            showPopup(response.answer);
        });
    } catch (error) {
        console.error("Error in explain():", error);
        // Remove loading popup
        const loadingPopup = document.getElementById("ai-popup");
        if (loadingPopup && loadingPopup.dataset.loading === "true") {
            loadingPopup.remove();
        }
        showPopup("Error: " + error.message);
    }
}

function showLoadingPopup() {
    ensureDotLottieScript();

    // Remove any existing popup
    const old = document.getElementById("ai-popup");
    if (old) old.remove();
    removeSelectionHighlights();

    const popup = document.createElement("div");
    popup.id = "ai-popup";
    popup.dataset.loading = "true";

    // Vercel Geist design system - light theme
    popup.style.cssText = `
        position: fixed !important;
        z-index: 2147483647 !important;
        width: 320px !important;
        background: ${GEIST.canvasElevated} !important;
        border: 1px solid ${GEIST.hairline} !important;
        padding: 18px 20px 20px !important;
        border-radius: 12px !important;
        box-shadow: ${FLOATING_SHADOW} !important;
        font-family: ${FONT_SANS} !important;
        font-size: 14px !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 6px !important;
        visibility: visible !important;
        opacity: 1 !important;
    `;

    popup.innerHTML = `
        <div style="width: 100%; height: 3px; border-radius: 9999px; background: linear-gradient(90deg, ${GEIST.gradientDevelopStart}, ${GEIST.gradientDevelopEnd}, ${GEIST.gradientPreviewStart}, ${GEIST.gradientPreviewEnd}, ${GEIST.gradientShipEnd}); margin-bottom: 8px;"></div>
        <dotlottie-wc src="${LOADING_LOTTIE_SRC}" style="width: 220px; height: 220px; display: block; margin-top: -8px;" autoplay loop>
            <div style="width: 32px; height: 32px; border: 2px solid ${GEIST.hairline}; border-top: 2px solid ${GEIST.ink}; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
        </dotlottie-wc>
        <div style="font-family: ${FONT_MONO}; color: ${GEIST.mute}; font-weight: 500; font-size: 11px; line-height: 16px; letter-spacing: 0; text-transform: uppercase;">SnB is thinking</div>
        <div style="color: ${GEIST.ink}; font-weight: 600; font-size: 15px; line-height: 22px; letter-spacing: -0.2px;">Explaining selected text</div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;

    document.body.appendChild(popup);
}

function showApiKeyPopup() {
    console.log("showApiKeyPopup called");

    // Remove any existing popup
    const old = document.getElementById("ai-popup");
    if (old) old.remove();
    removeSelectionHighlights();

    const popup = document.createElement("div");
    popup.id = "ai-popup";

    // Vercel Geist design system - light theme
    popup.style.cssText = `
        position: fixed !important;
        z-index: 2147483647 !important;
        width: 400px !important;
        max-width: 92vw !important;
        background: ${GEIST.canvasElevated} !important;
        border: 1px solid ${GEIST.hairline} !important;
        padding: 24px !important;
        border-radius: 12px !important;
        box-shadow: ${FLOATING_SHADOW} !important;
        font-family: ${FONT_SANS} !important;
        font-size: 14px !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
    `;

    popup.innerHTML = `
        <div style="width: 100%; height: 3px; border-radius: 9999px; background: linear-gradient(90deg, ${GEIST.gradientDevelopStart}, ${GEIST.gradientDevelopEnd}, ${GEIST.gradientPreviewStart}, ${GEIST.gradientPreviewEnd}, ${GEIST.gradientShipEnd}); margin-bottom: 18px;"></div>
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
            <div style="display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: ${GEIST.canvas}; border: 1px solid ${GEIST.hairline}; border-radius: 6px; color: ${GEIST.ink}; flex: 0 0 auto;">
                ${ICON_SVG}
            </div>
            <div>
                <div style="font-family: ${FONT_MONO}; color: ${GEIST.mute}; font-weight: 500; font-size: 11px; line-height: 16px; text-transform: uppercase;">Setup</div>
                <div style="font-weight: 600; color: ${GEIST.ink}; font-size: 20px; line-height: 28px; letter-spacing: -0.4px;">API key required</div>
            </div>
        </div>
        <div style="margin-bottom: 16px; color: ${GEIST.body}; font-size: 14px; line-height: 20px;">
            Please enter your Groq API key to use the explain feature.
        </div>
        <input type="password" id="api-key-input" placeholder="gsk_..."
            style="width: 100%; min-height: 40px; padding: 0 12px; border: 1px solid ${GEIST.hairline}; border-radius: 6px; margin-bottom: 12px; font-size: 14px; line-height: 20px; box-sizing: border-box; font-family: ${FONT_MONO}; color: ${GEIST.ink}; background: ${GEIST.canvasElevated}; outline: none; transition: border-color 0.15s, box-shadow 0.15s;">
        <button id="save-api-key-btn" style="width: 100%; min-height: 40px; padding: 0 14px; background: ${GEIST.primary}; color: ${GEIST.onPrimary}; border: 1px solid ${GEIST.primary}; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 14px; line-height: 20px; font-family: ${FONT_SANS}; transition: opacity 0.15s, transform 0.15s;">
            Save & Explain
        </button>
        <div id="api-key-error" style="color: #ee0000; font-size: 13px; line-height: 18px; margin-top: 12px; display: none; font-family: ${FONT_SANS};"></div>
    `;

    // Add input focus styling
    const input = popup.querySelector("#api-key-input");
    input.onfocus = () => {
        input.style.borderColor = GEIST.ink;
        input.style.boxShadow = `0 0 0 3px ${GEIST.hairlineSoft}`;
    };
    input.onblur = () => {
        input.style.borderColor = GEIST.hairline;
        input.style.boxShadow = 'none';
    };

    // Add button hover effect
    const saveBtn = popup.querySelector("#save-api-key-btn");
    saveBtn.onmouseenter = () => {
        saveBtn.style.opacity = '0.85';
        saveBtn.style.transform = 'translateY(-1px)';
    };
    saveBtn.onmouseleave = () => {
        saveBtn.style.opacity = '1';
        saveBtn.style.transform = 'translateY(0)';
    };

    console.log("Appending API key popup to body");
    document.body.appendChild(popup);
    console.log("API key popup appended, element:", popup);

    // Focus the input
    setTimeout(() => {
        input.focus();
    }, 100);

    // Save button handler
    saveBtn.onclick = async () => {
        const key = input.value.trim();
        const errorDiv = popup.querySelector("#api-key-error");

        if (!key) {
            errorDiv.textContent = "Please enter an API key";
            errorDiv.style.display = "block";
            return;
        }

        if (!key.startsWith("gsk_")) {
            errorDiv.textContent = "API key should start with 'gsk_'";
            errorDiv.style.display = "block";
            return;
        }

        try {
            // Save the API key
            await chrome.storage.sync.set({ groqKey: key });
            console.log("API key saved from popup");

            // Remove popup and retry explanation
            popup.remove();

            // Re-trigger the explain
            if (lastExplainRequest) {
                explain(lastExplainRequest.text, lastExplainRequest.prompt);
            }
        } catch (error) {
            errorDiv.textContent = "Error saving API key: " + error.message;
            errorDiv.style.display = "block";
        }
    };

    // Enter key handler
    input.onkeypress = (e) => {
        if (e.key === "Enter") {
            saveBtn.click();
        }
    };
}

function showPopup(text) {
console.log("showPopup called with text length:", text.length);
const old = document.getElementById("ai-popup");
if (old) old.remove();
removeSelectionHighlights();

const popup = document.createElement("div");
popup.id = "ai-popup";

popup.style.cssText = `
    position: fixed !important;
    z-index: 2147483647 !important;
    width: 460px !important;
    max-width: 90vw !important;
    height: 80vh !important;
    background: ${GEIST.canvasElevated} !important;
    border: 1px solid ${GEIST.hairline} !important;
    border-radius: 12px !important;
    box-shadow: ${FLOATING_SHADOW} !important;
    font-family: ${FONT_SANS} !important;
    color: ${GEIST.body} !important;

    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%) !important;

    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;

    visibility: visible !important;
    opacity: 1 !important;
`;

popup.innerHTML = `
    <div style="
        padding: 24px 24px 16px 24px;
        flex-shrink: 0;
    ">
        <div style="
            width: 100%;
            height: 3px;
            border-radius: 9999px;
            background: linear-gradient(
                90deg,
                ${GEIST.gradientDevelopStart},
                ${GEIST.gradientDevelopEnd},
                ${GEIST.gradientPreviewStart},
                ${GEIST.gradientPreviewEnd},
                ${GEIST.gradientShipEnd}
            );
            margin-bottom: 18px;
        "></div>

        <div style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
        ">
            <div style="
                display: flex;
                align-items: center;
                gap: 12px;
            ">
                <div style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 36px;
                    height: 36px;
                    background: ${GEIST.canvas};
                    border: 1px solid ${GEIST.hairline};
                    border-radius: 6px;
                    color: ${GEIST.ink};
                    flex: 0 0 auto;
                ">
                    ${ICON_SVG}
                </div>

                <div>
                    <div style="
                        font-family: ${FONT_MONO};
                        color: ${GEIST.mute};
                        font-weight: 500;
                        font-size: 11px;
                        text-transform: uppercase;
                    ">
                        Result
                    </div>

                    <div style="
                        font-weight: 600;
                        color: ${GEIST.ink};
                        font-size: 20px;
                        line-height: 28px;
                        letter-spacing: -0.4px;
                    ">
                        Explanation
                    </div>
                </div>
            </div>

            <button id="close-btn" style="
                width: 32px;
                height: 32px;
                border-radius: 6px;
                border: 1px solid ${GEIST.hairline};
                background: ${GEIST.canvasElevated};
                color: ${GEIST.ink};
                cursor: pointer;
                font-size: 18px;
                line-height: 1;
                flex-shrink: 0;
            ">
                ×
            </button>
        </div>
    </div>

    <div id="text-container" style="
        flex: 1;
        overflow-y: auto;
        min-height: 0;
        padding: 0 24px;
    ">
        <div id="explanation-text" style="
            white-space: pre-wrap;
            word-break: break-word;
            color: ${GEIST.body};
            font-size: 14px;
            line-height: 22px;
            padding-bottom: 16px;
        "></div>
    </div>

    <div style="
        flex-shrink: 0;
        padding: 16px 24px 24px;
        border-top: 1px solid ${GEIST.hairline};
    ">
        <button id="copy-btn" style="
            width: 100%;
            min-height: 40px;
            padding: 0 14px;
            background: ${GEIST.canvasElevated};
            color: ${GEIST.ink};
            border: 1px solid ${GEIST.hairline};
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            font-size: 14px;
            font-family: ${FONT_SANS};
            transition: background 0.15s, color 0.15s, border-color 0.15s, transform 0.15s;
        ">
            Copy to clipboard
        </button>
    </div>
`;

popup.querySelector("#explanation-text").textContent = text;

const copyBtn = popup.querySelector("#copy-btn");
const closeBtn = popup.querySelector("#close-btn");

closeBtn.onclick = () => {
    popup.remove();
    removeSelectionHighlights();
};

closeBtn.onmouseenter = () => {
    closeBtn.style.background = GEIST.canvas;
};

closeBtn.onmouseleave = () => {
    closeBtn.style.background = GEIST.canvasElevated;
};

copyBtn.onmouseenter = () => {
    copyBtn.style.background = GEIST.ink;
    copyBtn.style.color = GEIST.onPrimary;
    copyBtn.style.borderColor = GEIST.ink;
    copyBtn.style.transform = "translateY(-1px)";
};

copyBtn.onmouseleave = () => {
    copyBtn.style.background = GEIST.canvasElevated;
    copyBtn.style.color = GEIST.ink;
    copyBtn.style.borderColor = GEIST.hairline;
    copyBtn.style.transform = "translateY(0)";
};

copyBtn.onclick = async () => {
    await navigator.clipboard.writeText(text);

    copyBtn.textContent = "Copied!";
    copyBtn.style.background = "#10b981";
    copyBtn.style.color = "#fff";
    copyBtn.style.borderColor = "#10b981";

    setTimeout(() => {
        copyBtn.textContent = "Copy to clipboard";
        copyBtn.style.background = GEIST.canvasElevated;
        copyBtn.style.color = GEIST.ink;
        copyBtn.style.borderColor = GEIST.hairline;
    }, 1500);
};

document.body.appendChild(popup);

}
