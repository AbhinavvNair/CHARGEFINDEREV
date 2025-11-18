(function(){
  // ===== SMART CHATBOT v3.0 =====
  // Enhanced with AI-like intelligence: context memory, personalization, NLU, and proactive suggestions
  
  // ===== SMART CONTEXT & MEMORY SYSTEM =====
  const conversationContext = {
    lastQuery: null,
    lastStations: [],
    lastStation: null,
    lastAction: null,
    queryHistory: [],
    sessionStartTime: Date.now(),
    messageCount: 0,
    topics: [],
    pendingAction: null,
    compareFirst: null,
    followup: null
  };
  
  // User preferences and learning
  const userPreferences = {
    favoriteStations: [],
    vehicleType: null,
    preferredAmenities: [],
    priceRange: null,
    visitedStations: [],
    commonQueries: [],
    lastLocation: null
  };
  
  // Load user preferences from localStorage
  function loadUserPreferences() {
    try {
      const saved = localStorage.getItem('ev_user_preferences');
      if (saved) {
        const prefs = JSON.parse(saved);
        Object.assign(userPreferences, prefs);
      }
    } catch(e) {
      console.warn('Failed to load preferences:', e);
    }
  }
  
  // Save user preferences
  function saveUserPreferences() {
    try {
      localStorage.setItem('ev_user_preferences', JSON.stringify(userPreferences));
    } catch(e) {
      console.warn('Failed to save preferences:', e);
    }
  }
  
  // Learn from user interactions
  function learnFromInteraction(query, action, station) {
    conversationContext.queryHistory.push({ query, action, station, timestamp: Date.now() });
    
    // Track common queries
    const queryType = action || 'general';
    const existing = userPreferences.commonQueries.find(q => q.type === queryType);
    if (existing) {
      existing.count++;
    } else {
      userPreferences.commonQueries.push({ type: queryType, count: 1 });
    }
    
    // Track visited stations
    if (station && !userPreferences.visitedStations.includes(station)) {
      userPreferences.visitedStations.push(station);
    }
    
    saveUserPreferences();
  }
  
  // Get personalized recommendations
  function getPersonalizedSuggestions() {
    const suggestions = [];
    
    // Suggest based on favorites
    if (userPreferences.favoriteStations.length > 0) {
      suggestions.push({ label: `⭐ View Favorites`, value: 'show my favorites' });
    }
    
    // Suggest based on vehicle type
    if (userPreferences.vehicleType) {
      suggestions.push({ label: `🚗 Best for ${userPreferences.vehicleType}`, value: `best stations for ${userPreferences.vehicleType}` });
    }
    
    // Suggest based on preferred amenities
    if (userPreferences.preferredAmenities.length > 0) {
      const amenity = userPreferences.preferredAmenities[0];
      suggestions.push({ label: `🎯 Stations with ${amenity}`, value: `stations with ${amenity}` });
    }
    
    // Suggest based on recent visits
    if (userPreferences.visitedStations.length > 0) {
      const recent = userPreferences.visitedStations[userPreferences.visitedStations.length - 1];
      suggestions.push({ label: `🔄 Return to ${recent}`, value: `details for ${recent}` });
    }
    
    return suggestions.slice(0, 4);
  }
  
  const synonyms = {
    greeting: ['hello','hi','hey','yo','namaste','good morning','good evening'],
    duration: ['duration','how long','for how long','time length','length','charging time'],
    vehicle_type: ['vehicle type','vehicle','which vehicle','what vehicle','type of vehicle','ev type'],
    hours: ['hours','open','opening','when open','timings','schedule','timing','operational hours'],
    book: ['book','booking','reserve','reserve a slot','reservation','schedule slot'],
    price: ['price','cost','fee','charge','charges','rate','rates','pricing','how much','tariff'],
    nearby: ['nearby','near me','closest','closest to me','near','around me','proximity'],
    stations: ['stations','list stations','show stations','station list','all stations'],
    amenities: ['amenities','facilities','features','services','what facilities'],
    payment: ['payment','pay','payment methods','payment options','how to pay','accepted payments'],
    access: ['access','public','private','who can use','access type','available to'],
    contact: ['contact','phone','email','number','reach','call','operator'],
    parking: ['parking','park','parking space','parking available'],
    wifi: ['wifi','internet','wireless','wi-fi'],
    cafe: ['cafe','coffee','food','restaurant','cafeteria'],
    restroom: ['restroom','toilet','washroom','bathroom'],
    compare: ['compare','comparison','difference','versus','vs','which is better'],
    available: ['available','free','open now','vacancy','slots available'],
    fast: ['fast charging','rapid','quick charge','ultra fast','speed'],
    cheap: ['cheap','cheapest','affordable','low cost','budget','economical']
  };

  const defaultReplies = {
    greeting: "Hi! 👋 I'm your Jaipur EV charging assistant. I can help with:\n• Station search & booking\n• Pricing & amenities\n• Comparisons & recommendations\n\nWhat would you like to know?",
    duration: "Common charging session durations:\n⏱️ 30 minutes - Quick charge\n⏱️ 1 hour - Standard charge\n⏱️ 2 hours - Full charge",
    vehicle_type: "Supported vehicle types:\n🚗 Electric Car\n🏍️ Electric Bike\n🛵 Electric Scooter",
    hours: "I can show you operating hours for any station. Just tell me the station name!",
    book: "To book a charging slot, I can help you fill the booking form. Which station would you like to book?",
    price: "I can show you detailed pricing including peak/off-peak rates. Which station interests you?",
    nearby: "I can find the closest charging stations to you. Allow location access and I'll search for you!",
    support: "Need help? You can reach support through the Contact page or describe your issue to me."
  };

  // Enhanced compatibility map with more connector types
  const compatibilityMap = {
    car: ['CCS', 'CHAdeMO', 'Type 2', 'Bharat DC'],
    bike: ['Type 2', 'Type 1', 'Bharat AC'],
    scooter: ['Type 1', 'Type 2', 'Bharat AC']
  };
  
  // Amenity icons for rich display
  const amenityIcons = {
    restroom: '🚻',
    cafe: '☕',
    waitingArea: '🪑',
    wifi: '📶',
    parking: '🅿️',
    coveredParking: '🏠',
    security: '🔒',
    wheelchairAccessible: '♿'
  };
  
  // Payment method icons
  const paymentIcons = {
    'Cash': '💵',
    'Card': '💳',
    'UPI': '📱',
    'Wallet': '👛',
    'App': '📲'
  };

  // Calculate distance between two coordinates using Haversine formula
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Create widget DOM
  function createWidget() {
    // Toggle button
    const toggle = document.createElement('button');
    toggle.className = 'chatbot-toggle';
    toggle.innerHTML = '<i class="fas fa-comments"></i>';
    document.body.appendChild(toggle);

    // Window
    const win = document.createElement('div');
    win.className = 'chatbot-window';
    win.style.display = 'none';
    win.innerHTML = `
      <div class="chatbot-header"><i class="fas fa-robot"></i><strong> EV Assistant</strong></div>
      <div class="chatbot-messages" id="chatbotMessages"></div>
      <div class="chatbot-input">
        <input type="text" id="chatbotInput" placeholder="Type a question..." />
        <button id="chatbotSend">Send</button>
      </div>
      <div class="chatbot-footer-note">Tip: ask about bookings, hours, prices or 'list stations'</div>
    `;
    document.body.appendChild(win);

    return { toggle, win };
  }

  function addMessage(container, text, who='bot'){
    const el = document.createElement('div');
    el.className = 'msg ' + who;
    const bubble = document.createElement('span');
    bubble.className = 'bubble';
    // allow HTML for small UI bits like links/buttons
    bubble.innerHTML = text;
    el.appendChild(bubble);
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
    
    // Save to session storage
    saveChatHistory(container);
  }

  // Save chat history to session storage
  function saveChatHistory(container) {
    try {
      const messages = Array.from(container.querySelectorAll('.msg')).map(msg => ({
        type: msg.classList.contains('user') ? 'user' : 'bot',
        content: msg.querySelector('.bubble').innerHTML
      }));
      sessionStorage.setItem('chatbot_history', JSON.stringify(messages));
      sessionStorage.setItem('chatbot_timestamp', Date.now().toString());
    } catch (e) {
      console.warn('Failed to save chat history:', e);
    }
  }

  // Load chat history from session storage
  function loadChatHistory(container) {
    try {
      const history = sessionStorage.getItem('chatbot_history');
      const timestamp = sessionStorage.getItem('chatbot_timestamp');
      
      if (!history) return false;
      
      // Only load history if it's less than 1 hour old
      const age = Date.now() - parseInt(timestamp || '0');
      if (age > 3600000) { // 1 hour in milliseconds
        clearChatHistory();
        return false;
      }
      
      const messages = JSON.parse(history);
      if (messages && messages.length > 0) {
        messages.forEach(msg => {
          const el = document.createElement('div');
          el.className = 'msg ' + msg.type;
          const bubble = document.createElement('span');
          bubble.className = 'bubble';
          bubble.innerHTML = msg.content;
          el.appendChild(bubble);
          container.appendChild(el);
        });
        container.scrollTop = container.scrollHeight;
        return true;
      }
    } catch (e) {
      console.warn('Failed to load chat history:', e);
    }
    return false;
  }

  // Clear chat history
  function clearChatHistory() {
    try {
      sessionStorage.removeItem('chatbot_history');
      sessionStorage.removeItem('chatbot_timestamp');
    } catch (e) {
      console.warn('Failed to clear chat history:', e);
    }
  }

  // ===== SMART INTENT DETECTION =====
  function detectIntent(query) {
    const intents = [
      {
        patterns: [/cheaper/i, /less expensive/i, /save money/i, /budget/i],
        action: 'find_cheap',
        confidence: 0.9
      },
      {
        patterns: [/best/i, /top/i, /recommend/i, /suggest/i],
        action: 'recommend',
        confidence: 0.85
      },
      {
        patterns: [/fast/i, /quick/i, /rapid/i, /speedy/i],
        action: 'find_fast',
        confidence: 0.9
      },
      {
        patterns: [/open now/i, /available now/i, /can I charge now/i],
        action: 'find_available',
        confidence: 0.95
      },
      {
        patterns: [/compare.*with/i, /difference between/i, /which is better/i],
        action: 'compare',
        confidence: 0.9
      },
      {
        patterns: [/help/i, /how do/i, /what can you/i, /capabilities/i],
        action: 'help',
        confidence: 0.8
      }
    ];
    
    for (const intent of intents) {
      for (const pattern of intent.patterns) {
        if (pattern.test(query)) {
          return { action: intent.action, confidence: intent.confidence, params: extractParams(query) };
        }
      }
    }
    
    return { action: null, confidence: 0 };
  }
  
  // Extract parameters from query
  function extractParams(query) {
    const params = {};
    
    // Extract location
    const locationMatch = query.match(/(?:near|at|in)\s+([a-z\s]+?)(?:\s|$)/i);
    if (locationMatch) params.location = locationMatch[1].trim();
    
    // Extract price range
    const priceMatch = query.match(/under\s+(\d+)/i) || query.match(/less than\s+(\d+)/i);
    if (priceMatch) params.maxPrice = parseInt(priceMatch[1]);
    
    // Extract amenities
    if (query.includes('parking')) params.amenities = params.amenities || []; params.amenities.push('parking');
    if (query.includes('wifi')) params.amenities = params.amenities || []; params.amenities.push('wifi');
    if (query.includes('cafe')) params.amenities = params.amenities || []; params.amenities.push('cafe');
    
    return params;
  }
  
  // ===== TYPO CORRECTION & FUZZY MATCHING =====
  function correctTypos(query) {
    const corrections = {
      'prise': 'price', 'prcie': 'price', 'priice': 'price',
      'staton': 'station', 'staion': 'station', 'sation': 'station',
      'amenites': 'amenities', 'ammenities': 'amenities', 'amentities': 'amenities',
      'bokking': 'booking', 'boking': 'booking', 'bookin': 'booking',
      'nearb': 'nearby', 'neaby': 'nearby',
      'comparision': 'comparison', 'comapre': 'compare',
      'availabe': 'available', 'availble': 'available',
      'cheepest': 'cheapest', 'cheapst': 'cheapest',
      'fastst': 'fastest', 'fatest': 'fastest'
    };
    
    let corrected = query;
    for (const [typo, correct] of Object.entries(corrections)) {
      const regex = new RegExp(`\\b${typo}\\b`, 'gi');
      corrected = corrected.replace(regex, correct);
    }
    
    return corrected;
  }
  
  // Check if query is a follow-up
  function isFollowUpQuery(query) {
    const followUpIndicators = [
      /^(what about|how about|and)/i,
      /^(is it|does it|can I|do they)/i,
      /^(which one|that one|this one)/i,
      /^(more|tell me more|details)/i,
      /^(compare|versus|vs)/i,
      /^(book it|reserve it|take it)/i
    ];
    
    return followUpIndicators.some(pattern => pattern.test(query));
  }
  
  // Handle contextual follow-up queries
  function handleContextualQuery(query) {
    const lastStation = conversationContext.lastStation;
    const lastStations = conversationContext.lastStations;
    
    // "What about parking?" after viewing a station
    if (lastStation && /what about|how about/.test(query)) {
      if (/parking/.test(query)) return { type: 'check_amenity', station: lastStation, amenity: 'parking' };
      if (/wifi/.test(query)) return { type: 'check_amenity', station: lastStation, amenity: 'wifi' };
      if (/cafe/.test(query)) return { type: 'check_amenity', station: lastStation, amenity: 'cafe' };
      if (/price|cost/.test(query)) return { type: 'station_query', q: lastStation, field: 'price' };
      if (/hours|timing/.test(query)) return { type: 'station_query', q: lastStation, field: 'hours' };
    }
    
    // "Which one is cheaper?" after listing stations
    if (lastStations.length > 0 && /which one|which is/.test(query)) {
      if (/cheap|less expensive|affordable/.test(query)) {
        return { type: 'smart_intent', intent: 'find_cheap_from_context', params: { stations: lastStations } };
      }
      if (/fast|quick|rapid/.test(query)) {
        return { type: 'smart_intent', intent: 'find_fast_from_context', params: { stations: lastStations } };
      }
    }
    
    // "Book it" or "Take me there"
    if (lastStation && /book it|reserve it|take it|book that/.test(query)) {
      return { type: 'action', name: 'book_last', station: lastStation };
    }
    
    // "Compare them" after showing 2+ stations
    if (lastStations.length >= 2 && /compare them|compare these|compare all/.test(query)) {
      return { type: 'compare_stations', stations: lastStations.slice(0, 2) };
    }
    
    return null;
  }
  
  function findStationsList(){
    // Try to get station names from page lists or fetch API
    try {
      const nodes = document.querySelectorAll('.station-card h3, .station-card h2, .station-header h3');
      const names = Array.from(nodes).map(n => n.textContent.trim()).filter(Boolean);
      if (names.length) return names.slice(0, 10);
    } catch(e){}
    return [];
  }

  function replyTo(input){
    let text = input.trim();
    if (!text) return "Please type something so I can help.";

    // Apply typo correction
    const corrected = correctTypos(text);
    if (corrected !== text) {
      // Notify user about correction
      console.log(`Typo corrected: "${text}" -> "${corrected}"`);
    }
    text = corrected;

    const t = text.toLowerCase();
    
    // Track conversation context
    conversationContext.messageCount++;
    conversationContext.lastQuery = text;
    conversationContext.queryHistory.push({ query: text, timestamp: Date.now() });
    
    // ===== SMART CONTEXT-AWARE QUERIES =====
    // Handle follow-up questions without repeating context
    if (isFollowUpQuery(t)) {
      const contextual = handleContextualQuery(t);
      if (contextual) return contextual;
    }
    
    // ===== PERSONALIZATION QUERIES =====
    if (t.includes('my favorites') || t.includes('favorite stations')) {
      return { type: 'action', name: 'show_favorites' };
    }
    
    if (t.includes('set') && (t.includes('favorite') || t.includes('prefer'))) {
      const match = t.match(/set\s+(.+?)\s+as\s+favorite/i) || t.match(/add\s+(.+?)\s+to\s+favorites/i);
      if (match) {
        const station = match[1].trim();
        return { type: 'action', name: 'add_favorite', station };
      }
    }
    
    if (t.includes('my') && (t.includes('vehicle') || t.includes('car') || t.includes('bike'))) {
      const vehicleMatch = t.match(/my\s+vehicle\s+is\s+(car|bike|scooter)/i) || 
                          t.match(/i\s+have\s+a\s+(car|bike|scooter)/i) ||
                          t.match(/i\s+drive\s+a\s+(car|bike|scooter)/i);
      if (vehicleMatch) {
        userPreferences.vehicleType = vehicleMatch[1].toLowerCase();
        saveUserPreferences();
        return `✅ Got it! I'll remember you have a ${vehicleMatch[1]}. I can now give you personalized recommendations!`;
      }
    }
    
    // ===== SMART INTENT RECOGNITION =====
    const intent = detectIntent(t);
    if (intent.confidence > 0.7 && intent.action) {
      return { type: 'smart_intent', intent: intent.action, confidence: intent.confidence, params: intent.params };
    }

    // ===== BOOKING COMMAND =====
    // Check for complete booking command with all details
    const fullBookMatch = t.match(/book\s+(.+?)\s+on\s+(today|tomorrow|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+(\d{1,2}:\d{2})(?:\s+for\s+([0-9]+)\s*(min|mins|minutes|h|hrs|hours)?)?(?:.*\b(car|bike|scooter)\b)?/i);
    if (fullBookMatch) {
      const station = fullBookMatch[1].trim();
      let dateStr = fullBookMatch[2].trim();
      const time = fullBookMatch[3].trim();
      const durNum = fullBookMatch[4];
      const durUnit = fullBookMatch[5] || '';
      const vehicle = (fullBookMatch[6] || '').toLowerCase();

      let dateVal = null;
      if (/^today$/i.test(dateStr)) dateVal = new Date();
      else if (/^tomorrow$/i.test(dateStr)) { dateVal = new Date(); dateVal.setDate(dateVal.getDate() + 1); }
      else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) dateVal = new Date(dateStr);
      else if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(dateStr)) {
        const parts = dateStr.split('/').map(Number);
        dateVal = new Date(parts[2] || parts[1] || new Date().getFullYear(), (parts[0]-1), parts[1]);
      }

      let durationMins = null;
      if (durNum) {
        durationMins = parseInt(durNum, 10);
        if (durUnit && /h|hr/.test(durUnit)) durationMins = durationMins * 60;
      }

      const payload = { station, date: dateVal, time, duration: durationMins, vehicle };
      return { type: 'book_fill', data: payload };
    }
    
    // Check for partial booking command - initiate interactive flow
    const simpleBookMatch = t.match(/^(?:book|reserve|booking)(?:\s+(.+))?$/i);
    if (simpleBookMatch) {
      const stationHint = simpleBookMatch[1]?.trim();
      return { type: 'start_booking_flow', station: stationHint || null };
    }

    // ===== COMPARISON QUERIES =====
    const compareMatch = t.match(/compare\s+(.+?)\s+(?:and|vs|versus|with)\s+(.+)/i);
    if (compareMatch) {
      const station1 = compareMatch[1].trim();
      const station2 = compareMatch[2].trim();
      return { type: 'compare_stations', stations: [station1, station2] };
    }

    // ===== AMENITY QUERIES =====
    // "amenities at <station>" or "what facilities at <station>"
    const amenitiesMatch = t.match(/(?:amenities|facilities|features|services)\s+(?:at|for)\s+(.+)/i);
    if (amenitiesMatch) {
      const name = amenitiesMatch[1].trim();
      return { type: 'station_query', q: name, field: 'amenities' };
    }

    // Specific amenity checks: "does <station> have parking/wifi/cafe"
    const hasAmenityMatch = t.match(/(?:does|is there)\s+(.+?)\s+(?:have|has|with)\s+(parking|wifi|cafe|cafeteria|restroom|toilet|waiting area|security|wheelchair)/i);
    if (hasAmenityMatch) {
      const station = hasAmenityMatch[1].trim();
      const amenity = hasAmenityMatch[2].trim();
      return { type: 'check_amenity', station, amenity };
    }

    // ===== PAYMENT QUERIES =====
    const paymentMatch = t.match(/(?:payment|pay)\s+(?:methods|options|ways)?\s*(?:at|for)?\s*(.+)?/i);
    if (paymentMatch && (t.includes('payment') || t.includes('pay'))) {
      const name = (paymentMatch[1] || '').trim();
      if (name && name.length > 2) {
        return { type: 'station_query', q: name, field: 'payment' };
      }
    }

    // ===== ACCESS TYPE QUERIES =====
    const accessMatch = t.match(/(?:is|what)\s+(?:the\s+)?(?:access|type)?\s*(?:of|for)?\s+(.+?)\s+(?:public|private|accessible|access type)/i);
    if (accessMatch || (t.includes('public') && t.includes('private')) || t.includes('access type')) {
      const name = (accessMatch ? accessMatch[1] : '').trim();
      if (name) {
        return { type: 'station_query', q: name, field: 'access' };
      }
    }

    // ===== CONTACT QUERIES =====
    const contactMatch = t.match(/(?:phone|contact|number|email|call|operator)\s+(?:for|of|at)?\s*(.+)/i);
    if (contactMatch && (t.includes('phone') || t.includes('contact') || t.includes('number') || t.includes('email') || t.includes('operator'))) {
      const name = contactMatch[1].trim();
      if (name && name.length > 2) {
        return { type: 'station_query', q: name, field: 'contact' };
      }
    }

    // ===== FILTERING QUERIES =====
    // "show public stations" or "list fast charging stations"
    if (t.includes('public') && (t.includes('station') || t.includes('show') || t.includes('list'))) {
      return { type: 'filter_stations', filters: { accessType: 'Public' } };
    }
    if (t.includes('private') && (t.includes('station') || t.includes('show') || t.includes('list'))) {
      return { type: 'filter_stations', filters: { accessType: 'Private' } };
    }
    if ((t.includes('fast') || t.includes('rapid') || t.includes('quick')) && (t.includes('charging') || t.includes('station'))) {
      return { type: 'filter_stations', filters: { speed: 'Fast' } };
    }
    if ((t.includes('ultra fast') || t.includes('ultrafast')) && (t.includes('charging') || t.includes('station'))) {
      return { type: 'filter_stations', filters: { speed: 'Ultra Fast' } };
    }
    if ((t.includes('available') || t.includes('free')) && (t.includes('station') || t.includes('show') || t.includes('list'))) {
      return { type: 'filter_stations', filters: { status: 'Available' } };
    }
    if (t.includes('with parking') || (t.includes('parking') && (t.includes('available') || t.includes('has')))) {
      return { type: 'filter_stations', filters: { amenity: 'parking' } };
    }
    if (t.includes('with wifi') || (t.includes('wifi') && (t.includes('available') || t.includes('has')))) {
      return { type: 'filter_stations', filters: { amenity: 'wifi' } };
    }
    if (t.includes('with cafe') || (t.includes('cafe') && (t.includes('available') || t.includes('has')))) {
      return { type: 'filter_stations', filters: { amenity: 'cafe' } };
    }

    // ===== RECOMMENDATION QUERIES =====
    if ((t.includes('cheapest') || t.includes('affordable') || t.includes('low cost')) && t.includes('station')) {
      return { type: 'recommend', criterion: 'cheapest' };
    }
    if ((t.includes('best') || t.includes('recommend')) && t.includes('station')) {
      return { type: 'recommend', criterion: 'best' };
    }

    // ===== SLOTS & BOOKING ACTIONS =====
    if (/\b(show|available|list)\s+slots\b/i.test(t) || /\bslots\b/i.test(t) && /available|show|list/.test(t)){
      return { type: 'action', action: 'show_slots' };
    }
    
    const selectMatch = t.match(/select\s+slot\s+(\d{1,2}:\d{2})/i);
    if (selectMatch) {
      return { type: 'action', action: 'select_slot', time: selectMatch[1] };
    }

    if (/^list stations$/i.test(text) || (/stations/i.test(t) && /list|show|search|find/.test(t) && !t.includes('compare'))) {
      return { type: 'action', action: 'list_stations' };
    }

    if (/^confirm booking$/i.test(text) || /\bconfirm booking\b/i.test(t)) {
      return { type: 'action', action: 'confirm_booking' };
    }

    // ===== STATION-SPECIFIC QUERIES (Priority checks) =====
    const hoursMatch = t.match(/(?:hours|timings?|schedule|operational hours)\s+(?:for|at|of)\s+(.+)|is\s+(.+)\s+open|opening hours\s+(?:for|of)\s+(.+)/i);
    if (hoursMatch) {
      const name = (hoursMatch[1] || hoursMatch[2] || hoursMatch[3] || '').trim();
      if (name) return { type: 'station_query', q: name, field: 'hours' };
    }

    const priceMatch = t.match(/(?:price|pricing|cost|rate|tariff|how much)\s+(?:at|for|of)\s+(.+)/i);
    if (priceMatch) {
      const name = priceMatch[1].trim();
      if (name) return { type: 'station_query', q: name, field: 'price' };
    }

    const speedMatch = t.match(/(?:charging speed|speed)\s+(?:at|for|of)\s+(.+)/i);
    if (speedMatch) {
      const name = speedMatch[1].trim();
      if (name) return { type: 'station_query', q: name, field: 'speed' };
    }

    const connMatch = t.match(/connector(?:s)?\s+(?:at|for)\s+(.+?)(?:\s+for\s+(car|bike|scooter|\w+))?$/i);
    if (connMatch) {
      const station = connMatch[1].trim();
      const vehicle = (connMatch[2] || '').toLowerCase();
      return { type: 'connector_query', station, vehicle };
    }

    // ===== SYNONYM-BASED INTENTS =====
    for (const intent in synonyms){
      for (const word of synonyms[intent]){
        if (t.includes(word)) return { type: 'intent', intent };
      }
    }

    // ===== CONNECTOR COMPATIBILITY =====
    const conn2 = t.match(/is\s+(my\s+)?(car|bike|scooter|\w+)\s+supported(?:\s+at\s+(.+))?/i);
    if (conn2) {
      const vehicle = (conn2[2] || '').toLowerCase();
      const station = (conn2[3] || '').trim();
      if (station) return { type: 'connector_query', station, vehicle };
      return { type: 'connector_followup', vehicle };
    }

    // ===== FALLBACK =====
    return { 
      type: 'fallback', 
      text: "I didn't quite understand that. Try:\n• 'list stations'\n• 'nearby stations'\n• 'price at [station]'\n• 'amenities at [station]'\n• 'compare [station1] and [station2]'" 
    };
  }

  // Initialize
  function init(){
    // Check if we're on the dedicated chatbot page
    const chatbotPageContainer = document.getElementById('chatbotSection');
    const isEmbeddedMode = !!chatbotPageContainer;

    if (!isEmbeddedMode) {
      // Widget mode - load CSS and create floating widget
      const cssHref = 'css/chatbot.css';
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = cssHref;
      document.head.appendChild(link);
    }

    let toggle, win, msgContainer, input, send;

    if (isEmbeddedMode) {
      // Embedded mode on chatbot.html page
      chatbotPageContainer.innerHTML = `
        <div class="chatbot-embedded">
          <div class="chatbot-header-bar">
            <span class="chatbot-title"><i class="fas fa-robot"></i> EV Assistant</span>
            <button class="chatbot-clear-btn" id="clearChatBtn"><i class="fas fa-trash-alt"></i> Clear</button>
          </div>
          <div class="chatbot-messages" id="chatbotMessages"></div>
          <div class="chatbot-input">
            <input type="text" id="chatbotInput" placeholder="Type your question or command..." />
            <button id="chatbotSend"><i class="fas fa-paper-plane"></i> Send</button>
          </div>
        </div>
      `;
      msgContainer = chatbotPageContainer.querySelector('#chatbotMessages');
      input = chatbotPageContainer.querySelector('#chatbotInput');
      send = chatbotPageContainer.querySelector('#chatbotSend');
    } else {
      // Widget mode
      const widget = createWidget();
      toggle = widget.toggle;
      win = widget.win;
      msgContainer = win.querySelector('#chatbotMessages');
      input = win.querySelector('#chatbotInput');
      send = win.querySelector('#chatbotSend');
    }

    // simple memory/context
    const context = { lastIntent: null, lastStationSearch: null };

    function renderQuickReplies(replies){
      const container = document.createElement('div');
      container.style.marginTop = '6px';
      replies.forEach(r => {
        const btn = document.createElement('button');
        btn.textContent = r.label;
        btn.style.marginRight = '6px';
        btn.style.padding = '6px 8px';
        btn.style.borderRadius = '6px';
        btn.onclick = () => {
          addMessage(msgContainer, r.label, 'user');
          handleUserInput(r.value || r.label);
        };
        container.appendChild(btn);
      });
      msgContainer.appendChild(container);
      msgContainer.scrollTop = msgContainer.scrollHeight;
    }

    // Render actionable slot buttons (these will select the slot on the booking page)
    function renderSlotOptions(times){
      const container = document.createElement('div');
      container.style.marginTop = '6px';
      times.forEach(t => {
        const btn = document.createElement('button');
        btn.textContent = t;
        btn.style.marginRight = '6px';
        btn.style.padding = '6px 8px';
        btn.style.borderRadius = '6px';
        btn.onclick = () => {
          // select slot on booking page
          const selected = selectSlotOnPage(t);
          if (selected) {
            addMessage(msgContainer, `Selected slot: ${t}`, 'user');
            addMessage(msgContainer, `Slot ${t} selected on the Booking page. Click Confirm booking to proceed.`);
            renderQuickReplies([{ label: 'Confirm booking', value: 'confirm booking' }]);
          } else {
            addMessage(msgContainer, `Could not select slot ${t}. Make sure the Booking page is open and the slot is available.`);
          }
        };
        container.appendChild(btn);
      });
      msgContainer.appendChild(container);
      msgContainer.scrollTop = msgContainer.scrollHeight;
    }

    async function searchStationsApi(q){
      try {
        // Fetch all stations and filter client-side
        const stations = await window.fetchStations();
        if (!stations || !Array.isArray(stations)) return [];
        
        const query = q.toLowerCase().trim();
        
        // Split query into words for flexible matching (filter out very short words)
        const queryWords = query.split(/\s+/).filter(w => w.length >= 3);
        
        // Filter by name match
        const results = stations.filter(s => {
          const name = (s.name || s.title || '').toLowerCase();
          const location = (s.location || '').toLowerCase();
          
          // Handle address object properly
          let addressStr = '';
          if (s.address && typeof s.address === 'object') {
            addressStr = [
              s.address.street || '',
              s.address.area || '',
              s.address.city || '',
              s.address.state || ''
            ].join(' ').toLowerCase();
          } else if (typeof s.address === 'string') {
            addressStr = s.address.toLowerCase();
          }
          
          // Combine all searchable text
          const fullText = `${name} ${location} ${addressStr}`;
          
          // Check exact or partial matches
          if (name.includes(query) || 
              location.includes(query) || 
              addressStr.includes(query) ||
              query.includes(name)) {
            return true;
          }
          
          // If no exact match, try word-by-word matching
          if (queryWords.length > 0) {
            const matchedWords = queryWords.filter(word => fullText.includes(word));
            
            // Need at least 1 significant word match for short queries, 2 for longer queries
            const requiredMatches = queryWords.length >= 4 ? 2 : 1;
            return matchedWords.length >= requiredMatches;
          }
          
          return false;
        });
        
        // Sort by relevance (exact matches first, then by number of matching words)
        results.sort((a, b) => {
          const aName = (a.name || a.title || '').toLowerCase();
          const bName = (b.name || b.title || '').toLowerCase();
          
          // Exact match gets highest priority
          const aExact = aName === query ? 2 : (aName.includes(query) ? 1 : 0);
          const bExact = bName === query ? 2 : (bName.includes(query) ? 1 : 0);
          
          if (aExact !== bExact) return bExact - aExact;
          
          // Count matching words
          const aMatches = queryWords.filter(w => w.length > 2 && aName.includes(w)).length;
          const bMatches = queryWords.filter(w => w.length > 2 && bName.includes(w)).length;
          
          return bMatches - aMatches;
        });
        
        return results;
      } catch (e){
        console.error('searchStationsApi error', e);
        return [];
      }
    }

    async function handleAction(actionObj){
      // actionObj may be a string or an object { type: 'action', action: 'name', ... }
      const action = (typeof actionObj === 'string') ? actionObj : (actionObj.action || actionObj.name || null);
      const payload = (typeof actionObj === 'object') ? actionObj : {};

      // ===== SMART PERSONALIZATION ACTIONS =====
      if (action === 'show_favorites') {
        if (userPreferences.favoriteStations.length === 0) {
          addMessage(msgContainer, '⭐ You haven\'t added any favorite stations yet. To add one, say "add [station name] to favorites"');
          return;
        }
        
        addMessage(msgContainer, `⭐ Your Favorite Stations (${userPreferences.favoriteStations.length}):`);
        userPreferences.favoriteStations.forEach((name, i) => {
          addMessage(msgContainer, `${i + 1}. ${name}`);
        });
        
        renderQuickReplies(userPreferences.favoriteStations.slice(0, 4).map(name => ({
          label: `📍 ${name}`,
          value: `details for ${name}`
        })));
        return;
      }
      
      if (action === 'add_favorite') {
        const stationName = payload.station;
        if (!stationName) {
          addMessage(msgContainer, '❌ Please specify which station to add to favorites.');
          return;
        }
        
        if (!userPreferences.favoriteStations.includes(stationName)) {
          userPreferences.favoriteStations.push(stationName);
          saveUserPreferences();
          addMessage(msgContainer, `⭐ Added "${stationName}" to your favorites!`);
        } else {
          addMessage(msgContainer, `ℹ️ "${stationName}" is already in your favorites.`);
        }
        return;
      }
      
      if (action === 'book_last') {
        const station = payload.station || conversationContext.lastStation;
        if (!station) {
          addMessage(msgContainer, '❌ I don\'t remember which station you were looking at. Please specify the station name.');
          return;
        }
        
        addMessage(msgContainer, `📅 Let's book ${station}!`);
        addMessage(msgContainer, `I'll help you fill the booking form. Redirecting to booking page...`);
        
        // Store booking intent and redirect
        sessionStorage.setItem('pending_booking', JSON.stringify({ station, date: new Date() }));
        setTimeout(() => {
          window.location.href = 'booking.html';
        }, 1000);
        return;
      }

      if (action === 'list_stations'){
        addMessage(msgContainer, '🔍 Loading all stations...');
        const stations = await window.fetchStations();
        
        if (!stations || stations.length === 0) {
          return addMessage(msgContainer, '❌ No stations available right now.');
        }
        
        context.lastStationSearch = stations;
        addMessage(msgContainer, `✅ Found <strong>${stations.length}</strong> charging stations:`);
        
        // Display stations with rich details
        stations.slice(0, 10).forEach((s, i) => {
          const statusIcon = s.status === 'Available' ? '🟢' : s.status === 'Busy' ? '🟡' : '🔴';
          const accessIcon = s.accessType === 'Public' ? '🌐' : s.accessType === 'Private' ? '🔒' : '🔓';
          const area = s.address?.area || 'Jaipur';
          const speed = s.chargingSpeed || 'Standard';
          const price = s.pricing?.perUnit ? `₹${s.pricing.perUnit}/kWh` : 'N/A';
          
          addMessage(msgContainer, `${i + 1}. ${statusIcon} ${accessIcon} <strong>${s.name}</strong><br>   📍 ${area} | ⚡ ${speed} | 💰 ${price}`);
        });
        
        if (stations.length > 10) {
          addMessage(msgContainer, `...and ${stations.length - 10} more stations`);
        }
        
        // Smart time-based suggestions
        const hour = new Date().getHours();
        const suggestions = [
          { label: '💰 Cheapest', value: 'cheapest station' },
          { label: '🟢 Available', value: 'available stations' }
        ];
        
        if (hour >= 7 && hour <= 10 || hour >= 17 && hour <= 20) {
          // Rush hour - suggest fast charging
          suggestions.unshift({ label: '⚡ Fast Charging', value: 'fast charging stations' });
        } else {
          // Off-peak - suggest amenities
          suggestions.push({ label: '☕ With Cafe', value: 'stations with cafe' });
        }
        
        if (userPreferences.vehicleType) {
          suggestions.push({ label: `🎯 Best for ${userPreferences.vehicleType}`, value: `best stations for ${userPreferences.vehicleType}` });
        }
        
        renderQuickReplies(suggestions);
      }
      if (action === 'confirm_booking'){
        addMessage(msgContainer, 'Attempting to confirm your booking...');
        try {
          const bookingForm = document.getElementById('booking-form');
          if (bookingForm) {
            // trigger submit
            bookingForm.dispatchEvent(new Event('submit', { cancelable: true }));
            addMessage(msgContainer, 'Booking submitted. Check the Booking page for confirmation.');
          } else {
            addMessage(msgContainer, 'Booking page not open. Please open the Booking page to confirm.');
          }
        } catch (e) {
          addMessage(msgContainer, 'Failed to submit booking: ' + e.message);
        }
      }
      if (action === 'show_slots'){
        // gather available slots from booking page
        try {
          const slots = Array.from(document.querySelectorAll('.time-slot')).filter(s => !s.classList.contains('booked')).map(s => s.dataset.time);
          if (slots.length){
            addMessage(msgContainer, 'Available slots:');
            renderSlotOptions(slots.slice(0, 20));
          } else {
            addMessage(msgContainer, 'No available slots found or Booking page not open.');
          }
        } catch(e){ addMessage(msgContainer, 'Error fetching slots: ' + e.message); }
      }

      if (action === 'select_slot'){
        // action may include a time in the calling context; try to use it
        // The caller will set window._chatbot_selected_time before calling or pass via res
        addMessage(msgContainer, 'Selecting the requested slot...');
        // This action expects a time passed in context, but handleUserInput passes only action string.
        // To support select_slot via replyTo we will check a temporary variable set on window by replyTo flow.
        const time = payload.time || window._chatbot_select_time || null;
        if (!time) return addMessage(msgContainer, 'No slot time provided. Try: select slot 14:30');
        const ok = selectSlotOnPage(time);
        if (ok) {
          addMessage(msgContainer, `Selected slot ${time}.`);
          renderQuickReplies([{ label: 'Confirm booking', value: 'confirm booking' }]);
        } else {
          addMessage(msgContainer, `Could not select slot ${time}.`);
        }
      }
    }

    // Select a slot element on the booking page by time string (HH:MM)
    function selectSlotOnPage(timeStr){
      try {
        const slots = Array.from(document.querySelectorAll('.time-slot'));
        const slot = slots.find(s => s.dataset.time === timeStr && !s.classList.contains('booked'));
        if (!slot) return false;
        // If booking.js exposes selectTimeSlot, call it; otherwise simulate click
        if (typeof window.selectTimeSlot === 'function') {
          window.selectTimeSlot(slot);
        } else {
          slot.click();
        }
        return true;
      } catch (e) {
        console.warn('selectSlotOnPage error', e);
        return false;
      }
    }

    async function handleIntent(intent){
      context.lastIntent = intent;
      
      switch(intent){
        case 'greeting':
          addMessage(msgContainer, defaultReplies.greeting);
          renderQuickReplies([
            { label: '📍 Find Nearby', value: 'nearby' },
            { label: '📋 List Stations', value: 'list stations' },
            { label: '💰 Cheapest Options', value: 'cheapest station' },
            { label: '🎯 Best Stations', value: 'best station' }
          ]);
          break;
          
        case 'duration':
          addMessage(msgContainer, defaultReplies.duration);
          renderQuickReplies([
            { label: '30 minutes', value: '30 minutes' },
            { label: '1 hour', value: '1 hour' },
            { label: '2 hours', value: '2 hours' }
          ]);
          break;
          
        case 'vehicle_type':
          addMessage(msgContainer, defaultReplies.vehicle_type);
          renderQuickReplies([
            { label: '🚗 Car', value: 'car connectors' },
            { label: '🏍️ Bike', value: 'bike connectors' },
            { label: '🛵 Scooter', value: 'scooter connectors' }
          ]);
          break;
          
        case 'hours':
          addMessage(msgContainer, defaultReplies.hours);
          const recentStations1 = await window.fetchStations();
          if (recentStations1 && recentStations1.length) {
            renderQuickReplies(
              recentStations1.slice(0, 3).map(s => ({ 
                label: s.name, 
                value: `hours for ${s.name}` 
              }))
            );
          }
          break;
          
        case 'book':
          addMessage(msgContainer, defaultReplies.book);
          const recentStations2 = await window.fetchStations();
          if (recentStations2 && recentStations2.length) {
            renderQuickReplies(
              recentStations2.slice(0, 3).map(s => ({ 
                label: `Book ${s.name}`, 
                value: `book ${s.name} on today at 14:00` 
              }))
            );
          }
          break;
          
        case 'price':
          addMessage(msgContainer, defaultReplies.price);
          const recentStations3 = await window.fetchStations();
          if (recentStations3 && recentStations3.length) {
            renderQuickReplies(
              recentStations3.slice(0, 3).map(s => ({ 
                label: s.name, 
                value: `price at ${s.name}` 
              }))
            );
          }
          break;
          
        case 'amenities':
          addMessage(msgContainer, "I can show you amenities like parking, wifi, cafe, restrooms, and more!");
          addMessage(msgContainer, 'Try: "amenities at [station]" or "does [station] have parking"');
          break;
          
        case 'payment':
          addMessage(msgContainer, "I can show you accepted payment methods at any station!");
          addMessage(msgContainer, 'Try: "payment methods at [station]"');
          break;
          
        case 'access':
          addMessage(msgContainer, "Stations can be Public, Private, or Semi-Public.");
          renderQuickReplies([
            { label: '🌐 Public Stations', value: 'show public stations' },
            { label: '🔒 Private Stations', value: 'show private stations' }
          ]);
          break;
          
        case 'contact':
          addMessage(msgContainer, "I can provide contact details including phone, email, and operator info.");
          addMessage(msgContainer, 'Try: "contact for [station]"');
          break;
          
        case 'parking':
        case 'wifi':
        case 'cafe':
        case 'restroom':
          addMessage(msgContainer, `Looking for stations with ${intent}? I can help!`);
          renderQuickReplies([
            { label: `Stations with ${intent}`, value: `stations with ${intent}` },
            { label: 'All Amenities', value: 'list stations' }
          ]);
          break;
          
        case 'compare':
          addMessage(msgContainer, "I can compare two stations side-by-side!");
          addMessage(msgContainer, 'Try: "compare [station1] and [station2]"');
          const allStations = await window.fetchStations();
          if (allStations && allStations.length >= 2) {
            const s1 = allStations[0].name;
            const s2 = allStations[1].name;
            renderQuickReplies([
              { label: `Compare ${s1} vs ${s2}`, value: `compare ${s1} and ${s2}` }
            ]);
          }
          break;
          
        case 'available':
          addMessage(msgContainer, "Searching for available stations...");
          handleFilterStations({ status: 'Available' });
          break;
          
        case 'fast':
          addMessage(msgContainer, "Searching for fast charging stations...");
          handleFilterStations({ speed: 'Fast' });
          break;
          
        case 'cheap':
          addMessage(msgContainer, "Finding the most affordable options...");
          handleRecommendation('cheapest');
          break;
          
        case 'nearby':
          if (navigator.geolocation){
            addMessage(msgContainer, '📍 Requesting location access...');
            navigator.geolocation.getCurrentPosition(async (pos)=>{
              const { latitude, longitude } = pos.coords;
              addMessage(msgContainer, `✅ Location found! Searching nearby stations...`);
              
              try {
                const stations = await window.fetchStations();
                if (!stations || !stations.length) {
                  addMessage(msgContainer, '❌ No stations available. Try the Stations page.');
                  return;
                }
                
                const withDistance = stations.map(s => {
                  const lat = s.latitude || s.lat || 0;
                  const lng = s.longitude || s.lng || 0;
                  const distance = calculateDistance(latitude, longitude, lat, lng);
                  return { ...s, distance };
                }).sort((a, b) => a.distance - b.distance);
                
                const nearby = withDistance.slice(0, 5);
                if (nearby.length) {
                  addMessage(msgContainer, '📍 <strong>Nearest Stations:</strong>');
                  nearby.forEach((s, i) => {
                    const dist = s.distance < 1 ? `${Math.round(s.distance * 1000)}m` : `${s.distance.toFixed(1)}km`;
                    const statusIcon = s.status === 'Available' ? '🟢' : s.status === 'Busy' ? '🟡' : '🔴';
                    addMessage(msgContainer, `${i + 1}. ${statusIcon} <strong>${s.name}</strong> - ${dist} - ${s.chargingSpeed || 'Standard'}`);
                  });
                  renderQuickReplies(nearby.slice(0, 3).map(s => ({
                    label: `Details: ${s.name}`,
                    value: `price at ${s.name}`
                  })));
                } else {
                  addMessage(msgContainer, '❌ No nearby stations found.');
                }
              } catch (e){
                console.error('Nearby search error:', e);
                addMessage(msgContainer, '❌ Error searching nearby stations.');
              }
            }, (err)=> {
              console.error('Geolocation error:', err);
              addMessage(msgContainer, '⚠️ Location access denied. This feature requires location permission.');
              addMessage(msgContainer, 'Showing all available stations instead:');
              handleAction('list_stations');
            });
          } else {
            addMessage(msgContainer, '⚠️ Geolocation not supported. Showing all stations:');
            handleAction('list_stations');
          }
          break;
          
        case 'stations':
          handleAction('list_stations');
          break;
          
        default:
          addMessage(msgContainer, "I can help with station searches, bookings, pricing, amenities, and comparisons!");
          renderQuickReplies([
            { label: '📋 List Stations', value: 'list stations' },
            { label: '📍 Find Nearby', value: 'nearby' },
            { label: '💰 Cheapest', value: 'cheapest station' }
          ]);
      }
    }

    async function handleStationQuery(q, field){
      addMessage(msgContainer, `🔍 Searching for <strong>${q}</strong>...`);
      const results = await searchStationsApi(q);
      
      if (results && results.length){
        const s = results[0];
        context.lastStationSearch = results;
        context.lastStation = s;
        
        // Smart context tracking
        conversationContext.lastStation = s.name;
        conversationContext.lastStations = results;
        conversationContext.lastAction = field;
        
        // ===== HOURS =====
        if (field === 'hours'){
          const hours = s.openingHours || '24/7';
          addMessage(msgContainer, `✅ <strong>${s.name}</strong><br>📅 <strong>Hours:</strong> ${hours}`);
          renderQuickReplies([
            { label: `💰 Price`, value: `price at ${s.name}` },
            { label: `🎯 Amenities`, value: `amenities at ${s.name}` },
            { label: `📅 Book`, value: `book ${s.name} on today at 10:00` }
          ]);
          return;
        }
        
        // ===== PRICE =====
        if (field === 'price'){
          let priceInfo = [`✅ <strong>${s.name}</strong>`, `💰 <strong>Pricing Details:</strong>`];
          
          if (s.pricing && s.pricing.perUnit) {
            priceInfo.push(`• Standard: ₹${s.pricing.perUnit}/kWh`);
            if (s.pricing.peakRate) priceInfo.push(`• Peak hours: ₹${s.pricing.peakRate}/kWh`);
            if (s.pricing.offPeakRate) priceInfo.push(`• Off-peak: ₹${s.pricing.offPeakRate}/kWh`);
            if (s.pricing.bookingFee > 0) priceInfo.push(`• Booking fee: ₹${s.pricing.bookingFee}`);
            if (s.pricing.idleFee > 0) priceInfo.push(`• Idle fee: ₹${s.pricing.idleFee}/min`);
          } else {
            priceInfo.push(`Contact station for pricing details`);
          }
          
          addMessage(msgContainer, priceInfo.join('<br>'));
          
          const priceSuggestions = [
            { label: `📅 Hours`, value: `hours for ${s.name}` },
            { label: `🎯 Amenities`, value: `amenities at ${s.name}` },
            { label: `📅 Book`, value: `book ${s.name} on today at 10:00` }
          ];
          
          // Proactive comparison suggestion if user has viewed other stations
          if (conversationContext.lastStations.length > 1) {
            const otherStation = conversationContext.lastStations.find(st => st.name !== s.name);
            if (otherStation) {
              priceSuggestions.push({ label: `⚖️ Compare with ${otherStation.name}`, value: `compare ${s.name} and ${otherStation.name}` });
            }
          }
          
          renderQuickReplies(priceSuggestions);
          return;
        }
        
        // ===== SPEED =====
        if (field === 'speed'){
          const speed = s.chargingSpeed || 'Standard';
          let speedInfo = [`✅ <strong>${s.name}</strong>`, `⚡ <strong>Charging Speed:</strong> ${speed}`];
          
          if (s.connectorTypes && s.connectorTypes.length) {
            speedInfo.push(`<br><strong>Connectors:</strong>`);
            s.connectorTypes.forEach(c => {
              speedInfo.push(`• ${c.type}: ${c.powerOutput || 'N/A'} (${c.count || 1} available)`);
            });
          }
          
          addMessage(msgContainer, speedInfo.join('<br>'));
          renderQuickReplies([
            { label: `💰 Price`, value: `price at ${s.name}` },
            { label: `📅 Book`, value: `book ${s.name} on today at 10:00` }
          ]);
          return;
        }
        
        // ===== AMENITIES =====
        if (field === 'amenities'){
          let amenityInfo = [`✅ <strong>${s.name}</strong>`, `🎯 <strong>Available Amenities:</strong>`];
          const amenities = s.amenities || {};
          let hasAny = false;
          
          for (const [key, value] of Object.entries(amenities)) {
            if (value === true) {
              hasAny = true;
              const icon = amenityIcons[key] || '✓';
              const label = key.replace(/([A-Z])/g, ' $1').trim();
              amenityInfo.push(`${icon} ${label.charAt(0).toUpperCase() + label.slice(1)}`);
            }
          }
          
          if (!hasAny) amenityInfo.push(`No additional amenities listed`);
          
          addMessage(msgContainer, amenityInfo.join('<br>'));
          renderQuickReplies([
            { label: `💰 Price`, value: `price at ${s.name}` },
            { label: `📞 Contact`, value: `contact for ${s.name}` },
            { label: `📅 Book`, value: `book ${s.name} on today at 10:00` }
          ]);
          return;
        }
        
        // ===== PAYMENT =====
        if (field === 'payment'){
          let paymentInfo = [`✅ <strong>${s.name}</strong>`, `💳 <strong>Accepted Payment Methods:</strong>`];
          
          if (s.paymentMethods && s.paymentMethods.length) {
            s.paymentMethods.forEach(pm => {
              const icon = paymentIcons[pm] || '💵';
              paymentInfo.push(`${icon} ${pm}`);
            });
          } else {
            paymentInfo.push(`Payment information not available`);
          }
          
          addMessage(msgContainer, paymentInfo.join('<br>'));
          renderQuickReplies([
            { label: `💰 Price`, value: `price at ${s.name}` },
            { label: `📅 Book`, value: `book ${s.name} on today at 10:00` }
          ]);
          return;
        }
        
        // ===== ACCESS TYPE =====
        if (field === 'access'){
          const accessType = s.accessType || 'Public';
          const accessIcon = accessType === 'Public' ? '🌐' : accessType === 'Private' ? '🔒' : '🔓';
          
          addMessage(msgContainer, `✅ <strong>${s.name}</strong><br>${accessIcon} <strong>Access Type:</strong> ${accessType}`);
          renderQuickReplies([
            { label: `💰 Price`, value: `price at ${s.name}` },
            { label: `📞 Contact`, value: `contact for ${s.name}` },
            { label: `📅 Book`, value: `book ${s.name} on today at 10:00` }
          ]);
          return;
        }
        
        // ===== CONTACT =====
        if (field === 'contact'){
          let contactInfo = [`✅ <strong>${s.name}</strong>`, `📞 <strong>Contact Information:</strong>`];
          
          if (s.contact) {
            if (s.contact.phone) contactInfo.push(`📱 Phone: ${s.contact.phone}`);
            if (s.contact.email) contactInfo.push(`📧 Email: ${s.contact.email}`);
            if (s.contact.operator) contactInfo.push(`👤 Operator: ${s.contact.operator}`);
          } else {
            contactInfo.push(`Contact information not available`);
          }
          
          if (s.address) {
            contactInfo.push(`<br>📍 <strong>Address:</strong>`);
            contactInfo.push(`${s.address.street || ''}, ${s.address.area || ''}, ${s.address.city || 'Jaipur'}`);
            if (s.address.pincode) contactInfo.push(`PIN: ${s.address.pincode}`);
          }
          
          addMessage(msgContainer, contactInfo.join('<br>'));
          renderQuickReplies([
            { label: `💰 Price`, value: `price at ${s.name}` },
            { label: `🎯 Amenities`, value: `amenities at ${s.name}` },
            { label: `📅 Book`, value: `book ${s.name} on today at 10:00` }
          ]);
          return;
        }

        // ===== GENERIC DISPLAY =====
        const info = [`✅ <strong>${s.name}</strong>`];
        if (s.address && s.address.area) info.push(`📍 ${s.address.area}, ${s.address.city || 'Jaipur'}`);
        if (s.chargingSpeed) info.push(`⚡ ${s.chargingSpeed}`);
        if (s.openingHours) info.push(`📅 ${s.openingHours}`);
        if (s.status) info.push(`🔋 Status: ${s.status}`);
        
        addMessage(msgContainer, info.join('<br>'));
        renderQuickReplies([
          { label: `💰 Price`, value: `price at ${s.name}` },
          { label: `🎯 Amenities`, value: `amenities at ${s.name}` },
          { label: `📅 Book`, value: `book ${s.name} on today at 10:00` }
        ]);
      } else {
        const allStations = await window.fetchStations();
        if (allStations && allStations.length) {
          addMessage(msgContainer, `❌ No match for "${q}". Here are available stations:`);
          const names = allStations.slice(0, 5).map(s => s.name || s.title);
          renderQuickReplies(names.map(n => ({ label: n, value: `hours for ${n}` })));
        } else {
          addMessage(msgContainer, '❌ No stations found. Visit the Stations page to browse all locations.');
        }
      }
    }

    // ===== NEW HANDLER: CHECK SPECIFIC AMENITY =====
    async function handleCheckAmenity(stationName, amenity) {
      addMessage(msgContainer, `🔍 Checking ${amenity} availability at <strong>${stationName}</strong>...`);
      const results = await searchStationsApi(stationName);
      
      if (results && results.length) {
        const s = results[0];
        const amenities = s.amenities || {};
        
        // Map common terms to amenity keys
        const amenityMap = {
          'parking': 'parking',
          'park': 'parking',
          'wifi': 'wifi',
          'wi-fi': 'wifi',
          'internet': 'wifi',
          'cafe': 'cafe',
          'cafeteria': 'cafe',
          'coffee': 'cafe',
          'restroom': 'restroom',
          'toilet': 'restroom',
          'washroom': 'restroom',
          'bathroom': 'restroom',
          'waiting area': 'waitingArea',
          'security': 'security',
          'wheelchair': 'wheelchairAccessible'
        };
        
        const key = amenityMap[amenity.toLowerCase()] || amenity;
        const hasAmenity = amenities[key] === true;
        const icon = amenityIcons[key] || '✓';
        
        if (hasAmenity) {
          addMessage(msgContainer, `✅ Yes! <strong>${s.name}</strong> has ${icon} ${amenity}.`);
        } else {
          addMessage(msgContainer, `❌ Sorry, <strong>${s.name}</strong> doesn't have ${amenity}.`);
        }
        
        renderQuickReplies([
          { label: `🎯 All Amenities`, value: `amenities at ${s.name}` },
          { label: `💰 Price`, value: `price at ${s.name}` },
          { label: `📅 Book`, value: `book ${s.name} on today at 10:00` }
        ]);
      } else {
        addMessage(msgContainer, `❌ Station "${stationName}" not found.`);
      }
    }

    // ===== NEW HANDLER: FILTER STATIONS =====
    async function handleFilterStations(filters) {
      addMessage(msgContainer, `🔍 Filtering stations...`);
      
      try {
        let stations = await window.fetchStations();
        if (!stations || !stations.length) {
          return addMessage(msgContainer, '❌ No stations available.');
        }
        
        // Apply filters
        if (filters.accessType) {
          stations = stations.filter(s => s.accessType === filters.accessType);
        }
        if (filters.speed) {
          stations = stations.filter(s => s.chargingSpeed && s.chargingSpeed.includes(filters.speed));
        }
        if (filters.status) {
          stations = stations.filter(s => s.status === filters.status);
        }
        if (filters.amenity) {
          stations = stations.filter(s => s.amenities && s.amenities[filters.amenity] === true);
        }
        
        if (stations.length === 0) {
          return addMessage(msgContainer, '❌ No stations match your criteria.');
        }
        
        // Smart context tracking
        conversationContext.lastStations = stations;
        conversationContext.lastAction = 'filter';
        
        const filterDesc = Object.entries(filters).map(([k, v]) => `${v}`).join(', ');
        addMessage(msgContainer, `✅ Found ${stations.length} <strong>${filterDesc}</strong> station(s):`);
        
        stations.slice(0, 8).forEach(s => {
          const accessIcon = s.accessType === 'Public' ? '🌐' : s.accessType === 'Private' ? '🔒' : '🔓';
          const statusIcon = s.status === 'Available' ? '🟢' : s.status === 'Busy' ? '🟡' : '🔴';
          addMessage(msgContainer, `${accessIcon} ${statusIcon} <strong>${s.name}</strong> - ${s.chargingSpeed || 'Standard'} - ${s.address?.area || 'Jaipur'}`);
        });
        
        // Proactive suggestions based on filter results
        const suggestions = [];
        if (stations.length > 1) {
          suggestions.push({ label: '🤔 Which one is cheaper?', value: 'which one is cheaper' });
          suggestions.push({ label: '⚖️ Compare first two', value: `compare ${stations[0].name} and ${stations[1].name}` });
        }
        if (stations.length > 0) {
          suggestions.push({ label: `📋 Details: ${stations[0].name}`, value: `details for ${stations[0].name}` });
        }
        
        renderQuickReplies(suggestions.length > 0 ? suggestions : 
          stations.slice(0, 3).map(s => ({ label: s.name, value: `hours for ${s.name}` }))
        );
      } catch (e) {
        console.error('Filter error:', e);
        addMessage(msgContainer, '❌ Error filtering stations.');
      }
    }

    // ===== NEW HANDLER: COMPARE STATIONS =====
    async function handleCompareStations(stationNames) {
      addMessage(msgContainer, `🔍 Comparing stations...`);
      
      try {
        const results1 = await searchStationsApi(stationNames[0]);
        const results2 = await searchStationsApi(stationNames[1]);
        
        if (!results1 || !results1.length || !results2 || !results2.length) {
          let errorMsg = '❌ Could not find one or both stations.';
          if (!results1 || !results1.length) {
            errorMsg += `<br>"${stationNames[0]}" not found.`;
          }
          if (!results2 || !results2.length) {
            errorMsg += `<br>"${stationNames[1]}" not found.`;
          }
          addMessage(msgContainer, errorMsg);
          
          // Show available stations
          const allStations = await window.fetchStations();
          if (allStations && allStations.length) {
            addMessage(msgContainer, 'Available stations:');
            renderQuickReplies(
              allStations.slice(0, 5).map(s => ({ label: s.name, value: `compare ${s.name} and ${allStations[1]?.name || allStations[0]?.name}` }))
            );
          }
          return;
        }
        
        const s1 = results1[0];
        const s2 = results2[0];
        
        let comparison = [`<strong>📊 Comparison:</strong><br>`];
        comparison.push(`<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;">`);
        
        // Station 1
        comparison.push(`<div style="border:2px solid #667eea;padding:10px;border-radius:8px;">`);
        comparison.push(`<strong>${s1.name}</strong><br>`);
        comparison.push(`📍 ${s1.address?.area || 'N/A'}<br>`);
        comparison.push(`⚡ ${s1.chargingSpeed || 'N/A'}<br>`);
        comparison.push(`🔋 ${s1.status || 'N/A'}<br>`);
        comparison.push(`💰 ₹${s1.pricing?.perUnit || 'N/A'}/kWh<br>`);
        comparison.push(`📅 ${s1.openingHours || 'N/A'}<br>`);
        
        // Count amenities
        let amenityCount1 = 0;
        if (s1.amenities) {
          amenityCount1 = Object.values(s1.amenities).filter(v => v === true).length;
        }
        comparison.push(`🎯 ${amenityCount1} amenities<br>`);
        comparison.push(`${s1.accessType === 'Public' ? '🌐' : s1.accessType === 'Private' ? '🔒' : '🔓'} ${s1.accessType || 'Public'}`);
        comparison.push(`</div>`);
        
        // Station 2
        comparison.push(`<div style="border:2px solid #764ba2;padding:10px;border-radius:8px;">`);
        comparison.push(`<strong>${s2.name}</strong><br>`);
        comparison.push(`📍 ${s2.address?.area || 'N/A'}<br>`);
        comparison.push(`⚡ ${s2.chargingSpeed || 'N/A'}<br>`);
        comparison.push(`🔋 ${s2.status || 'N/A'}<br>`);
        comparison.push(`💰 ₹${s2.pricing?.perUnit || 'N/A'}/kWh<br>`);
        comparison.push(`📅 ${s2.openingHours || 'N/A'}<br>`);
        
        let amenityCount2 = 0;
        if (s2.amenities) {
          amenityCount2 = Object.values(s2.amenities).filter(v => v === true).length;
        }
        comparison.push(`🎯 ${amenityCount2} amenities<br>`);
        comparison.push(`${s2.accessType === 'Public' ? '🌐' : s2.accessType === 'Private' ? '🔒' : '🔓'} ${s2.accessType || 'Public'}`);
        comparison.push(`</div></div>`);
        
        addMessage(msgContainer, comparison.join(''));
        
        renderQuickReplies([
          { label: `📅 Book ${s1.name}`, value: `book ${s1.name} on today at 10:00` },
          { label: `📅 Book ${s2.name}`, value: `book ${s2.name} on today at 10:00` }
        ]);
      } catch (e) {
        console.error('Comparison error:', e);
        addMessage(msgContainer, '❌ Error comparing stations.');
      }
    }

    // ===== NEW HANDLER: RECOMMENDATIONS =====
    async function handleRecommendation(criterion) {
      addMessage(msgContainer, `🔍 Finding the best stations for you...`);
      
      try {
        let stations = await window.fetchStations();
        if (!stations || !stations.length) {
          return addMessage(msgContainer, '❌ No stations available.');
        }
        
        // Smart filtering based on user vehicle type
        if (userPreferences.vehicleType && criterion !== 'cheapest') {
          const filtered = stations.filter(s => {
            if (!s.connectorTypes) return true;
            const compatible = compatibilityMap[userPreferences.vehicleType] || [];
            return s.connectorTypes.some(c => compatible.includes(c));
          });
          if (filtered.length > 0) {
            stations = filtered;
            addMessage(msgContainer, `✅ <em>Filtered for your ${userPreferences.vehicleType}</em>`);
          }
        }
        
        conversationContext.lastStations = stations;
        
        if (criterion === 'cheapest') {
          // Sort by price
          stations = stations.filter(s => s.pricing && s.pricing.perUnit)
            .sort((a, b) => (a.pricing.perUnit || 999) - (b.pricing.perUnit || 999));
          
          if (stations.length === 0) {
            return addMessage(msgContainer, '❌ No pricing information available.');
          }
          
          addMessage(msgContainer, `💰 <strong>Most Affordable Stations:</strong>`);
          stations.slice(0, 5).forEach((s, i) => {
            addMessage(msgContainer, `${i + 1}. <strong>${s.name}</strong> - ₹${s.pricing.perUnit}/kWh - ${s.address?.area || 'Jaipur'}`);
          });
          
        } else if (criterion === 'best') {
          // Sort by: Available status + most amenities + public access
          stations = stations.map(s => {
            let score = 0;
            if (s.status === 'Available') score += 10;
            if (s.accessType === 'Public') score += 5;
            if (s.chargingSpeed === 'Ultra Fast') score += 3;
            else if (s.chargingSpeed === 'Fast') score += 2;
            if (s.amenities) {
              score += Object.values(s.amenities).filter(v => v === true).length;
            }
            return { ...s, score };
          }).sort((a, b) => b.score - a.score);
          
          addMessage(msgContainer, `⭐ <strong>Top Recommended Stations:</strong>`);
          stations.slice(0, 5).forEach((s, i) => {
            const statusIcon = s.status === 'Available' ? '🟢' : '🟡';
            addMessage(msgContainer, `${i + 1}. ${statusIcon} <strong>${s.name}</strong> - ${s.chargingSpeed} - ${s.address?.area || 'Jaipur'}`);
          });
        }
        
        renderQuickReplies(
          stations.slice(0, 3).map(s => ({ label: `Details: ${s.name}`, value: `hours for ${s.name}` }))
        );
      } catch (e) {
        console.error('Recommendation error:', e);
        addMessage(msgContainer, '❌ Error generating recommendations.');
      }
    }

    async function handleUserInput(raw){
      // Handle booking flow state
      if (context.bookingFlow) {
        return handleBookingFlowStep(raw);
      }
      
      // Handle special action values
      if (raw.startsWith('compare-first:')) {
        const firstStation = raw.replace('compare-first:', '').trim();
        context.compareFirst = firstStation;
        
        const stations = await fetchStations();
        const remaining = stations.filter(s => s.name !== firstStation).slice(0, 10);
        
        addMessage(msgContainer, `Selected: ${firstStation}`);
        addMessage(msgContainer, 'Now select the second station to compare:');
        
        const stationButtons = remaining.map(s => ({
          label: `📍 ${s.name}`,
          value: `compare ${firstStation} and ${s.name}`
        }));
        
        renderQuickReplies(stationButtons);
        return;
      }
      
      const res = replyTo(raw);
      
      // Handle follow-up contexts
      if (context.followup && context.followup.type === 'connector'){
        const stationName = raw.trim();
        const vehicle = context.followup.vehicle;
        context.followup = null;
        return handleConnectorQuery(stationName, vehicle);
      }
      
      if (res == null) return;
      if (typeof res === 'string') { addMessage(msgContainer, res); return; }
      
      // Route to appropriate handlers
      if (res.type === 'action') return handleAction(res);
      if (res.type === 'smart_intent') return handleSmartIntent(res);
      if (res.type === 'intent') return handleIntent(res.intent);
      if (res.type === 'start_booking_flow') return startBookingFlow(res.station);
      if (res.type === 'station_query') return handleStationQuery(res.q, res.field);
      if (res.type === 'book_fill') return handleBookFill(res.data);
      if (res.type === 'connector_query') return handleConnectorQuery(res.station, res.vehicle);
      if (res.type === 'connector_followup') return askStationForConnector(res.vehicle);
      if (res.type === 'check_amenity') return handleCheckAmenity(res.station, res.amenity);
      if (res.type === 'filter_stations') return handleFilterStations(res.filters);
      if (res.type === 'compare_stations') return handleCompareStations(res.stations);
      if (res.type === 'recommend') return handleRecommendation(res.criterion);
      if (res.type === 'fallback') return addMessage(msgContainer, res.text);
      
      // Learn from this interaction
      learnFromInteraction(raw, res.type, conversationContext.lastStation);
    }

    // ===== SMART INTENT HANDLER =====
    async function handleSmartIntent(res) {
      const intent = res.intent;
      const params = res.params || {};
      const confidence = res.confidence || 0;
      
      addMessage(msgContainer, `🤖 Understanding your request... (${Math.round(confidence * 100)}% confident)`);
      
      if (intent === 'find_cheap') {
        return handleRecommendation('cheapest');
      }
      
      if (intent === 'find_fast') {
        addMessage(msgContainer, '⚡ Finding fast charging stations...');
        return handleFilterStations({ speed: 'fast' });
      }
      
      if (intent === 'find_available') {
        addMessage(msgContainer, '🟢 Finding available stations...');
        return handleFilterStations({ status: 'Available' });
      }
      
      if (intent === 'recommend') {
        // Provide personalized recommendation
        const stations = await fetchStations();
        const personalized = getPersonalizedRecommendation(stations, params);
        
        if (personalized) {
          conversationContext.lastStation = personalized.name;
          addMessage(msgContainer, `⭐ <strong>Smart Recommendation:</strong> ${personalized.name}`);
          addMessage(msgContainer, `📍 ${personalized.address?.area || 'Jaipur'}`);
          addMessage(msgContainer, `💰 ${personalized.pricing?.perUnit ? '₹' + personalized.pricing.perUnit + '/kWh' : 'Pricing available'}`);
          addMessage(msgContainer, `\n<em>Reason: ${personalized.reason}</em>`);
          
          renderQuickReplies([
            { label: '📋 Full Details', value: `details for ${personalized.name}` },
            { label: '📅 Book Now', value: `book ${personalized.name}` },
            { label: '⭐ Add to Favorites', value: `add ${personalized.name} to favorites` }
          ]);
        } else {
          addMessage(msgContainer, '🤔 Let me show you all available stations:');
          return handleAction({ action: 'list_stations' });
        }
        return;
      }
      
      if (intent === 'find_cheap_from_context') {
        const stations = params.stations || conversationContext.lastStations;
        if (stations.length === 0) {
          return addMessage(msgContainer, '❌ No stations in context. Try "cheapest station" to search all.');
        }
        
        const sorted = stations.filter(s => s.pricing?.perUnit).sort((a, b) => a.pricing.perUnit - b.pricing.perUnit);
        if (sorted.length > 0) {
          const cheapest = sorted[0];
          conversationContext.lastStation = cheapest.name;
          addMessage(msgContainer, `💰 <strong>Cheapest from the list:</strong> ${cheapest.name} at ₹${cheapest.pricing.perUnit}/kWh`);
          
          renderQuickReplies([
            { label: '📋 Details', value: `details for ${cheapest.name}` },
            { label: '📅 Book', value: `book ${cheapest.name}` }
          ]);
        } else {
          addMessage(msgContainer, '❌ Pricing information not available for these stations.');
        }
        return;
      }
      
      if (intent === 'find_fast_from_context') {
        const stations = params.stations || conversationContext.lastStations;
        const fast = stations.filter(s => s.chargingSpeed === 'Fast' || s.chargingSpeed === 'Ultra Fast');
        
        if (fast.length > 0) {
          addMessage(msgContainer, `⚡ <strong>Fast chargers from the list:</strong>`);
          fast.slice(0, 5).forEach((s, i) => {
            addMessage(msgContainer, `${i + 1}. ${s.name} - ${s.chargingSpeed}`);
          });
        } else {
          addMessage(msgContainer, '❌ No fast chargers in the current list.');
        }
        return;
      }
      
      if (intent === 'help') {
        showSmartHelp();
        return;
      }
    }
    
    // Get personalized recommendation based on user preferences and history
    function getPersonalizedRecommendation(stations, params) {
      if (!stations || stations.length === 0) return null;
      
      let scored = stations.map(s => {
        let score = 0;
        let reasons = [];
        
        // Prefer favorites
        if (userPreferences.favoriteStations.includes(s.name)) {
          score += 50;
          reasons.push('your favorite');
        }
        
        // Prefer previously visited
        if (userPreferences.visitedStations.includes(s.name)) {
          score += 20;
          reasons.push('you visited before');
        }
        
        // Vehicle compatibility
        if (userPreferences.vehicleType && s.connectorTypes) {
          const compatible = compatibilityMap[userPreferences.vehicleType] || [];
          const hasCompatible = s.connectorTypes.some(c => compatible.includes(c));
          if (hasCompatible) {
            score += 30;
            reasons.push(`compatible with your ${userPreferences.vehicleType}`);
          }
        }
        
        // Preferred amenities
        if (userPreferences.preferredAmenities.length > 0 && s.amenities) {
          userPreferences.preferredAmenities.forEach(amenity => {
            if (s.amenities[amenity]) {
              score += 15;
              reasons.push(`has ${amenity}`);
            }
          });
        }
        
        // Available status
        if (s.status === 'Available') {
          score += 25;
          reasons.push('available now');
        }
        
        // Public access
        if (s.accessType === 'Public') {
          score += 10;
        }
        
        // Good pricing
        if (s.pricing?.perUnit && s.pricing.perUnit < 12) {
          score += 20;
          reasons.push('good pricing');
        }
        
        return { ...s, score, reason: reasons.join(', ') || 'matches your criteria' };
      });
      
      scored.sort((a, b) => b.score - a.score);
      return scored[0];
    }
    
    // Show smart help with personalized tips
    function showSmartHelp() {
      addMessage(msgContainer, `🤖 <strong>Smart Assistant Help</strong>\n\nI understand natural language! Try:\n\n<strong>Smart Queries:</strong>\n• "Which one is cheaper?" (after viewing stations)\n• "What about parking?" (after viewing a station)\n• "Book it" (to book the last station)\n• "Compare them" (after listing stations)\n\n<strong>Personalization:</strong>\n• "My vehicle is a car/bike/scooter"\n• "Add [station] to favorites"\n• "Show my favorites"\n\n<strong>Context-Aware:</strong>\nI remember our conversation and can answer follow-up questions without repeating!`);
      
      const personalizedSuggestions = getPersonalizedSuggestions();
      if (personalizedSuggestions.length > 0) {
        addMessage(msgContainer, `\n<strong>Your Personalized Options:</strong>`);
        renderQuickReplies(personalizedSuggestions);
      }
    }

    // ===== INTERACTIVE BOOKING FLOW =====
    async function startBookingFlow(stationHint) {
      context.bookingFlow = {
        step: 'station',
        data: {}
      };
      
      addMessage(msgContainer, '📅 <strong>Let\'s book a charging slot!</strong>');
      addMessage(msgContainer, 'I\'ll guide you through the process. Type "cancel" anytime to stop.');
      
      if (stationHint) {
        // User provided station hint, verify it
        const results = await searchStationsApi(stationHint);
        if (results && results.length > 0) {
          context.bookingFlow.data.station = results[0].name;
          context.bookingFlow.step = 'date';
          addMessage(msgContainer, `✅ Station selected: <strong>${results[0].name}</strong>`);
          askForDate();
          return;
        }
      }
      
      // Ask for station
      addMessage(msgContainer, '<strong>Step 1/5:</strong> Which station would you like to book?');
      const stations = await window.fetchStations();
      
      if (stations && stations.length > 0) {
        const availableStations = stations.filter(s => s.status === 'Available');
        const stationsToShow = availableStations.length > 0 ? availableStations : stations;
        
        renderQuickReplies(
          stationsToShow.slice(0, 8).map(s => ({
            label: `${s.status === 'Available' ? '🟢' : '🟡'} ${s.name}`,
            value: s.name
          }))
        );
      }
    }
    
    function askForDate() {
      addMessage(msgContainer, '<strong>Step 2/5:</strong> When would you like to book?');
      
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(today);
      dayAfter.setDate(dayAfter.getDate() + 2);
      
      const formatDate = (d) => `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
      
      renderQuickReplies([
        { label: '📅 Today', value: 'today' },
        { label: '📅 Tomorrow', value: 'tomorrow' },
        { label: `📅 ${formatDate(dayAfter)}`, value: formatDate(dayAfter) },
        { label: '📅 Custom Date', value: 'custom date' }
      ]);
    }
    
    async function askForTime() {
      addMessage(msgContainer, '<strong>Step 3/5:</strong> What time would you like to charge?');
      
      // Get the selected station to show only available slots
      const stationName = context.bookingFlow.data.station;
      let availableSlots = [];
      
      try {
        const stations = await window.fetchStations();
        const selectedStation = stations.find(s => s.name === stationName);
        
        if (selectedStation) {
          // Get opening hours
          let startHour = 8, endHour = 22; // Default hours
          const openingHours = selectedStation.openingHours || '8 AM - 10 PM';
          
          // Parse opening hours if they're in "HH AM - HH PM" format
          if (openingHours === '24/7') {
            startHour = 0;
            endHour = 23;
          } else if (openingHours.includes('AM') || openingHours.includes('PM')) {
            const [openStr, closeStr] = openingHours.split(' - ');
            startHour = parseHour(openStr);
            endHour = parseHour(closeStr);
          }
          
          // Generate available slots based on station status
          const isStationBusy = selectedStation.status === "Busy";
          
          for (let hour = startHour; hour <= endHour; hour++) {
            for (let minutes of ['00', '30']) {
              // Skip if it would go past closing time
              if (hour === endHour && minutes === '30') continue;
              
              const time = `${hour.toString().padStart(2, '0')}:${minutes}`;
              
              // Check if slot is available (simulate booking logic)
              // If station is busy, fewer slots are available
              const isAvailable = isStationBusy ? Math.random() > 0.7 : Math.random() > 0.3;
              
              if (isAvailable) {
                availableSlots.push(time);
              }
            }
          }
        }
      } catch (e) {
        console.error('Error fetching station data:', e);
      }
      
      // If we couldn't get available slots, provide default time options
      if (availableSlots.length === 0) {
        availableSlots = ['10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
      }
      
      // Smart time suggestions based on current time and available slots
      const hour = new Date().getHours();
      const suggestions = [];
      
      // Filter available slots to show the most relevant ones based on current time
      const relevantSlots = availableSlots.filter(slot => {
        const slotHour = parseInt(slot.split(':')[0]);
        if (hour < 10) {
          return slotHour >= 10 && slotHour <= 14;
        } else if (hour < 14) {
          return slotHour >= 14 && slotHour <= 18;
        } else {
          return slotHour >= 16 && slotHour <= 20;
        }
      });
      
      // Take up to 3 relevant slots
      const slotsToShow = relevantSlots.length > 0 ? relevantSlots.slice(0, 3) : availableSlots.slice(0, 3);
      
      // Add emoji based on time of day
      slotsToShow.forEach(slot => {
        const slotHour = parseInt(slot.split(':')[0]);
        let emoji = '⏰';
        if (slotHour < 12) emoji = '🌅';
        else if (slotHour < 15) emoji = '☀️';
        else if (slotHour < 18) emoji = '🌤️';
        else if (slotHour < 20) emoji = '🌆';
        else emoji = '🌙';
        
        suggestions.push({ label: `${emoji} ${slot}`, value: slot });
      });
      
      suggestions.push({ label: '⏰ Custom Time', value: 'custom time' });
      
      renderQuickReplies(suggestions);
      
      // Store available slots for validation
      context.bookingFlow.availableSlots = availableSlots;
    }
    
    // Helper function to parse hour from "HH AM/PM" format
    function parseHour(timeStr) {
      if (!timeStr) return 8;
      
      const [time, period] = timeStr.trim().split(' ');
      let hour = parseInt(time);
      
      if (period === 'PM' && hour < 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;
      
      return hour;
    }
    
    function askForDuration() {
      addMessage(msgContainer, '<strong>Step 4/5:</strong> How long do you need? (Optional)');
      
      renderQuickReplies([
        { label: '⚡ 30 minutes', value: '30 minutes' },
        { label: '⏱️ 1 hour', value: '1 hour' },
        { label: '⏱️ 2 hours', value: '2 hours' },
        { label: '⏱️ 3 hours', value: '3 hours' },
        { label: '⏭️ Skip', value: 'skip duration' }
      ]);
    }
    
    function askForVehicle() {
      addMessage(msgContainer, '<strong>Step 5/5:</strong> What type of vehicle are you charging?');
      
      renderQuickReplies([
        { label: '🚗 Car', value: 'car' },
        { label: '🏍️ Bike', value: 'bike' },
        { label: '🛵 Scooter', value: 'scooter' },
        { label: '⏭️ Skip', value: 'skip vehicle' }
      ]);
    }
    
    async function handleBookingFlowStep(input) {
      const step = context.bookingFlow.step;
      const data = context.bookingFlow.data;
      const text = input.trim();
      
      if (text.toLowerCase() === 'cancel' || text.toLowerCase() === 'stop') {
        context.bookingFlow = null;
        addMessage(msgContainer, '❌ Booking cancelled.');
        return;
      }
      
      if (step === 'station') {
        // User selected a station
        const results = await searchStationsApi(text);
        if (!results || results.length === 0) {
          addMessage(msgContainer, `❌ Station "${text}" not found. Please try again or type "cancel".`);
          return;
        }
        
        data.station = results[0].name;
        context.bookingFlow.step = 'date';
        addMessage(msgContainer, `✅ Station: <strong>${data.station}</strong>`);
        askForDate();
      }
      else if (step === 'date') {
        const lower = text.toLowerCase();
        let dateVal = null;
        
        if (lower === 'today') {
          dateVal = new Date();
        } else if (lower === 'tomorrow') {
          dateVal = new Date();
          dateVal.setDate(dateVal.getDate() + 1);
        } else if (lower === 'custom date') {
          addMessage(msgContainer, 'Enter date as DD/MM/YYYY (e.g., 20/11/2025):');
          return;
        } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(text)) {
          const parts = text.split('/').map(Number);
          dateVal = new Date(parts[2], parts[1] - 1, parts[0]);
        } else {
          addMessage(msgContainer, '❌ Invalid date. Use DD/MM/YYYY or select from options.');
          askForDate();
          return;
        }
        
        data.date = dateVal;
        context.bookingFlow.step = 'time';
        addMessage(msgContainer, `✅ Date: <strong>${dateVal.toLocaleDateString()}</strong>`);
        askForTime();
      }
      else if (step === 'time') {
        const lower = text.toLowerCase();
        
        if (lower === 'custom time') {
          // Show available slots information
          const availableCount = context.bookingFlow.availableSlots ? context.bookingFlow.availableSlots.length : 0;
          addMessage(msgContainer, `ℹ️ There are <strong>${availableCount} available slots</strong> for this station.`);
          addMessage(msgContainer, 'Enter time as HH:MM (e.g., 14:30 for 2:30 PM):');
          return;
        } else if (/^\d{1,2}:\d{2}$/.test(text)) {
          // Validate that the selected time is in available slots
          const availableSlots = context.bookingFlow.availableSlots || [];
          
          if (availableSlots.length > 0 && !availableSlots.includes(text)) {
            // Find nearest available slot
            const requestedHour = parseInt(text.split(':')[0]);
            const requestedMin = parseInt(text.split(':')[1]);
            const requestedMinutes = requestedHour * 60 + requestedMin;
            
            const nearestSlot = availableSlots.reduce((nearest, slot) => {
              const slotHour = parseInt(slot.split(':')[0]);
              const slotMin = parseInt(slot.split(':')[1]);
              const slotMinutes = slotHour * 60 + slotMin;
              
              const currentDiff = Math.abs(slotMinutes - requestedMinutes);
              const nearestDiff = nearest ? Math.abs(
                (parseInt(nearest.split(':')[0]) * 60 + parseInt(nearest.split(':')[1])) - requestedMinutes
              ) : Infinity;
              
              return currentDiff < nearestDiff ? slot : nearest;
            }, null);
            
            if (nearestSlot) {
              addMessage(msgContainer, `⚠️ Time ${text} is not available. The nearest available slot is <strong>${nearestSlot}</strong>.`);
              addMessage(msgContainer, `Would you like to book at <strong>${nearestSlot}</strong> instead? (Type "yes" or choose a different time)`);
              context.bookingFlow.suggestedTime = nearestSlot;
              return;
            } else {
              addMessage(msgContainer, '❌ No available slots found. Please try another date.');
              askForDate();
              return;
            }
          }
          
          data.time = text;
          context.bookingFlow.step = 'duration';
          addMessage(msgContainer, `✅ Time: <strong>${text}</strong>`);
          askForDuration();
        } else if (lower === 'yes' && context.bookingFlow.suggestedTime) {
          // User accepted the suggested nearest time
          data.time = context.bookingFlow.suggestedTime;
          context.bookingFlow.step = 'duration';
          addMessage(msgContainer, `✅ Time: <strong>${data.time}</strong>`);
          delete context.bookingFlow.suggestedTime;
          askForDuration();
        } else {
          addMessage(msgContainer, '❌ Invalid time. Use HH:MM format or select from available slots.');
          askForTime();
          return;
        }
      }
      else if (step === 'duration') {
        const lower = text.toLowerCase();
        
        if (lower.includes('skip')) {
          data.duration = null;
        } else if (lower.includes('30')) {
          data.duration = 30;
        } else if (lower.includes('1 hour')) {
          data.duration = 60;
        } else if (lower.includes('2 hour')) {
          data.duration = 120;
        } else if (lower.includes('3 hour')) {
          data.duration = 180;
        } else {
          addMessage(msgContainer, '❌ Invalid duration. Select from options or type "skip".');
          askForDuration();
          return;
        }
        
        // Check if vehicle type is already known
        if (userPreferences.vehicleType) {
          data.vehicle = userPreferences.vehicleType;
          addMessage(msgContainer, `✅ Duration: <strong>${data.duration ? data.duration + ' mins' : 'Not specified'}</strong>`);
          addMessage(msgContainer, `ℹ️ Using saved vehicle type: <strong>${data.vehicle}</strong>`);
          
          // Complete booking flow
          context.bookingFlow = null;
          
          addMessage(msgContainer, '✅ <strong>Booking Details Complete!</strong>');
          addMessage(msgContainer, `📍 <strong>Station:</strong> ${data.station}<br>📅 <strong>Date:</strong> ${data.date.toLocaleDateString()}<br>⏰ <strong>Time:</strong> ${data.time}${data.duration ? '<br>⏱️ <strong>Duration:</strong> ' + data.duration + ' mins' : ''}${data.vehicle ? '<br>🚗 <strong>Vehicle:</strong> ' + data.vehicle : ''}`);
          
          // Fill the booking form
          return handleBookFill(data);
        } else {
          // Ask for vehicle type
          addMessage(msgContainer, `✅ Duration: <strong>${data.duration ? data.duration + ' mins' : 'Not specified'}</strong>`);
          context.bookingFlow.step = 'vehicle';
          askForVehicle();
        }
      }
      else if (step === 'vehicle') {
        const lower = text.toLowerCase();
        
        if (lower.includes('skip')) {
          data.vehicle = null;
        } else if (lower.includes('car')) {
          data.vehicle = 'car';
          // Save for future bookings
          userPreferences.vehicleType = 'car';
          saveUserPreferences();
        } else if (lower.includes('bike')) {
          data.vehicle = 'bike';
          userPreferences.vehicleType = 'bike';
          saveUserPreferences();
        } else if (lower.includes('scooter')) {
          data.vehicle = 'scooter';
          userPreferences.vehicleType = 'scooter';
          saveUserPreferences();
        } else {
          addMessage(msgContainer, '❌ Invalid vehicle type. Please select from options or type "skip".');
          askForVehicle();
          return;
        }
        
        // Complete booking flow
        context.bookingFlow = null;
        
        addMessage(msgContainer, '✅ <strong>Booking Details Complete!</strong>');
        addMessage(msgContainer, `📍 <strong>Station:</strong> ${data.station}<br>📅 <strong>Date:</strong> ${data.date.toLocaleDateString()}<br>⏰ <strong>Time:</strong> ${data.time}${data.duration ? '<br>⏱️ <strong>Duration:</strong> ' + data.duration + ' mins' : ''}${data.vehicle ? '<br>🚗 <strong>Vehicle:</strong> ' + data.vehicle : ''}`);
        
        // Fill the booking form
        return handleBookFill(data);
      }
    }

    async function handleConnectorQuery(stationName, vehicle){
      addMessage(msgContainer, `🔍 Checking connector compatibility at <strong>${stationName}</strong>...`);
      
      try {
        const results = await searchStationsApi(stationName);
        if (!results || !results.length) {
          return addMessage(msgContainer, `❌ Station "${stationName}" not found. Please check the name and try again.`);
        }
        
        const station = results[0];
        const connectors = station.connectorTypes || [];
        
        if (connectors && connectors.length > 0){
          let connectorInfo = [`✅ <strong>${station.name}</strong>`, `🔌 <strong>Available Connectors:</strong>`];
          
          connectors.forEach(c => {
            connectorInfo.push(`• ${c.type}: ${c.powerOutput || 'N/A'} (${c.count || 1} port${c.count > 1 ? 's' : ''})`);
          });
          
          // Check vehicle compatibility if specified
          if (vehicle){
            const want = (vehicle === 'car' || vehicle === 'bike' || vehicle === 'scooter') ? vehicle : 'car';
            const supported = compatibilityMap[want] || [];
            const connectorTypes = connectors.map(c => c.type);
            const compatible = connectorTypes.filter(c => 
              supported.some(s => c.toLowerCase().includes(s.toLowerCase()))
            );
            
            connectorInfo.push(`<br>🚗 <strong>For your ${vehicle}:</strong>`);
            if (compatible.length > 0) {
              connectorInfo.push(`✅ Compatible: ${compatible.join(', ')}`);
            } else {
              connectorInfo.push(`⚠️ Limited compatibility. Common ${vehicle} connectors: ${supported.join(', ')}`);
            }
          }
          
          addMessage(msgContainer, connectorInfo.join('<br>'));
          renderQuickReplies([
            { label: `💰 Price`, value: `price at ${station.name}` },
            { label: `📅 Book`, value: `book ${station.name} on today at 14:00` }
          ]);
          return;
        }

        // Fallback if no connector data
        const speed = station.chargingSpeed || 'Standard';
        addMessage(msgContainer, `⚠️ Specific connector details not available for <strong>${station.name}</strong>.<br>⚡ Charging Speed: ${speed}`);
        
        if (vehicle){
          const want = (vehicle === 'car' || vehicle === 'bike' || vehicle === 'scooter') ? vehicle : 'car';
          const supported = compatibilityMap[want] || [];
          addMessage(msgContainer, `💡 Common ${vehicle} connectors: ${supported.join(', ')}`);
        }
        
        renderQuickReplies([
          { label: `📞 Contact Station`, value: `contact for ${station.name}` },
          { label: `💰 Price`, value: `price at ${station.name}` }
        ]);
        
      } catch(e){ 
        console.warn('Connector query error:', e);
        addMessage(msgContainer, `❌ Error checking connectors. Please try again.`);
      }
    }

    function askStationForConnector(vehicle){
      addMessage(msgContainer, `Which station do you want me to check for your ${vehicle}? Please type the station name.`);
      // store follow-up context
      context.followup = { type: 'connector', vehicle };
    }

    // Prefill booking form if on booking page and provide confirm button in chat
    function handleBookFill(data){
      const { station, date, time, duration, vehicle } = data;
      
      // Check if we're on the booking page
      const bookingPageStationSelect = document.getElementById('station-select');
      const isOnBookingPage = !!bookingPageStationSelect;

      if (!isOnBookingPage) {
        // Not on booking page - navigate there and store booking data
        addMessage(msgContainer, `📋 Preparing booking for <strong>${station}</strong>...`);
        addMessage(msgContainer, `🔄 Opening booking page...`);
        
        // Store booking data in session storage for the booking page to pick up
        sessionStorage.setItem('pending_booking', JSON.stringify({
          station, date: date ? date.toISOString() : null, time, duration, vehicle
        }));
        
        // Navigate to booking page after a short delay
        setTimeout(() => {
          window.location.href = '/booking.html';
        }, 1000);
        return;
      }

      // We're on the booking page - fill the form
      addMessage(msgContainer, `📋 Filling booking form for <strong>${station}</strong>...`);

      try {
        const bookingDateInput = document.getElementById('booking-date');
        const durationSelect = document.getElementById('duration');
        const vehicleRadios = document.getElementsByName('vehicle-type');

        if (bookingPageStationSelect) {
          // select closest matching station
          const opt = Array.from(bookingPageStationSelect.options).find(o => o.value.toLowerCase().includes(station.toLowerCase()) || o.text.toLowerCase().includes(station.toLowerCase()));
          if (opt) { 
            bookingPageStationSelect.value = opt.value; 
            bookingPageStationSelect.dispatchEvent(new Event('change'));
            addMessage(msgContainer, `✅ Station selected: ${opt.text}`);
          }
        }

        if (bookingDateInput && date instanceof Date && !isNaN(date)) {
          bookingDateInput.value = date.toISOString().split('T')[0];
          addMessage(msgContainer, `✅ Date set: ${date.toLocaleDateString()}`);
        }

        if (duration && durationSelect) {
          // map minutes to select value if present
          const opt = Array.from(durationSelect.options).find(o => o.value === String(duration) || o.text.toLowerCase().includes(String(duration)));
          if (opt) {
            durationSelect.value = opt.value;
            addMessage(msgContainer, `✅ Duration set: ${opt.text}`);
          }
        }

        if (vehicle && vehicleRadios && vehicleRadios.length){
          Array.from(vehicleRadios).forEach(r => { if (r.value === vehicle) r.checked = true; });
          addMessage(msgContainer, `✅ Vehicle type: ${vehicle}`);
        }
        
        // Trigger slot generation after station and duration are set
        // This needs to happen after both station and duration are selected
        if (duration && durationSelect) {
          durationSelect.dispatchEvent(new Event('change'));
        }
        
        // Select the time slot after a delay to ensure slots are generated
        if (time) {
          setTimeout(() => {
            const timeSlots = document.querySelectorAll('.time-slot');
            const slotsArray = Array.from(timeSlots);
            
            console.log('=== Time Slot Selection Debug ===');
            console.log('Available time slots:', slotsArray.map(s => s.dataset.time));
            console.log('Looking for time:', time);
            console.log('Total slots found:', slotsArray.length);
            
            // If no slots generated, notify user
            if (slotsArray.length === 0) {
              addMessage(msgContainer, `⚠️ Time slots not loaded yet. Please wait a moment and select the time slot manually.`);
              return;
            }
            
            const matchingSlotIndex = slotsArray.findIndex(slot => 
              slot.dataset.time === time || slot.textContent.trim() === time
            );
            
            const matchingSlot = matchingSlotIndex >= 0 ? slotsArray[matchingSlotIndex] : null;
            
            // Helper function to find nearest available slot
            const findNearestAvailable = (fromIndex) => {
              // Try next slot first
              for (let i = fromIndex + 1; i < slotsArray.length; i++) {
                if (!slotsArray[i].classList.contains('booked')) {
                  return { slot: slotsArray[i], direction: 'next' };
                }
              }
              // Try previous slot
              for (let i = fromIndex - 1; i >= 0; i--) {
                if (!slotsArray[i].classList.contains('booked')) {
                  return { slot: slotsArray[i], direction: 'previous' };
                }
              }
              return null;
            };
            
            if (matchingSlot && !matchingSlot.classList.contains('booked')) {
              matchingSlot.click();
              addMessage(msgContainer, `✅ Time slot selected: ${time}`);
              addMessage(msgContainer, `✅ Form filled! Review the details and click the booking button on the page.`);
            } else if (matchingSlot && matchingSlot.classList.contains('booked')) {
              // Slot found but booked - find nearest available
              const nearest = findNearestAvailable(matchingSlotIndex);
              if (nearest) {
                nearest.slot.click();
                addMessage(msgContainer, `⚠️ Time slot ${time} was booked. Selected ${nearest.direction} available slot: ${nearest.slot.dataset.time}`);
                addMessage(msgContainer, `✅ Form filled! Review the details and click the booking button on the page.`);
              } else {
                addMessage(msgContainer, `⚠️ Time slot ${time} is already booked and no nearby slots available. Please select a time manually.`);
              }
            } else {
              // Slot not found - try to find any available slot intelligently
              console.log('Slot not found, searching for alternatives...');
              
              // First, try to find any available slot
              const anyAvailable = slotsArray.find(slot => !slot.classList.contains('booked'));
              
              if (anyAvailable) {
                // Parse requested time to find closest match
                const targetTime = time.split(':').map(Number);
                const targetMinutes = targetTime[0] * 60 + (targetTime[1] || 0);
                
                // Find available slots sorted by proximity to requested time
                const availableSlots = slotsArray
                  .map((slot, idx) => {
                    if (slot.classList.contains('booked')) return null;
                    const slotTime = (slot.dataset.time || '').split(':').map(Number);
                    const slotMinutes = slotTime[0] * 60 + (slotTime[1] || 0);
                    const diff = Math.abs(slotMinutes - targetMinutes);
                    return { slot, idx, diff, time: slot.dataset.time };
                  })
                  .filter(s => s !== null)
                  .sort((a, b) => a.diff - b.diff);
                
                if (availableSlots.length > 0) {
                  const bestSlot = availableSlots[0];
                  bestSlot.slot.click();
                  addMessage(msgContainer, `⚠️ Time slot ${time} not found. Selected nearest available slot: ${bestSlot.time}`);
                  addMessage(msgContainer, `✅ Form filled! Review the details and click the booking button on the page.`);
                } else {
                  addMessage(msgContainer, `⚠️ No available time slots found. Please select a time slot manually.`);
                }
              } else {
                addMessage(msgContainer, `⚠️ Time slot ${time} not found and no available slots. Please select a time slot manually.`);
              }
            }
          }, 1500); // Increased delay to ensure slots are fully generated
        } else {
          addMessage(msgContainer, `✅ Form filled! Review the details and click the booking button on the page.`);
        }
      } catch(e){ 
        console.warn('Prefill booking failed', e);
        addMessage(msgContainer, `⚠️ Error filling form. Please fill manually.`);
      }
    }

    // Helper functions for action prompts
    async function promptForStation(action, msgContainer) {
      const actionLabels = {
        'amenities': 'Check Amenities',
        'pricing': 'View Pricing',
        'contact': 'Contact Info',
        'connectors': 'Connector Types'
      };
      
      addMessage(msgContainer, actionLabels[action] || action, 'user');
      
      const stations = await fetchStations();
      if (!stations || stations.length === 0) {
        addMessage(msgContainer, '❌ No stations available at the moment.');
        return;
      }
      
      addMessage(msgContainer, `Select a station to view ${actionLabels[action].toLowerCase()}:`);
      
      const stationButtons = stations.slice(0, 10).map(s => ({
        label: `📍 ${s.name}`,
        value: `${action === 'amenities' ? 'amenities' : action === 'pricing' ? 'price' : action === 'contact' ? 'contact' : 'connectors'} at ${s.name}`
      }));
      
      renderQuickReplies(stationButtons);
    }
    
    async function promptForComparison(msgContainer) {
      addMessage(msgContainer, 'Compare Stations', 'user');
      
      const stations = await fetchStations();
      if (!stations || stations.length < 2) {
        addMessage(msgContainer, '❌ Need at least 2 stations to compare.');
        return;
      }
      
      addMessage(msgContainer, 'Select the first station to compare:');
      
      const stationButtons = stations.slice(0, 10).map(s => ({
        label: `📍 ${s.name}`,
        value: `compare-first:${s.name}`
      }));
      
      renderQuickReplies(stationButtons);
    }
    
    async function promptForBooking(msgContainer) {
      addMessage(msgContainer, 'Book a Slot', 'user');
      
      const stations = await fetchStations();
      if (!stations || stations.length === 0) {
        addMessage(msgContainer, '❌ No stations available for booking.');
        return;
      }
      
      addMessage(msgContainer, 'Select a station to book:');
      
      const stationButtons = stations.slice(0, 10).map(s => ({
        label: `📍 ${s.name}`,
        value: `book ${s.name}`
      }));
      
      renderQuickReplies(stationButtons);
    }
    
    async function showFilterOptions(msgContainer) {
      addMessage(msgContainer, 'Filter Stations', 'user');
      
      addMessage(msgContainer, 'Choose a filter option:');
      
      renderQuickReplies([
        { label: '🌐 Public Stations', value: 'show public stations' },
        { label: '🔒 Private Stations', value: 'show private stations' },
        { label: '⚡ Fast Chargers', value: 'show fast chargers' },
        { label: '🔋 Slow Chargers', value: 'show slow chargers' },
        { label: '🟢 Available Now', value: 'show available stations' },
        { label: '🅿️ With Parking', value: 'stations with parking' },
        { label: '☕ With Cafe', value: 'stations with cafe' },
        { label: '📶 With WiFi', value: 'stations with wifi' }
      ]);
    }

    // ===== INITIALIZE SMART FEATURES =====
    loadUserPreferences();
    
    // Proactive time-based suggestions
    function getTimeBasedGreeting() {
      const hour = new Date().getHours();
      let greeting = '👋 Hello';
      let suggestion = '';
      
      if (hour >= 5 && hour < 12) {
        greeting = '☀️ Good morning';
        suggestion = 'Morning rush? Find available stations near you!';
      } else if (hour >= 12 && hour < 17) {
        greeting = '🌤️ Good afternoon';
        suggestion = 'Need a quick charge? Check out our fast chargers!';
      } else if (hour >= 17 && hour < 21) {
        greeting = '🌆 Good evening';
        suggestion = 'Evening commute? Find stations with the best amenities!';
      } else {
        greeting = '🌙 Good night';
        suggestion = 'Late night charging? Most stations are 24/7!';
      }
      
      return { greeting, suggestion };
    }
    
    // Event listeners
    if (isEmbeddedMode) {
      // Try to load previous chat history
      const historyLoaded = loadChatHistory(msgContainer);
      
      if (!historyLoaded) {
        // No history - show smart welcome message
        const { greeting, suggestion } = getTimeBasedGreeting();
        
        let welcomeMsg = `${greeting}! I'm your <strong>Smart EV Assistant 3.0</strong> 🤖\n\n`;
        
        // Personalized greeting if we know the user
        if (userPreferences.vehicleType) {
          welcomeMsg += `I remember you have a <strong>${userPreferences.vehicleType}</strong>! ✅\n\n`;
        }
        
        if (userPreferences.favoriteStations.length > 0) {
          welcomeMsg += `You have <strong>${userPreferences.favoriteStations.length}</strong> favorite station(s). ⭐\n\n`;
        }
        
        welcomeMsg += `<strong>🧠 Smart Features:</strong>\n`;
        welcomeMsg += `• Context-aware conversations\n`;
        welcomeMsg += `• Personalized recommendations\n`;
        welcomeMsg += `• Natural language understanding\n`;
        welcomeMsg += `• Follow-up question support\n\n`;
        welcomeMsg += `<em>${suggestion}</em>`;
        
        addMessage(msgContainer, welcomeMsg);
        
        // Show personalized or default suggestions
        const personalizedSuggestions = getPersonalizedSuggestions();
        const defaultSuggestions = [
          { label: '📍 Find Nearby', value: 'nearby' },
          { label: '📋 List All', value: 'list stations' },
          { label: '💰 Cheapest', value: 'cheapest station' },
          { label: '🎯 Recommend', value: 'recommend best station' }
        ];
        
        renderQuickReplies(personalizedSuggestions.length > 0 ? personalizedSuggestions : defaultSuggestions);
      }
      // If history was loaded, just display it without any message

      // Setup clear chat button
      const clearBtn = document.getElementById('clearChatBtn');
      if (clearBtn) {
        clearBtn.onclick = () => {
          msgContainer.innerHTML = '';
          clearChatHistory();
          addMessage(msgContainer, "👋 Chat cleared! Ready to help you find the perfect charging station.\n\nTry asking:\n• 'cheapest station'\n• 'compare [station1] and [station2]'\n• 'stations with parking'\n• 'amenities at [station]'");
          renderQuickReplies([
            { label: '📍 Find Nearby', value: 'nearby' },
            { label: '📋 List All', value: 'list stations' },
            { label: '💰 Cheapest', value: 'cheapest station' }
          ]);
        };
      }

      // Add click handlers to action buttons on the page
      const exampleButtons = document.querySelectorAll('.chatbot-examples-list li');
      exampleButtons.forEach(li => {
        li.style.cursor = 'pointer';
        li.addEventListener('click', async () => {
          const action = li.getAttribute('data-action');
          if (!action) return;
          
          // Handle different actions
          switch(action) {
            case 'list-stations':
              addMessage(msgContainer, 'List all stations', 'user');
              await handleUserInput('list stations');
              break;
              
            case 'nearby':
              addMessage(msgContainer, 'Find nearby stations', 'user');
              await handleUserInput('nearby');
              break;
              
            case 'cheapest':
              addMessage(msgContainer, 'Show cheapest station', 'user');
              await handleUserInput('cheapest station');
              break;
              
            case 'amenities':
            case 'pricing':
            case 'contact':
            case 'connectors':
              // These need station selection
              await promptForStation(action, msgContainer);
              break;
              
            case 'compare':
              await promptForComparison(msgContainer);
              break;
              
            case 'booking':
              await promptForBooking(msgContainer);
              break;
              
            case 'filters':
              await showFilterOptions(msgContainer);
              break;
              
            default:
              addMessage(msgContainer, li.textContent.trim(), 'user');
              await handleUserInput(li.textContent.trim());
          }z
        });
      });
    } else {
      // Widget mode - toggle functionality
      toggle.addEventListener('click', () => {
        if (win.style.display === 'none') {
          win.style.display = 'flex';
          
          // Try to load history
          const historyLoaded = loadChatHistory(msgContainer);
          if (!historyLoaded) {
            addMessage(msgContainer, "👋 Hi! I'm your EV Assistant. Ask me about pricing, amenities, or find the best stations near you!");
            renderQuickReplies([
              { label: '📍 Nearby', value: 'nearby' },
              { label: '📋 List All', value: 'list stations' },
              { label: '💰 Cheapest', value: 'cheapest station' }
            ]);
          }
        } else {
          win.style.display = 'none';
        }
      });
      
      // Check for pending booking from navigation
      const pendingBookingData = sessionStorage.getItem('pending_booking');
      if (pendingBookingData) {
        try {
          const bookingData = JSON.parse(pendingBookingData);
          
          // Open the widget automatically
          win.style.display = 'flex';
          
          // Add a message showing we're processing the booking
          addMessage(msgContainer, `🔄 Completing your booking request...`);
          
          // Parse the date back to Date object if present
          if (bookingData.date) {
            bookingData.date = new Date(bookingData.date);
          }
          
          // Small delay to ensure booking form is loaded, then fill it
          setTimeout(() => {
            handleBookFill(bookingData);
            // Clear the pending booking
            sessionStorage.removeItem('pending_booking');
          }, 500);
          
        } catch(e) {
          console.error('Error processing pending booking:', e);
          sessionStorage.removeItem('pending_booking');
        }
      }
    }

    send.addEventListener('click', async () => {
      const v = input.value.trim();
      if (!v) return;
      addMessage(msgContainer, v, 'user');
      input.value = '';
      await handleUserInput(v);
    });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { send.click(); }
      });
      
      // Smart session analytics
      setInterval(() => {
        const sessionDuration = Date.now() - conversationContext.sessionStartTime;
        if (sessionDuration > 300000 && conversationContext.messageCount > 5) {
          // After 5 minutes and 5+ messages, offer help
          if (conversationContext.messageCount % 10 === 0) {
            addMessage(msgContainer, '💡 <em>Tip: You can ask follow-up questions like "What about parking?" or "Which one is cheaper?" - I remember our conversation!</em>');
          }
        }
      }, 60000); // Check every minute
    }  // Wait until DOM ready
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
