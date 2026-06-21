chrome.runtime.onMessage.addListener(
  async (msg, sender, sendResponse) => {

    if (msg.type !== "EXPLAIN") return;

    const selectedText = msg.text || "";
    const userPrompt = (msg.prompt || "Explain simply").trim();

    console.log("Background: Received EXPLAIN request for text:", selectedText.substring(0, 50) + "...");
    console.log("Background: User prompt:", userPrompt);

    const result = await chrome.storage.sync.get("groqKey");
    const groqKey = result.groqKey;

    console.log("Background: Storage result:", result);
    console.log("Background: groqKey is", groqKey ? "present (length: " + groqKey.length + ")" : "NOT SET");

    // Check if API key is set
    if (!groqKey) {
      console.error("Background: No Groq API key found in storage");
      sendResponse({ answer: "Error: No API key configured. Please set your Groq API key in the extension options." });
      return true;
    }

    try {
      const res = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",

          headers: {
            "Authorization": `Bearer ${groqKey}`,
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",

            messages: [
              {
                role: "user",
                content: `context:${selectedText}\nprompt:${userPrompt}`
              }
            ]
          })
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Background: API error:", res.status, errorText);
        sendResponse({ answer: `Error: API request failed (${res.status}). ${errorText}` });
        return true;
      }

      const data = await res.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error("Background: Unexpected API response format:", data);
        sendResponse({ answer: "Error: Unexpected response from API." });
        return true;
      }

      console.log("Background: Successfully got response");
      sendResponse({
        answer: data.choices[0].message.content
      });

    } catch (error) {
      console.error("Background: Fetch error:", error.message);
      sendResponse({ answer: "Error: Could not connect to API. " + error.message });
    }

    return true;
});
