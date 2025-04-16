document.addEventListener('DOMContentLoaded', () => {
    const dataDisplay = document.getElementById('data-display');
    const downloadBtn = document.getElementById('download-btn');
  
    // Get current tab and send message to content script
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {action: "getData"}, (response) => {
        if (!response) {
          dataDisplay.innerHTML = "<p>No data found. Please navigate to a SortList agency page.</p>";
          downloadBtn.disabled = true;
          return;
        }
  
        displayData(response);
        setupDownload(response);
      });
    });
  
    function displayData(data) {
      let html = `
        <h3>${data.name}</h3>
        <p>Rating: ${data.score || 'N/A'}/5 (${data.reviewCount} reviews)</p>
        <p><strong>Description:</strong> ${data.description || 'Not available'}</p>
        <h4>Services (${data.services.length}):</h4>
      `;
  
      data.services.forEach(service => {
        html += `
          <div class="service">
            <p><strong>${service.serviceName}</strong></p>
            <p>Price: ${service.price}</p>
            <p>Experience: ${service.experienceLevel} | Rating: ${service.rating}</p>
            <p>Projects: ${service.projectsCount} | Reviews: ${service.reviewCount}</p>
            <p>Skills: ${service.skills.join(', ')}</p>
          </div>
        `;
      });
  
      dataDisplay.innerHTML = html;
    }
  
    function setupDownload(data) {
      downloadBtn.addEventListener('click', () => {
        const filename = `sortlist_${data.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.json`;
        
        chrome.runtime.sendMessage({
          action: "downloadJson",
          data: data,
          filename: filename
        });
      });
    }
  });