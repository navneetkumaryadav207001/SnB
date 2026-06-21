console.log(window.marked.parse("**Parse is Working**"));


window.formatLLMOutput = t => {

    let thinking = "";

    // extract thinking traces
    t = t.replace(
        /<think>([\s\S]*?)<\/think>/gi,
        (_, content) => {
            thinking = content.trim();
            return "";
        }
    );


    return `

    <style>

        #md-output p {
            margin: 0 0 8px 0 !important;
            line-height: 1.55 !important;
        }


        #md-output h1,
        #md-output h2,
        #md-output h3 {
            margin: 14px 0 6px 0 !important;
            line-height: 1.3 !important;
        }


        #md-output ul,
        #md-output ol {
            margin: 6px 0 !important;
            padding-left: 20px !important;
        }


        #md-output li {
            margin: 3px 0 !important;
        }


        #md-output code {
            font-family: monospace !important;
            background: #111 !important;
            padding: 2px 5px !important;
            border-radius: 4px !important;
        }


        #md-output pre {
            background: #111 !important;
            padding: 12px !important;
            border-radius: 8px !important;
            overflow-x: auto !important;
        }


        .snb-thinking-header {
            color: #8f8f8f !important;
            font-size: 11px !important;
            font-family: monospace !important;
            cursor: pointer !important;
            padding: 8px 0 !important;
            user-select: none !important;
        }


        .snb-thinking-content {
            color: #666 !important;
            font-size: 12px !important;
            line-height: 1.4 !important;
            background: #111 !important;
            padding: 10px !important;
            border-radius: 8px !important;
            margin-bottom: 12px !important;
        }

    </style>


    ${
        thinking
        ?
        `
        <div class="snb-thinking-accordion">

            <div class="snb-thinking-header">
                ▸ Thinking traces
            </div>

            <div class="snb-thinking-content" hidden>
                ${window.marked.parse(thinking)}
            </div>

        </div>
        `
        :
        ""
    }


    <div id="md-output">

        ${window.marked.parse(t)}

    </div>

    `;
};



window.initThinkingAccordions = c => {

    let h = c.querySelector(".snb-thinking-header"),
        b = c.querySelector(".snb-thinking-content");


    if (h && b) {

        h.onclick = () => {

            b.hidden = !b.hidden;

            h.textContent =
                b.hidden
                ? "▸ Thinking traces"
                : "▾ Thinking traces";

        };

    }

};