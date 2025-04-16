// Content Script - SortList Scraper

/**
 * Gets agency name from page
 * @returns {string} Agency name
 */
function getAgencyName() {
  return document.querySelector('h1.bold.h1.text-break-word')?.textContent.trim();
}

/**
 * Extracts rating data from SortList agency profile
 * @returns {Object} Contains score, reviewCount, and scale
 */
function getAgencyRating() {
  // 1. Find the main rating container
  const ratingContainer = document.querySelector('[data-testid="star-rating-5"]')?.closest('.layout-column.py-32');
  if (!ratingContainer) return null;

  // 2. Extract all data points
  return {
    score: ratingContainer.querySelector('.h1.bold')?.textContent || null,
    reviewCount: ratingContainer.querySelector('a span')?.textContent?.match(/\d+/)?.[0] || '0',
    scale: '5', // Hardcoded as SortList always uses 5-star system
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Extracts and cleans the agency description
 * @returns {string} Formatted description text
 */
function getPerfectDescription() {
  const container = document.querySelector('[data-testid="clamp-lines"]');
  if (!container) return null;

  // Create working copy
  const clone = container.cloneNode(true);
  
  // Clean unwanted elements
  clone.querySelectorAll('a[role="button"]').forEach(btn => btn.remove());
  
  // Convert HTML breaks to newlines and paragraphs
  clone.querySelectorAll('br').forEach(br => br.replaceWith('\n\n'));
  clone.querySelectorAll('p').forEach(p => p.replaceWith('\n\n' + p.textContent + '\n\n'));
  clone.querySelectorAll('div').forEach(div => {
    if (div.textContent.trim().length > 0) {
      div.replaceWith('\n\n' + div.textContent + '\n\n');
    } else {
      div.remove();
    }
  });
  
  // Get raw text and clean it
  let text = clone.textContent
    .replace(/ /g, ' ')       // Replace non-breaking spaces
    .replace(/\s+/g, ' ')     // Collapse multiple spaces
    .trim();
  
  // Enhanced formatting
  text = text
    // Add paragraph breaks after headings
    .replace(/(English Below)/g, '\n\n$1\n\n')
    .replace(/(Notre expertise)/g, '\n\n$1\n\n')
    .replace(/(La méthode agile)/g, '\n\n$1\n\n')
    .replace(/(Galadrim is building)/g, '\n\n$1\n\n')
    // Normalize sentence spacing
    .replace(/([.!?])( [A-ZÉÀÇ])/g, '$1\n\n$2')
    // Clean up whitespace
    .replace(/\n /g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
    
  return text;
}

/**
 * Extracts services information
 * @returns {Array} List of services with details
 */
function extractServices() {
  const services = [];
  const serviceElements = document.querySelectorAll('li.layout-column.layout-align-start-stretch');
  
  serviceElements.forEach(serviceEl => {
    // Extract basic info
    const serviceName = serviceEl.querySelector('.bold.h6.text-truncate')?.textContent.trim() || 'N/A';
    const price = serviceEl.querySelector('.small.width-100.text-truncate .bold')?.textContent.trim() || 'N/A';
    
    // Extract experience level (count filled dots)
    const experienceDots = Array.from(serviceEl.querySelectorAll('[data-testid="FiberManualRecordIcon"]'))
      .filter(dot => !dot.classList.contains('text-secondary-300'));
    const experienceLevel = experienceDots.length;
    
    // Extract rating (count filled stars in rating section)
    const ratingContainer = serviceEl.querySelector('[data-testid="star-rating-5"]');
    const rating = ratingContainer ? 
      ratingContainer.querySelectorAll('[data-testid="StarIcon"].text-warning-500').length : 0;
    
    // Extract counts
    const reviewCount = parseInt(serviceEl.querySelector('.small.m-4')?.textContent.match(/\d+/)?.[0] || 0);
    const projectsCount = parseInt(serviceEl.querySelector('.underline span')?.textContent.match(/\d+/)?.[0] || 0);
    
    // Extract details section
    const detailsSection = serviceEl.querySelector('.hide.p-gt-xs-32.p-8.bg-secondary-100');
    let description = 'N/A';
    let skills = [];
    
    if (detailsSection) {
      // Extract description
      const descEl = detailsSection.querySelector('[data-testid="clamp-lines"]');
      if (descEl) {
        description = descEl.textContent.replace(/\s+/g, ' ').trim();
      }
      
      // Extract skills (limit to 10)
      skills = Array.from(detailsSection.querySelectorAll('.mr-8.mb-8.bg-secondary-300.rounded-xs'))
        .slice(0, 10)
        .map(el => el.textContent.trim().replace(/\s+/g, ' '));
    }
    
    services.push({
      serviceName,
      description,
      price: price.includes('€') ? price : `${price} €/project`,
      experienceLevel: `${experienceLevel}/10`,
      rating: `${rating}/5`,
      reviewCount,
      projectsCount,
      skills
    });
  });
  
  return services;
}

/**
 * Collects all agency data into a single object
 * @returns {Object} Complete agency profile data
 */
function collectAllData() {
  return {
    basicInfo: {
      name: getAgencyName(),
      ...getAgencyRating(),
      description: getPerfectDescription()
    },
    services: extractServices(),
    meta: {
      scrapedAt: new Date().toISOString(),
      sourceUrl: window.location.href
    }
  };
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getAgencyData") {
    try {
      if (!window.location.href.includes('sortlist.fr/agency/')) {
        throw new Error('Not on a SortList agency profile page');
      }
      
      const agencyData = collectAllData();
      
      if (!agencyData.basicInfo.name) {
        throw new Error('Failed to detect agency profile data');
      }
      
      sendResponse({ success: true, data: agencyData });
    } catch (error) {
      sendResponse({ 
        success: false, 
        error: error.message,
        details: 'Please navigate to a SortList agency profile page first.'
      });
    }
  }
  return true; // Keep the message channel open for async response
});

// Initial check when injected
if (window.location.href.includes('sortlist.fr/agency/')) {
  console.log('SortList Scraper content script loaded on agency profile');
}