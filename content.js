console.log("SnB content.js loaded");

document.addEventListener("mouseup", (e) => {
    // Don't show button if clicking on the button itself or popup
    if (e.target.id === "ai-btn" || e.target.closest("#ai-btn") || e.target.closest("#ai-popup")) {
        console.log("mouseup: Ignoring click on button/popup");
        return;
    }

    const text = window.getSelection().toString().trim();
    console.log("mouseup event, selected text:", text ? `"${text.substring(0, 30)}..."` : "(empty)");

    if (!text) return;

    showExplainButton(text);
});

function showExplainButton(selectedText) {
    console.log("showExplainButton called with text:", selectedText.substring(0, 30) + "...");

    const old = document.getElementById("ai-btn");
    if (old) old.remove();

    const btn = document.createElement("button");
    console.log("Button element created, appending to body");

    btn.id = "ai-btn";
    btn.textContent = "Explain AI";

    // Use inline styles with high specificity to override site CSS
    // Note: all: initial is NOT used here as it can reset display/visibility and hide the element
    btn.style.cssText = `
        position: fixed !important;
        z-index: 2147483647 !important;
        background: #0f4c75 !important;
        color: white !important;
        border: none !important;
        padding: 8px 12px !important;
        border-radius: 4px !important;
        cursor: pointer !important;
        font-weight: bold !important;
        font-size: 12px !important;
        font-family: Arial, sans-serif !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
        display: inline-block !important;
        visibility: visible !important;
        opacity: 1 !important;
        width: auto !important;
        height: auto !important;
        margin: 0 !important;
        text-decoration: none !important;
    `;

    document.body.appendChild(btn);
    console.log("Button appended to body, button element:", btn);

    try {
        const range = window.getSelection().getRangeAt(0);
        const rect = range.getBoundingClientRect();
        console.log("Selection range rect:", rect);

        // position: fixed uses viewport coords, getBoundingClientRect() already returns viewport coords
        // so we should NOT add scroll offsets
        const buttonWidth = 100; // approximate
        const viewportWidth = window.innerWidth;

        // If near right edge, position on left side of selection
        if (rect.right + buttonWidth > viewportWidth) {
            btn.style.left = `${Math.max(0, rect.left - buttonWidth - 10)}px`;
        } else {
            btn.style.left = `${rect.right + 10}px`;
        }

        // Position at top of selection (like a tooltip)
        btn.style.top = `${rect.top}px`;
        console.log("Button positioned at left:", btn.style.left, "top:", btn.style.top);
    } catch (e) {
        console.error("Error getting selection range:", e);
        // Fallback if no selection range
        btn.style.left = "50%";
        btn.style.top = "50%";
    }

    btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("Explain button clicked! Event:", e.type);
        console.log("Selected text for explanation:", selectedText);
        explain(selectedText);
    };
}

function explain(text) {
    console.log("explain() called with text:", text.substring(0, 50) + "...");

    // Show loading state
    showLoadingPopup();

    try {
        chrome.runtime.sendMessage({
            type: "EXPLAIN",
            text: text
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
    // Remove any existing popup
    const old = document.getElementById("ai-popup");
    if (old) old.remove();

    const popup = document.createElement("div");
    popup.id = "ai-popup";
    popup.dataset.loading = "true";

    // Set styles directly on the popup element to ensure visibility
    popup.style.cssText = `
        position: fixed !important;
        z-index: 2147483647 !important;
        width: 200px !important;
        background: white !important;
        border: 1px solid #ccc !important;
        padding: 20px !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
        font-family: Arial, sans-serif !important;
        font-size: 14px !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 12px !important;
        visibility: visible !important;
        opacity: 1 !important;
    `;

    popup.innerHTML = `
        <div class="spinner" style="width: 30px; height: 30px; border: 3px solid #f3f3f3; border-top: 3px solid #0f4c75; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <div style="color: #0f4c75; font-weight: bold;">Explaining...</div>
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

    const popup = document.createElement("div");
    popup.id = "ai-popup";

    // Set styles directly on the popup element to ensure visibility
    popup.style.cssText = `
        position: fixed !important;
        z-index: 2147483647 !important;
        width: 350px !important;
        background: white !important;
        border: 1px solid #ccc !important;
        padding: 16px !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
        font-family: Arial, sans-serif !important;
        font-size: 14px !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
    `;

    popup.innerHTML = `
        <div style="margin-bottom: 12px; font-weight: bold; color: #0f4c75; font-family: Arial, sans-serif;">
            ⚠️ API Key Required
        </div>
        <div style="margin-bottom: 12px; font-size: 13px; color: #333; font-family: Arial, sans-serif;">
            Please enter your Groq API key to use the explain feature.
        </div>
        <input type="password" id="api-key-input" placeholder="Enter Groq API Key (gsk_...)"
            style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 8px; font-size: 13px; box-sizing: border-box; font-family: Arial, sans-serif;">
        <button id="save-api-key-btn" style="width: 100%; padding: 8px; background: #0f4c75; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 13px; font-family: Arial, sans-serif;">
            Save & Explain
        </button>
        <div id="api-key-error" style="color: red; font-size: 12px; margin-top: 8px; display: none; font-family: Arial, sans-serif;"></div>
    `;

    console.log("Appending API key popup to body");
    document.body.appendChild(popup);
    console.log("API key popup appended, element:", popup);

    // Focus the input
    setTimeout(() => {
        const input = document.getElementById("api-key-input");
        if (input) input.focus();
    }, 100);

    // Save button handler
    document.getElementById("save-api-key-btn").onclick = async () => {
        const key = document.getElementById("api-key-input").value.trim();
        const errorDiv = document.getElementById("api-key-error");

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
            const selectedText = window.getSelection().toString().trim();
            if (selectedText) {
                explain(selectedText);
            }
        } catch (error) {
            errorDiv.textContent = "Error saving API key: " + error.message;
            errorDiv.style.display = "block";
        }
    };

    // Enter key handler
    document.getElementById("api-key-input").onkeypress = (e) => {
        if (e.key === "Enter") {
            document.getElementById("save-api-key-btn").click();
        }
    };
}

function showPopup(text) {
    console.log("showPopup called with text length:", text.length);

    const old = document.getElementById("ai-popup");
    if (old) old.remove();

    const popup = document.createElement("div");
    popup.id = "ai-popup";

    // Set styles directly on the popup element to ensure visibility
    popup.style.cssText = `
        position: fixed !important;
        z-index: 2147483647 !important;
        width: 400px !important;
        max-width: 90vw !important;
        max-height: 80vh !important;
        overflow-y: auto !important;
        background: white !important;
        border: 1px solid #ccc !important;
        padding: 16px !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
        font-family: Arial, sans-serif !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
        color: #333 !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
    `;

    popup.innerHTML = `
        <button id="copy-btn" style="width: 100%; padding: 8px; background: #0f4c75; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; margin-bottom: 12px; font-family: Arial, sans-serif;">Copy</button>
        <div style="word-wrap: break-word; white-space: pre-wrap;">${text}</div>
    `;

    console.log("Appending popup to body");
    document.body.appendChild(popup);
    console.log("Popup appended, element:", popup);

    document.getElementById("copy-btn").onclick = () => {
        navigator.clipboard.writeText(text);
        const copyBtn = document.getElementById("copy-btn");
        if (copyBtn) {
            copyBtn.textContent = "Copied!";
            setTimeout(() => { copyBtn.textContent = "Copy"; }, 1500);
        }
    };
}

document.addEventListener("mousedown", e => {
    // Remove popup if clicking outside (but not if clicking on the explain button)
    const popup = document.getElementById("ai-popup");
    const explainBtn = document.getElementById("ai-btn");

    // Don't remove if clicking on the explain button
    if (explainBtn && (e.target === explainBtn || explainBtn.contains(e.target))) {
        return;
    }

    // Remove popup if clicking outside of it
    if (popup && !popup.contains(e.target) && popup.dataset.loading !== "true") {
        popup.remove();
    }

    // Also remove the explain button if clicking elsewhere on the page
    if (explainBtn && !explainBtn.contains(e.target)) {
        // Don't remove if clicking inside a popup (to allow interaction)
        if (!popup || !popup.contains(e.target)) {
            explainBtn.remove();
        }
    }
});
