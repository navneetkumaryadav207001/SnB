// Load saved API key when page loads
document.addEventListener("DOMContentLoaded", async () => {
  const { groqKey } = await chrome.storage.sync.get("groqKey");
  if (groqKey) {
    document.getElementById("apiKey").value = groqKey;
  }
});

// Save API key
document.getElementById("save").onclick = async () => {
  const key = document.getElementById("apiKey").value;

  if (!key.trim()) {
    alert("Please enter an API key");
    return;
  }

  await chrome.storage.sync.set({
    groqKey: key
  });

  alert("Saved!");
};
