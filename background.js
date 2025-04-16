chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "downloadJson" && message.data && message.filename) {
    const blob = new Blob([JSON.stringify(message.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    chrome.downloads.download({
      url: url,
      filename: message.filename,
      saveAs: true
    });

    sendResponse({ success: true });
  }
});
