chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrapeData") {
    try {
      const fullData = collectAllData();
      const response = {
        success: true,
        data: {
          name: fullData.basicInfo.name,
          rating: {
            score: fullData.basicInfo.rating.score,
            reviewCount: fullData.basicInfo.rating.reviewCount,
          },
          description: fullData.basicInfo.description,
          services: fullData.services
        }
      };
      sendResponse(response);
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
    return true;
  }
});

// Function to get the agency name
function scrapeAgencyName() {
  const agencyName = document.querySelector("h1.bold.h1.text-break-word")?.innerText || "No name found";
  console.log("Extracted Agency Name:", agencyName);
  return agencyName;
}

// Function to get the agency rating
function getAgencyRating() {
  const ratingContainer = document.querySelector('[data-testid="star-rating-5"]')?.closest('.layout-column.py-32');
  if (!ratingContainer) return null;

  return {
    score: ratingContainer.querySelector('.h1.bold')?.textContent || null,
    reviewCount: ratingContainer.querySelector('a span')?.textContent?.match(/\d+/)?.[0] || '0',
    scale: '5',  // Assuming it's always a 5-star system
    lastUpdated: new Date().toISOString()
  };
}

// Function to get the agency description
function getPerfectDescription() {
  const container = document.querySelector('[data-testid="clamp-lines"]');
  if (!container) return null;

  const clone = container.cloneNode(true);
  clone.querySelectorAll('a[role="button"]').forEach(btn => btn.remove());
  clone.querySelectorAll('br').forEach(br => br.replaceWith('\n\n'));
  clone.querySelectorAll('p').forEach(p => p.replaceWith('\n\n' + p.textContent + '\n\n'));
  clone.querySelectorAll('div').forEach(div => {
    if (div.textContent.trim().length > 0) {
      div.replaceWith('\n\n' + div.textContent + '\n\n');
    } else {
      div.remove();
    }
  });

  let text = clone.textContent
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  text = text
    .replace(/(English Below)/g, '\n\n$1\n\n')
    .replace(/(Notre expertise)/g, '\n\n$1\n\n')
    .replace(/(La méthode agile)/g, '\n\n$1\n\n')
    .replace(/(Galadrim is building)/g, '\n\n$1\n\n')
    .replace(/([.!?])( [A-ZÉÀÇ])/g, '$1\n\n$2')
    .replace(/\n /g, '\n')
    .replace(/\n{3,}/g, '\n\n');

  return text;
}

// Function to collect all data: name, rating, description, services
function collectAllData() {
  return {
    basicInfo: {
      name: scrapeAgencyName(),
      rating: getAgencyRating(),
      description: getPerfectDescription()
    },
    services: extractServices()
  };
}

// Function to extract services
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
