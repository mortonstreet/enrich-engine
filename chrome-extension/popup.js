const DEFAULT_URL = "http://localhost:3000";
const input = document.getElementById("dialerUrl");
const saveBtn = document.getElementById("save");
const status = document.getElementById("status");

// Load saved URL
chrome.storage.sync.get({ dialerUrl: DEFAULT_URL }, (settings) => {
  input.value = settings.dialerUrl;
});

function showStatus(message, isError) {
  status.textContent = message;
  status.hidden = false;
  status.className = "status" + (isError ? " error" : "");
  setTimeout(() => {
    status.hidden = true;
  }, 2000);
}

saveBtn.addEventListener("click", () => {
  const url = input.value.trim().replace(/\/+$/, "");
  if (!url) {
    showStatus("Please enter a URL", true);
    return;
  }

  chrome.storage.sync.set({ dialerUrl: url }, () => {
    showStatus("Saved!");
  });
});

// Save on Enter key
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveBtn.click();
});
