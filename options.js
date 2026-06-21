const DEFAULT_HOTKEY_RECT = { key: "s", altKey: true, ctrlKey: false, shiftKey: false, metaKey: false };
const DEFAULT_HOTKEY_FULL = { key: "f", altKey: true, ctrlKey: false, shiftKey: false, metaKey: false };

function formatHotkey(hotkey) {
  if (!hotkey) return "None";
  const parts = [];
  if (hotkey.ctrlKey) parts.push("Ctrl");
  if (hotkey.altKey) parts.push("Alt");
  if (hotkey.shiftKey) parts.push("Shift");
  if (hotkey.metaKey) parts.push("Meta");
  
  let keyName = hotkey.key;
  if (keyName.length === 1) {
    keyName = keyName.toUpperCase();
  } else if (keyName.startsWith("Arrow")) {
    keyName = keyName.substring(5);
  }
  parts.push(keyName);
  return parts.join(" + ");
}

function setupHotkeyCapture(inputEl, storageKey, defaultVal) {
  // Load initial value
  chrome.storage.sync.get(storageKey).then((res) => {
    const hotkey = res[storageKey] || defaultVal;
    inputEl.value = formatHotkey(hotkey);
    inputEl.dataset.hotkey = JSON.stringify(hotkey);
  });

  inputEl.onkeydown = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const forbiddenKeys = ["control", "shift", "alt", "meta", "capslock", "escape"];
    const keyLower = e.key.toLowerCase();

    if (forbiddenKeys.includes(keyLower)) {
      let tempStr = "";
      if (e.ctrlKey) tempStr += "Ctrl + ";
      if (e.altKey) tempStr += "Alt + ";
      if (e.shiftKey) tempStr += "Shift + ";
      if (e.metaKey) tempStr += "Meta + ";
      inputEl.value = tempStr;
      return;
    }

    const hotkey = {
      key: e.key,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      shiftKey: e.shiftKey,
      metaKey: e.metaKey
    };

    inputEl.value = formatHotkey(hotkey);
    inputEl.dataset.hotkey = JSON.stringify(hotkey);
  };
}

// Load saved API key when page loads
document.addEventListener("DOMContentLoaded", async () => {
  const { groqKey } = await chrome.storage.sync.get("groqKey");
  if (groqKey) {
    document.getElementById("apiKey").value = groqKey;
  }

  setupHotkeyCapture(document.getElementById("hotkeyRect"), "screenshotHotkeyRect", DEFAULT_HOTKEY_RECT);
  setupHotkeyCapture(document.getElementById("hotkeyFull"), "screenshotHotkeyFull", DEFAULT_HOTKEY_FULL);
});

// Save settings
document.getElementById("save").onclick = async () => {
  const key = document.getElementById("apiKey").value;

  if (!key.trim()) {
    alert("Please enter an API key");
    return;
  }

  const rectHotkeyStr = document.getElementById("hotkeyRect").dataset.hotkey;
  const fullHotkeyStr = document.getElementById("hotkeyFull").dataset.hotkey;

  const rectHotkey = rectHotkeyStr ? JSON.parse(rectHotkeyStr) : DEFAULT_HOTKEY_RECT;
  const fullHotkey = fullHotkeyStr ? JSON.parse(fullHotkeyStr) : DEFAULT_HOTKEY_FULL;

  await chrome.storage.sync.set({
    groqKey: key,
    screenshotHotkeyRect: rectHotkey,
    screenshotHotkeyFull: fullHotkey
  });

  alert("Saved!");
};
