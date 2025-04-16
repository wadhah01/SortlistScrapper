document.addEventListener('DOMContentLoaded', () => {
  const scrapeBtn = document.getElementById('scrapeBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const resultsDiv = document.getElementById('results');
  const errorDiv = document.getElementById('error');
  const agencyName = document.getElementById('agencyName');
  const agencyDetails = document.getElementById('agencyDetails');
  
  let scrapedData = null;

  scrapeBtn.addEventListener('click', async () => {
    try {
      scrapeBtn.disabled = true;
      scrapeBtn.textContent = 'Scraping...';
      errorDiv.classList.add('hidden');
      resultsDiv.classList.add('hidden');
      
      const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
      
      try {
        const response = await chrome.tabs.sendMessage(tab.id, {action: "scrapeData"});
        
        if (!response) {
          throw new Error('No response from content script');
        }
        
        if (response.success) {
          handleSuccess(response.data);
        } else {
          throw new Error(response.error || 'Unknown error occurred');
        }
      } catch (firstError) {
        console.log('First attempt failed, trying fallback:', firstError);
        
        await executeContentScript(tab.id);
        
        const response = await chrome.tabs.sendMessage(tab.id, {action: "scrapeData"});
        
        if (response?.success) {
          handleSuccess(response.data);
        } else {
          throw new Error(response?.error || 'Failed after retry');
        }
      }
    } catch (error) {
      showError(error.message);
    } finally {
      scrapeBtn.disabled = false;
      scrapeBtn.textContent = 'Scrape Agency Data';
    }
  });

  async function executeContentScript(tabId) {
    try {
      await chrome.scripting.executeScript({
        target: {tabId: tabId},
        files: ['content.js']
      });
    } catch (err) {
      console.error('Script injection failed:', err);
      throw new Error('Failed to inject content script');
    }
  }

  function handleSuccess(data) {
    scrapedData = data;
    displayData(data);
    resultsDiv.classList.remove('hidden');
  }

  function displayData(data) {
    agencyName.textContent = data.name;
    
    let html = `
      <p><strong>Rating:</strong> ${data.rating.score}/5 (${data.rating.reviewCount} reviews)</p>
      <p><strong>Description:</strong> ${data.description}</p>
      <h3>Services (${data.services.length})</h3>
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
    
    agencyDetails.innerHTML = html;
  }

  function showError(message) {
    errorDiv.textContent = `Error: ${message}`;
    errorDiv.classList.remove('hidden');
    console.error('Scraping error:', message);
  }

  downloadBtn.addEventListener('click', () => {
    if (!scrapedData) return;
    
    const filename = `sortlist_${scrapedData.name.replace(/[^\w]/g, '_')}.json`;
    chrome.runtime.sendMessage({
      action: "downloadJson",
      data: scrapedData,
      filename: filename
    });
  });
});
