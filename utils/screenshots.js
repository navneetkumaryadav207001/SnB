// screenshots.js - Visual Selection Capture and Canvas Orchestrator
(function() {
    console.log("SnB screenshots.js loaded");

    const UI = window.SnB_UI;
    if (!UI) {
        console.error("Critical Dependency Error: window.SnB_UI context not found.");
        return;
    }

    // Hotkey settings
    const DEFAULT_HOTKEY_RECT = { key: "s", altKey: true, ctrlKey: false, shiftKey: false, metaKey: false }; // Alt + S
    const DEFAULT_HOTKEY_FULL = { key: "f", altKey: true, ctrlKey: false, shiftKey: false, metaKey: false }; // Alt + F

    let hotkeyRect = DEFAULT_HOTKEY_RECT;
    let hotkeyFull = DEFAULT_HOTKEY_FULL;

    function loadHotkeys() {
        chrome.storage.sync.get(["screenshotHotkeyRect", "screenshotHotkeyFull"], (res) => {
            if (res.screenshotHotkeyRect) hotkeyRect = res.screenshotHotkeyRect;
            if (res.screenshotHotkeyFull) hotkeyFull = res.screenshotHotkeyFull;
            console.log("Screenshots hotkeys initialized:", { rect: hotkeyRect, full: hotkeyFull });
        });
    }

    loadHotkeys();

    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === "sync") {
            if (changes.screenshotHotkeyRect) {
                hotkeyRect = changes.screenshotHotkeyRect.newValue || DEFAULT_HOTKEY_RECT;
                console.log("Updated hotkeyRect to:", hotkeyRect);
            }
            if (changes.screenshotHotkeyFull) {
                hotkeyFull = changes.screenshotHotkeyFull.newValue || DEFAULT_HOTKEY_FULL;
                console.log("Updated hotkeyFull to:", hotkeyFull);
            }
        }
    });

    function isHotkeyMatch(e, hotkeyObj) {
        if (!hotkeyObj) return false;
        if (e.ctrlKey !== !!hotkeyObj.ctrlKey) return false;
        if (e.altKey !== !!hotkeyObj.altKey) return false;
        if (e.shiftKey !== !!hotkeyObj.shiftKey) return false;
        if (e.metaKey !== !!hotkeyObj.metaKey) return false;
        return e.key.toLowerCase() === hotkeyObj.key.toLowerCase();
    }

    window.addEventListener("keydown", (e) => {
        if (document.activeElement && (
            document.activeElement.tagName === "INPUT" ||
            document.activeElement.tagName === "TEXTAREA" ||
            document.activeElement.isContentEditable
        )) {
            return;
        }

        if (isHotkeyMatch(e, hotkeyRect)) {
            e.preventDefault(); e.stopPropagation();
            captureAndStartDrawer();
        } else if (isHotkeyMatch(e, hotkeyFull)) {
            e.preventDefault(); e.stopPropagation();
            captureAndStartFull();
        }
    }, true);

    function captureAndStartDrawer() {
        chrome.runtime.sendMessage({ type: "CAPTURE_VISIBLE_TAB" }, (response) => {
            if (chrome.runtime.lastError || !response || !response.dataUrl) return;
            createDrawingOverlay(response.dataUrl);
        });
    }

    function captureAndStartFull() {
        chrome.runtime.sendMessage({ type: "CAPTURE_VISIBLE_TAB" }, (response) => {
            if (chrome.runtime.lastError || !response || !response.dataUrl) return;
            showScreenshotToolbar(response.dataUrl, null);
        });
    }

    function createDrawingOverlay(screenshotUrl) {
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        // Call factory for overlay layout context
        const { overlay, canvas } = UI.createScreenshotOverlay();
        document.body.appendChild(overlay);

        const ctx = canvas.getContext("2d");
        const dpr = window.devicePixelRatio || 1;

        let startX = 0, startY = 0, isDrawing = false, currentX = 0, currentY = 0;

        function resizeCanvas() {
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            ctx.scale(dpr, dpr);
            drawSelection(null, null, null, null);
        }

        window.addEventListener("resize", resizeCanvas);
        resizeCanvas();

        function drawSelection(sx, sy, cx, cy) {
            ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
            ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
            ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);

            if (sx !== null && sy !== null && cx !== null && cy !== null) {
                const x = Math.min(sx, cx), y = Math.min(sy, cy);
                const w = Math.abs(sx - cx), h = Math.abs(sy - cy);

                if (w > 0 && h > 0) {
                    ctx.clearRect(x, y, w, h);
                    ctx.strokeStyle = "rgba(0, 124, 240, 1)";
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x, y, w, h);

                    ctx.fillStyle = "rgba(0, 124, 240, 0.85)";
                    ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
                    const badgeText = `${w} x ${h}`;
                    const textWidth = ctx.measureText(badgeText).width;
                    const badgeY = y - 20 >= 10 ? y - 20 : y + 6;
                    ctx.fillRect(x, badgeY, textWidth + 8, 16);
                    ctx.fillStyle = "#ffffff";
                    ctx.fillText(badgeText, x + 4, badgeY + 12);
                }
            }
        }

        overlay.onmousedown = (e) => {
            if (e.button !== 0) return;
            startX = e.clientX; startY = e.clientY;
            isDrawing = true; currentX = startX; currentY = startY;
            drawSelection(startX, startY, currentX, currentY);
        };

        overlay.onmousemove = (e) => {
            if (!isDrawing) return;
            currentX = e.clientX; currentY = e.clientY;
            drawSelection(startX, startY, currentX, currentY);
        };

        overlay.onmouseup = (e) => {
            if (!isDrawing) return;
            isDrawing = false;
            window.removeEventListener("resize", resizeCanvas);

            const x = Math.min(startX, currentX), y = Math.min(startY, currentY);
            const w = Math.abs(startX - currentX), h = Math.abs(startY - currentY);

            overlay.remove();
            document.body.style.overflow = originalOverflow;
            document.removeEventListener("keydown", escapeHandler);

            if (w < 10 || h < 10) return;

            cropScreenshot(screenshotUrl, x, y, w, h, (croppedUrl) => {
                showScreenshotToolbar(croppedUrl, { left: x, top: y, width: w, height: h });
            });
        };

        function escapeHandler(e) {
            if (e.key === "Escape") {
                overlay.remove();
                document.body.style.overflow = originalOverflow;
                window.removeEventListener("resize", resizeCanvas);
                document.removeEventListener("keydown", escapeHandler);
            }
        }
        document.addEventListener("keydown", escapeHandler);
    }

    function cropScreenshot(dataUrl, x, y, w, h, callback) {
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext("2d");

            const scaleX = img.naturalWidth / window.innerWidth;
            const scaleY = img.naturalHeight / window.innerHeight;

            ctx.drawImage(img, x * scaleX, y * scaleY, w * scaleX, h * scaleY, 0, 0, w, h);
            callback(canvas.toDataURL("image/png"));
        };
    }

    function showScreenshotToolbar(imageUrl, rect) {
        document.getElementById("ai-toolbar")?.remove();

        const toolbar = UI.createToolbarContainer();
        toolbar.setAttribute("data-type", "screenshot"); // Context context signature tag
        
        const btn = UI.createActionButton();
        const input = UI.createPromptInput("Ask about screenshot...");

        const toolbarWidth = 320, toolbarHeight = 46;
        let leftPos = window.innerWidth / 2 - (toolbarWidth / 2);
        let topPos = window.innerHeight - 100;

        if (rect) {
            leftPos = rect.left + (rect.width / 2) - (toolbarWidth / 2);
            topPos = rect.top + rect.height + 10;

            if (leftPos + toolbarWidth > window.innerWidth - 10) leftPos = window.innerWidth - toolbarWidth - 10;
            if (leftPos < 10) leftPos = 10;
            if (topPos + toolbarHeight > window.innerHeight - 10) {
                topPos = rect.top - toolbarHeight - 10;
                if (topPos < 10) {
                    topPos = window.innerHeight - 100;
                    leftPos = window.innerWidth / 2 - (toolbarWidth / 2);
                }
            }
        }

        toolbar.style.left = `${leftPos}px`;
        toolbar.style.top = `${topPos}px`;

        const submitPrompt = () => {
            const prompt = input.value.trim() || "Explain this screenshot";
            cleanupToolbar();
            if (typeof explain === "function") {
                explain("", prompt, imageUrl);
            }
        };

        const cleanupToolbar = () => {
            toolbar.remove();
            document.removeEventListener("mousedown", dismissHandler);
        };

        const dismissHandler = (e) => {
            if (!toolbar.contains(e.target)) {
                cleanupToolbar();
            }
        };

        btn.onclick = (e) => {
            e.preventDefault(); e.stopPropagation();
            submitPrompt();
        };

        input.onkeydown = (e) => {
            if (e.key === "Enter") {
                e.preventDefault(); e.stopPropagation();
                submitPrompt();
            }
            if (e.key === "Escape") {
                cleanupToolbar();
            }
        };

        toolbar.appendChild(btn);

        if (imageUrl) {
            const { container: thumbContainer, deleteBadge } = UI.createScreenshotThumbnail(imageUrl);
            deleteBadge.onclick = (e) => {
                e.stopPropagation();
                imageUrl = null;
                thumbContainer.remove();
            };
            toolbar.appendChild(thumbContainer);
        }

        toolbar.appendChild(input);
        document.body.appendChild(toolbar);

        // Scope listener exclusively to this active instance
        setTimeout(() => {
            input.focus();
            document.addEventListener("mousedown", dismissHandler);
        }, 100);
    }
})();