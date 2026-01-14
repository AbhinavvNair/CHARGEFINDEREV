let elements = {};

let currentStationId = null;
let lastGeocodeRequestTime = 0;
const geocodeQueue = [];

function initElements() {
    elements = {
        areaSelect: document.getElementById('areaSelect'),
        searchBtn: document.getElementById('searchBtn'),
        accessTypeFilter: document.getElementById('accessTypeFilter'),
        typeFilter: document.getElementById('typeFilter'),
        statusFilter: document.getElementById('statusFilter'),
        stationsList: document.getElementById('stationsList'),
        stationModal: document.getElementById('stationModal'),
        closeBtn: document.querySelector('.close-btn'),
        reviewForm: document.getElementById('reviewForm'),
        stars: document.querySelectorAll('.stars i') || [],
        modalStationName: document.getElementById('modalStationName'),
        modalAccessType: document.getElementById('modalAccessType'),
        modalChargingSpeed: document.getElementById('modalChargingSpeed'),
        modalAvailableSlots: document.getElementById('modalAvailableSlots'),
        modalOpeningHours: document.getElementById('modalOpeningHours'),
        modalWaitTime: document.getElementById('modalWaitTime'),
        modalBusiestHours: document.getElementById('modalBusiestHours'),
        modalAddress: document.getElementById('modalAddress'),
        modalPhone: document.getElementById('modalPhone'),
        modalOperator: document.getElementById('modalOperator'),
        modalConnectors: document.getElementById('modalConnectors'),
        modalPricing: document.getElementById('modalPricing'),
        modalAmenities: document.getElementById('modalAmenities'),
        modalPaymentMethods: document.getElementById('modalPaymentMethods'),
        modalSpecialInstructions: document.getElementById('modalSpecialInstructions'),
        reviewsList: document.getElementById('reviewsList'),
        modalLastUpdated: document.getElementById('modalLastUpdated') || { textContent: '' },
        reviewName: document.getElementById('reviewName'),
        reviewText: document.getElementById('reviewText'),
        reviewRating: document.getElementById('reviewRating')
    };

    if (!elements.stars) elements.stars = [];
}
// Initialize the page after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initElements();
    loadAllStations();
    setupEventListeners();

    // Add OpenStreetMap attribution
    const footer = document.querySelector('footer');
    if (footer) {
        footer.insertAdjacentHTML('beforeend', 
            '<div class="osm-attribution">Address data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a></div>'
        );
    }
});

function setupEventListeners() {
    if (elements.searchBtn) elements.searchBtn.addEventListener('click', handleSearch);
    if (elements.closeBtn) elements.closeBtn.addEventListener('click', closeModal);

    // Star rating functionality (guarded)
    if (elements.stars && elements.stars.length) {
        elements.stars.forEach(star => {
            if (!star) return;
            star.addEventListener('click', () => {
                const rating = parseInt(star.getAttribute('data-rating'));
                setStarRating(rating);
            });

            star.addEventListener('mouseover', () => {
                const rating = parseInt(star.getAttribute('data-rating'));
                highlightStars(rating);
            });

            star.addEventListener('mouseout', () => {
                const currentRating = parseInt(elements.reviewRating?.value) || 0;
                highlightStars(currentRating);
            });
        });
    }

    // Review form submission (guarded)
    if (elements.reviewForm) elements.reviewForm.addEventListener('submit', handleReviewSubmit);
}

function highlightStars(rating) {
    elements.stars.forEach(star => {
        const starRating = parseInt(star.getAttribute('data-rating'));
        star.classList.toggle('hover', starRating <= rating);
    });
}

// Handle search button click
function handleSearch() {
    const area = elements.areaSelect.value;
    const status = elements.statusFilter?.value || '';
    
    if (area || status) {
        fetchFilteredStations(area, '', status, '');
    } else {
        loadAllStations();
    }
}

// Load all stations
async function loadAllStations() {
    try {
        showLoading();
        const response = await fetch(`${window.config.backendUrl}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const stations = await response.json();
        displayStations(stations);
    } catch (error) {
        showError("Failed to load stations. Please try again later.");
        console.error('Error loading stations:', error);
    }
}

// Fetch filtered stations
async function fetchFilteredStations(area, type, status, accessType) {
    try {
        showLoading();
        
        const params = new URLSearchParams();
        if (area) params.append('area', area);
        if (type) params.append('type', type);
        if (status) params.append('status', status);
        if (accessType) params.append('accessType', accessType);
        
        const response = await fetch(`${window.config.backendUrl}/search?${params.toString()}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const stations = await response.json();
        displayStations(stations);
    } catch (error) {
        showError('No stations found matching your criteria.');
        console.error('Error fetching filtered stations:', error);
    }
}

// Display stations in the list
function displayStations(stations) {
    if (!stations || stations.length === 0) {
        elements.stationsList.innerHTML = '<div class="no-results">No stations found matching your criteria.</div>';
        return;
    }
    
    elements.stationsList.innerHTML = stations.map(station => {
        const slots = typeof station.slots === 'number' ? station.slots : 0;
        const addressStr = station.address?.street && station.address?.area 
            ? `${station.address.area}, ${station.address.city || 'Jaipur'}`
            : (station.latitude && station.longitude ? "Loading address..." : "Address not available");
        const accessType = station.accessType || 'Public';
        const pricing = station.pricing?.perUnit ? `₹${station.pricing.perUnit}/kWh` : 'See details';
        
        return `
        <div class="station-card" data-id="${station._id}" 
             data-lat="${station.latitude || ''}" 
             data-lng="${station.longitude || ''}">
            <div class="station-header">
                <h3>${station.name}</h3>
                <span class="status ${getStatusClass(station.status)}">
                    <i class="fas ${getStatusIcon(station.status)}"></i> ${station.status}
                </span>
            </div>
            <div class="station-details">
                <p><i class="fas fa-bolt"></i> ${station.chargingSpeed || 'Not specified'}</p>
                <p><i class="fas fa-car-battery"></i> ${slots} slot${slots !== 1 ? 's' : ''} available</p>
                <p><i class="fas fa-rupee-sign"></i> ${pricing}</p>
                <p><i class="fas fa-clock"></i> ${station.openingHours || '24/7'}</p>
                <p><i class="fas fa-map-marker-alt"></i> ${addressStr}</p>
            </div>
            <button class="view-details-btn">View Details</button>
        </div>
        `;
    }).join('');
    
    // Load addresses for stations with coordinates
    document.querySelectorAll('.station-card').forEach(card => {
        const lat = card.dataset.lat;
        const lng = card.dataset.lng;
        const addressElement = card.querySelector('.fa-map-marker-alt').parentElement;
        
        if (lat && lng && addressElement.textContent.includes('Loading')) {
            throttledGeocode(lat, lng)
                .then(address => {
                    addressElement.textContent = address;
                    card.dataset.address = address;
                })
                .catch(() => {
                    addressElement.textContent = "Address unavailable";
                });
        }
    });

    // Add click event to station cards and buttons
    document.querySelectorAll('.station-card, .view-details-btn').forEach(element => {
        element.addEventListener('click', (event) => {
            if (event.target.classList.contains('view-details-btn')) {
                event.stopPropagation();
            }
            
            const card = event.target.closest('.station-card');
            if (card) {
                const stationId = card.getAttribute('data-id');
                openStationModal(stationId);
            }
        });
    });
}

function getStatusClass(status) {
    const statusMap = {
        'available': 'available',
        'busy': 'busy',
        'repair': 'repair',
        'default': 'unknown'
    };
    return statusMap[status.toLowerCase()] || statusMap['default'];
}

function getStatusIcon(status) {
    const iconMap = {
        'available': 'fa-check-circle',
        'busy': 'fa-hourglass-half',
        'repair': 'fa-tools',
        'default': 'fa-question-circle'
    };
    return iconMap[status.toLowerCase()] || iconMap['default'];
}

// Open station details modal
async function openStationModal(stationId) {
    try {
        currentStationId = stationId;
        showModalLoading();
        elements.stationModal.style.display = 'block';
        
        // Fetch station details
        const stationResponse = await fetch(`${window.config.backendUrl}/${stationId}`);
        if (!stationResponse.ok) throw new Error('Failed to load station details');
        const station = await stationResponse.json();
        
        // Fetch reviews
        const reviewsResponse = await fetch(`${window.config.backendUrl}/${stationId}/reviews`);
        const reviews = reviewsResponse.ok ? await reviewsResponse.json() : [];
        
        // Display data in modal
        populateModal(station, reviews);
    } catch (error) {
        console.error('Error opening station modal:', error);
        showModalError('Failed to load station details. Please try again.');
    }
}

async function populateModal(station, reviews) {
    // Station details with fallbacks
    elements.modalStationName.textContent = station.name || "Unnamed Station";
    
    // Access Type Badge
    const accessType = station.accessType || 'Public';
    if (elements.modalAccessType) {
        elements.modalAccessType.textContent = accessType;
        elements.modalAccessType.className = `modal-access-badge ${accessType.toLowerCase().replace('-', '')}`;
    }
    
    // Basic Info - Only essential details
    elements.modalChargingSpeed.textContent = station.chargingSpeed || "Not specified";
    const slots = typeof station.slots === 'number' ? station.slots : 0;
    elements.modalAvailableSlots.textContent = `${slots} slot${slots !== 1 ? 's' : ''} available`;
    elements.modalOpeningHours.textContent = station.openingHours || '24/7';
    
    // Address - simplified
    if (station.address) {
        const addr = station.address;
        const simpleAddress = [addr.area, addr.city].filter(Boolean).join(', ');
        elements.modalAddress.textContent = simpleAddress || "Address not available";
    } else {
        elements.modalAddress.textContent = "Address not available";
    }
    
    // Contact - Only phone
    if (elements.modalPhone) elements.modalPhone.textContent = station.contact?.phone || 'Not available';
    
    // Connectors - display as a single line with label
    if (elements.modalConnectors && station.connectorTypes?.length) {
        const connectorText = station.connectorTypes.map(conn => 
            `${conn.type} (${conn.powerOutput})`
        ).join(', ');
        elements.modalConnectors.innerHTML = `<p><i class="fas fa-plug"></i> <strong>Charger Type:</strong> ${connectorText}</p>`;
    } else if (elements.modalConnectors) {
        elements.modalConnectors.innerHTML = '<p><i class="fas fa-plug"></i> <strong>Charger Type:</strong> Not available</p>';
    }
    
    // Pricing - display as a single line with label
    if (elements.modalPricing && station.pricing) {
        elements.modalPricing.innerHTML = `<p><i class="fas fa-rupee-sign"></i> <strong>Rate:</strong> ₹${station.pricing.perUnit || 'N/A'}/kWh</p>`;
    } else if (elements.modalPricing) {
        elements.modalPricing.innerHTML = '<p><i class="fas fa-rupee-sign"></i> <strong>Rate:</strong> Not available</p>';
    }
    
    // Hide unnecessary sections
    if (elements.modalWaitTime && elements.modalWaitTime.parentElement) elements.modalWaitTime.parentElement.style.display = 'none';
    if (elements.modalBusiestHours && elements.modalBusiestHours.parentElement) elements.modalBusiestHours.parentElement.style.display = 'none';
    if (elements.modalOperator && elements.modalOperator.parentElement) elements.modalOperator.parentElement.style.display = 'none';
    if (elements.modalAmenities && elements.modalAmenities.parentElement) elements.modalAmenities.parentElement.style.display = 'none';
    if (elements.modalPaymentMethods && elements.modalPaymentMethods.parentElement) elements.modalPaymentMethods.parentElement.style.display = 'none';
    if (elements.modalSpecialInstructions) elements.modalSpecialInstructions.style.display = 'none';
    
    // Reviews
    displayReviews(reviews);
}

// Free OpenStreetMap geocoding with rate limiting
async function geocodeWithNominatim(lat, lng) {
    const now = Date.now();
    const timeSinceLast = now - lastGeocodeRequestTime;
    
    // Respect 1 request/second limit
    if (timeSinceLast < 1000) {
        await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLast));
    }
    
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        lastGeocodeRequestTime = Date.now();
        
        if (!response.ok) {
            throw new Error(`Geocoding failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Format address from components
        const addr = data.address;
        const addressParts = [
            addr?.road,
            addr?.neighbourhood,
            addr?.suburb,
            addr?.city || 'Jaipur',
            addr?.state || 'Rajasthan',
            addr?.postcode
        ].filter(Boolean);
        
        return addressParts.join(', ') || "Address not found";
    } catch (error) {
        console.error("Geocoding error:", error);
        throw error;
    }
}

// Queue-based throttling for geocoding
function throttledGeocode(lat, lng) {
    return new Promise((resolve, reject) => {
        geocodeQueue.push({ lat, lng, resolve, reject });
        processGeocodeQueue();
    });
}

function processGeocodeQueue() {
    if (geocodeQueue.length === 0) return;
    
    const now = Date.now();
    const timeSinceLast = now - lastGeocodeRequestTime;
    
    if (timeSinceLast >= 1000) {
        const { lat, lng, resolve, reject } = geocodeQueue.shift();
        lastGeocodeRequestTime = now;
        
        geocodeWithNominatim(lat, lng)
            .then(resolve)
            .catch(reject)
            .finally(processGeocodeQueue);
    } else {
        setTimeout(processGeocodeQueue, 1000 - timeSinceLast);
    }
}

function displayReviews(reviews) {
    if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
        elements.reviewsList.innerHTML = '<div class="no-reviews">No reviews available for this station.</div>';
        return;
    }
    
    elements.reviewsList.innerHTML = reviews.map(review => {
        const userName = review.user || review.name || 'Anonymous';
        const reviewText = review.text || review.review || 'No review text';
        const rating = Math.min(5, Math.max(0, Number(review.rating) || 0));
        const dateString = review.createdAt || review.date || new Date().toISOString();
        
        return `
        <div class="review-item">
            <div class="review-header">
                <span class="review-author">${userName}</span>
                <span class="review-date">${formatISODate(dateString)}</span>
            </div>
            <div class="review-stars">
                ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}
            </div>
            <div class="review-text">${reviewText}</div>
        </div>
        `;
    }).join('');
}

function formatISODate(isoString) {
    if (!isoString) return 'Date not available';
    
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return 'Date not available';
        
        return date.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    } catch (e) {
        console.error('Date formatting error:', e);
        return 'Date not available';
    }
}

async function handleReviewSubmit(e) {
    e.preventDefault();
    
    const name = elements.reviewName.value.trim();
    const text = elements.reviewText.value.trim();
    const rating = elements.reviewRating.value;
    
    if (!validateReviewForm(name, text, rating)) {
        return;
    }
    
    try {
        const response = await fetch(`${window.config.backendUrl}/${currentStationId}/reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user: name,
                text: text,
                rating: parseInt(rating),
                date: new Date().toISOString()
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to submit review');
        }
        
        // Refresh reviews
        const reviewsResponse = await fetch(`${window.config.backendUrl}/${currentStationId}/reviews`);
        const reviews = await reviewsResponse.json();
        displayReviews(reviews);
        
        // Reset form
        e.target.reset();
        setStarRating(0);
        
        // Show success message
        showModalMessage('Thank you for your review!');
        
    } catch (error) {
        console.error('Error submitting review:', error);
        showModalError('Failed to submit review. Please try again.');
    }
}

function validateReviewForm(name, text, rating) {
    if (!name || name.length < 2) {
        alert('Please enter a valid name (at least 2 characters)');
        return false;
    }
    
    if (!text || text.length < 10) {
        alert('Please enter a meaningful review (at least 10 characters)');
        return false;
    }
    
    if (rating === '0') {
        alert('Please provide a rating');
        return false;
    }
    
    return true;
}

// Set star rating
function setStarRating(rating) {
    elements.stars.forEach(star => {
        const starRating = parseInt(star.getAttribute('data-rating'));
        star.classList.toggle('active', starRating <= rating);
        star.classList.toggle('far', starRating > rating);
        star.classList.toggle('fas', starRating <= rating);
    });
    elements.reviewRating.value = rating;
}

function showModalMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'success-message';
    messageElement.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <p>${message}</p>
    `;
    
    elements.reviewsList.prepend(messageElement);
    
    setTimeout(() => {
        messageElement.remove();
    }, 3000);
}

function showModalError(message) {
    elements.reviewsList.innerHTML = `
        <div class="error">
            <i class="fas fa-exclamation-circle"></i>
            <p>${message}</p>
        </div>
    `;
}

// UI Helper functions
function showLoading() {
    elements.stationsList.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading stations...</p>
        </div>
    `;
}

function showModalLoading() {
    elements.reviewsList.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading details...</p>
        </div>
    `;
}

function showError(message) {
    elements.stationsList.innerHTML = `
        <div class="error">
            <i class="fas fa-exclamation-circle"></i>
            <p>${message}</p>
        </div>
    `;
}

function closeModal() {
    elements.stationModal.style.display = 'none';
    if (elements.reviewForm) {
        elements.reviewForm.reset();
        setStarRating(0);
    }
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === elements.stationModal) {
        closeModal();
    }
});