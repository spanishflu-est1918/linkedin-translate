const input = document.getElementById("apiUrl");
const saved = document.getElementById("saved");

chrome.storage.sync.get("apiUrl", (data) => {
  input.value = data.apiUrl || "http://localhost:8787";
});

let timeout;
input.addEventListener("input", () => {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    chrome.storage.sync.set({ apiUrl: input.value }, () => {
      saved.style.display = "block";
      setTimeout(() => (saved.style.display = "none"), 1500);
    });
  }, 500);
});
