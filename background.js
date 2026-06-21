chrome.runtime.onMessage.addListener(
  (msg, sender, sendResponse) => {
    if (msg.type === "CAPTURE_VISIBLE_TAB") {
      chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          console.error("Background capture error:", chrome.runtime.lastError.message);
          sendResponse({ error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ dataUrl: dataUrl });
        }
      });
      return true;
    }

    if (msg.type === "EXPLAIN") {
      handleExplain(msg, sendResponse);
      return true;
    }
  }
);

async function handleExplain(msg, sendResponse) {
  const selectedText = msg.text || "";
  const userPrompt = (msg.prompt || "Explain simply").trim();
  const image = msg.image;

  console.log("Background: Received EXPLAIN request, text length:", selectedText.length, "has image:", !!image);

  try {
    const result = await chrome.storage.sync.get("groqKey");
    const groqKey = result.groqKey;

    if (!groqKey) {
      console.error("Background: No Groq API key found in storage");
      sendResponse({ answer: "Error: No API key configured. Please set your Groq API key in the extension options." });
      return;
    }

    let model = "llama-3.3-70b-versatile";
    let contentVal;

    if (image) {
      model = "qwen/qwen3.6-27b";
      contentVal = [
        {
          type: "text",
          text: `context:${selectedText}\nprompt:${userPrompt}`
        },
        {
          type: "image_url",
          image_url: {
            url: image
          }
        }
      ];
    } else {
      contentVal = `context:${selectedText}\nprompt:${userPrompt}`;
    }

    const res = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: "user",
              content: contentVal
            }
          ]
        })
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Background: API error:", res.status, errorText);
      sendResponse({ answer: `Error: API request failed (${res.status}). ${errorText}` });
      return;
    }

    const data = await res.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error("Background: Unexpected API response format:", data);
      sendResponse({ answer: "Error: Unexpected response from API." });
      return;
    }

    console.log("Background: Successfully got response");
    sendResponse({
      answer: data.choices[0].message.content
    });

  } catch (error) {
    console.error("Background: Fetch error:", error.message);
    sendResponse({ answer: "Error: Could not connect to API. " + error.message });
  }
}
