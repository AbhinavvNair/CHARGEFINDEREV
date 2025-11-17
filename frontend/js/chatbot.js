(function(){
  // ===== COMPREHENSIVE CHATBOT v2.0 =====
  // Enhanced with support for 20+ station fields, smart filtering, comparisons, and rich responses
  
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
    const text = input.trim();
    if (!text) return "Please type something so I can help.";

    const t = text.toLowerCase();

    // ===== BOOKING COMMAND =====
    const bookMatch = t.match(/book\s+(.+?)\s+on\s+(today|tomorrow|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+(\d{1,2}:\d{2})(?:\s+for\s+([0-9]+)\s*(min|mins|minutes|h|hrs|hours)?)?(?:.*\b(car|bike|scooter)\b)?/i);
    if (bookMatch) {
      const station = bookMatch[1].trim();
      let dateStr = bookMatch[2].trim();
      const time = bookMatch[3].trim();
      const durNum = bookMatch[4];
      const durUnit = bookMatch[5] || '';
      const vehicle = (bookMatch[6] || '').toLowerCase();

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
      const action = (typeof actionObj === 'string') ? actionObj : (actionObj.action || null);
      const payload = (typeof actionObj === 'object') ? actionObj : {};

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
        
        renderQuickReplies([
          { label: '🌐 Public Only', value: 'show public stations' },
          { label: '💰 Cheapest', value: 'cheapest station' },
          { label: '🟢 Available', value: 'available stations' },
          { label: '⚡ Fast Charging', value: 'fast charging stations' }
        ]);
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
          renderQuickReplies([
            { label: `📅 Hours`, value: `hours for ${s.name}` },
            { label: `🎯 Amenities`, value: `amenities at ${s.name}` },
            { label: `📅 Book`, value: `book ${s.name} on today at 10:00` }
          ]);
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
        
        const filterDesc = Object.entries(filters).map(([k, v]) => `${v}`).join(', ');
        addMessage(msgContainer, `✅ Found ${stations.length} <strong>${filterDesc}</strong> station(s):`);
        
        stations.slice(0, 8).forEach(s => {
          const accessIcon = s.accessType === 'Public' ? '🌐' : s.accessType === 'Private' ? '🔒' : '🔓';
          const statusIcon = s.status === 'Available' ? '🟢' : s.status === 'Busy' ? '🟡' : '🔴';
          addMessage(msgContainer, `${accessIcon} ${statusIcon} <strong>${s.name}</strong> - ${s.chargingSpeed || 'Standard'} - ${s.address?.area || 'Jaipur'}`);
        });
        
        renderQuickReplies(
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
      if (res.type === 'intent') return handleIntent(res.intent);
      if (res.type === 'station_query') return handleStationQuery(res.q, res.field);
      if (res.type === 'book_fill') return handleBookFill(res.data);
      if (res.type === 'connector_query') return handleConnectorQuery(res.station, res.vehicle);
      if (res.type === 'connector_followup') return askStationForConnector(res.vehicle);
      if (res.type === 'check_amenity') return handleCheckAmenity(res.station, res.amenity);
      if (res.type === 'filter_stations') return handleFilterStations(res.filters);
      if (res.type === 'compare_stations') return handleCompareStations(res.stations);
      if (res.type === 'recommend') return handleRecommendation(res.criterion);
      if (res.type === 'fallback') return addMessage(msgContainer, res.text);
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
            durationSelect.dispatchEvent(new Event('change'));
            addMessage(msgContainer, `✅ Duration set: ${opt.text}`);
          }
        }

        if (vehicle && vehicleRadios && vehicleRadios.length){
          Array.from(vehicleRadios).forEach(r => { if (r.value === vehicle) r.checked = true; });
          addMessage(msgContainer, `✅ Vehicle type: ${vehicle}`);
        }
        
        // Select the time slot after a small delay to ensure slots are generated
        if (time) {
          setTimeout(() => {
            const timeSlots = document.querySelectorAll('.time-slot');
            console.log('Available time slots:', Array.from(timeSlots).map(s => s.dataset.time));
            console.log('Looking for time:', time);
            
            const matchingSlot = Array.from(timeSlots).find(slot => 
              slot.dataset.time === time || slot.textContent.trim() === time
            );
            
            if (matchingSlot && !matchingSlot.classList.contains('booked')) {
              matchingSlot.click();
              addMessage(msgContainer, `✅ Time slot selected: ${time}`);
              addMessage(msgContainer, `✅ Form filled! Review the details and click the booking button on the page.`);
            } else if (matchingSlot && matchingSlot.classList.contains('booked')) {
              // Find the first available slot as alternative
              const availableSlot = Array.from(timeSlots).find(slot => 
                !slot.classList.contains('booked')
              );
              if (availableSlot) {
                availableSlot.click();
                addMessage(msgContainer, `⚠️ Time slot ${time} was booked. Selected ${availableSlot.dataset.time} instead.`);
                addMessage(msgContainer, `✅ Form filled! Review the details and click the booking button on the page.`);
              } else {
                addMessage(msgContainer, `⚠️ Time slot ${time} is already booked and no slots available. Please select a time manually.`);
              }
            } else {
              // Slot not found, try to find first available
              const availableSlot = Array.from(timeSlots).find(slot => 
                !slot.classList.contains('booked')
              );
              if (availableSlot) {
                availableSlot.click();
                addMessage(msgContainer, `⚠️ Time slot ${time} not found. Selected ${availableSlot.dataset.time} instead.`);
                addMessage(msgContainer, `✅ Form filled! Review the details and click the booking button on the page.`);
              } else {
                addMessage(msgContainer, `⚠️ Time slot ${time} not found. Please select a time slot manually.`);
              }
            }
          }, 1200);
        } else {
          addMessage(msgContainer, `✅ Form filled! Review the details and click the booking button on the page.`);
        }
      } catch(e){ 
        console.warn('Prefill booking failed', e);
        addMessage(msgContainer, `⚠️ Error filling form. Please fill manually.`);
      }
    }

    // Event listeners
    if (isEmbeddedMode) {
      // Try to load previous chat history
      const historyLoaded = loadChatHistory(msgContainer);
      
      if (!historyLoaded) {
        // No history - show welcome message
        addMessage(msgContainer, "👋 Hello! I'm your EV Charging Assistant 2.0. I can help you with:\n\n🔍 <strong>Search & Filter</strong> - Find stations by location, price, amenities\n💰 <strong>Pricing Details</strong> - Compare rates, peak/off-peak pricing\n📊 <strong>Smart Comparisons</strong> - Compare multiple stations\n📅 <strong>Quick Booking</strong> - Book slots instantly\n🎯 <strong>Amenities</strong> - Find stations with parking, wifi, cafe\n\nWhat would you like to do?");
        renderQuickReplies([
          { label: '📍 Find Nearby', value: 'nearby' },
          { label: '📋 List All', value: 'list stations' },
          { label: '💰 Cheapest', value: 'cheapest station' },
          { label: '🎯 Best For Me', value: 'best station' }
        ]);
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

      // Add click handlers to example buttons on the page
      const exampleButtons = document.querySelectorAll('.chatbot-examples-list li');
      exampleButtons.forEach(li => {
        li.style.cursor = 'pointer';
        li.addEventListener('click', () => {
          const val = li.getAttribute('data-value') || li.textContent.trim();
          addMessage(msgContainer, val, 'user');
          handleUserInput(val);
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
  }

  // Wait until DOM ready
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
