// Global module configuration for local rendering engines
if (typeof markedKatex !== 'undefined') {
    window.marked.use(markedKatex({
        throwOnError: false,
        output: 'html' // Forces standard CSS layout tags instead of requiring external web fonts
    }));
}

window.formatLLMOutput = t => {
    let thinking = "";

    if (t.includes("<think>")) {
        if (t.includes("</think>")) {
            t = t.replace(/<think>([\s\S]*?)<\/think>/gi, (_, content) => {
                thinking = content.trim();
                return "";
            });
        } else {
            let parts = t.split("<think>");
            t = parts[0].trim();
            thinking = parts[1] ? parts[1].trim() : "";
        }
    }

    return `
    ${
        thinking
        ? `
        <details class="snb-thinking-accordion">
            <summary class="snb-thinking-header" style="cursor: pointer; user-select: none; outline: none;">
                Thinking traces
            </summary>
            <div class="snb-thinking-content">
                ${window.marked.parse(thinking)}
            </div>
        </details>
        `
        : ""
    }
    <div id="md-output">
        ${window.marked.parse(t)}
    </div>
    `;
};