let enabled = false;

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.url.includes("reddit.com")) return;

  enabled = !enabled;

  if (enabled) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
  } else {
    // simplest: just reload to restore original page
    chrome.tabs.reload(tab.id);
  }
});
