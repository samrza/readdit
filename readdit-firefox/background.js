let enabled = false;

browser.action.onClicked.addListener(async (tab) => {
  if (!tab.url.includes("reddit.com")) return;

  enabled = !enabled;

  if (enabled) {
    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
  } else {
    // simplest: just reload to restore original page
    browser.tabs.reload(tab.id);
  }
});
