chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "downloadJson") {
    downloadJson(request.data, request.filename);
  }
});

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  
  chrome.downloads.download({
    url: url,
    filename: filename,
    conflictAction: 'uniquify'
  }, () => {
    // Revoke the object URL after download
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}