(function(){
  // Enhanced rule-based chatbot for the frontend only
  // We'll keep everything client-side and call the existing stations API when needed.

  const synonyms = {
    greeting: ['hello','hi','hey','yo'],
    duration: ['duration','how long','for how long','time length','length'],
    vehicle_type: ['vehicle type','vehicle','which vehicle','what vehicle','type of vehicle'],
    hours: ['hours','open','opening','when open','timings'],
    book: ['book','booking','reserve','reserve a slot'],
    price: ['price','cost','fee','charge','charges','rate','rates'],
    nearby: ['nearby','near me','closest','closest to me','near'],
    stations: ['stations','list stations','show stations','station list']
  };

  const defaultReplies = {
    greeting: "Hi! I'm the Jaipur EV assistant. I can help with bookings, station info, prices and directions.",
    duration: "Here are common charging session durations: 30 minutes, 1 hour, 2 hours.",
    vehicle_type: "Vehicle types: Electric car, Electric bike, Electric scooter.",
    hours: "Most stations show opening hours on their detail page. Tell me a station name and I can fetch it for you.",
    book: "To book a slot open the Booking page and select a station, date and time. Which station would you like to book?",
    price: "Prices vary by station. If you tell me a station name I can look up its rates.",
    nearby: "I can show nearby stations — allow location access and ask 'nearby' or 'stations near me'. Would you like me to search now?",
    support: "You can reach support through the Contact page, or tell me the issue and I'll create a suggestion (frontend only)."
  };

  // Basic compatibility map (vehicle type -> typical connector types)
  const compatibilityMap = {
    car: ['CCS', 'CHAdeMO', 'Type 2'],
    bike: ['Type 2', 'Type 1'],
    scooter: ['Type 1', 'Type 2']
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

    // Simple intent detection using keywords + synonyms
    const t = text.toLowerCase();

    // booking command: book <station> on <date> at <time> [for <duration>] [<vehicle>]
    const bookMatch = t.match(/book\s+(.+?)\s+on\s+(today|tomorrow|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+(\d{1,2}:\d{2})(?:\s+for\s+([0-9]+)\s*(min|mins|minutes|h|hrs|hours)?)?(?:.*\b(car|bike|scooter)\b)?/i);
    if (bookMatch) {
      const station = bookMatch[1].trim();
      let dateStr = bookMatch[2].trim();
      const time = bookMatch[3].trim();
      const durNum = bookMatch[4];
      const durUnit = bookMatch[5] || '';
      const vehicle = (bookMatch[6] || '').toLowerCase();

      // normalize date
      let dateVal = null;
      if (/^today$/i.test(dateStr)) dateVal = new Date();
      else if (/^tomorrow$/i.test(dateStr)) { dateVal = new Date(); dateVal.setDate(dateVal.getDate() + 1); }
      else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) dateVal = new Date(dateStr);
      else if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(dateStr)) {
        const parts = dateStr.split('/').map(Number);
        // assume mm/dd/yyyy or dd/mm/yyyy ambiguous; try mm/dd/yyyy first
        dateVal = new Date(parts[2] || parts[1] || new Date().getFullYear(), (parts[0]-1), parts[1]);
      }

      // normalize duration to minutes
      let durationMins = null;
      if (durNum) {
        durationMins = parseInt(durNum, 10);
        if (durUnit && /h|hr/.test(durUnit)) durationMins = durationMins * 60;
      }

      const payload = { station, date: dateVal, time, duration: durationMins, vehicle };
      return { type: 'book_fill', data: payload };
    }

    // show slots / available slots
    if (/\b(show|available|list)\s+slots\b/i.test(t) || /\bslots\b/i.test(t) && /available|show|list/.test(t)){
      return { type: 'action', action: 'show_slots' };
    }

    // select slot HH:MM
    const selectMatch = t.match(/select\s+slot\s+(\d{1,2}:\d{2})/i);
    if (selectMatch) {
      return { type: 'action', action: 'select_slot', time: selectMatch[1] };
    }

    // exact commands
    if (/^list stations$/i.test(text) || (/stations/i.test(t) && /list|show|nearby|search|find/.test(t))) {
      return { type: 'action', action: 'list_stations' };
    }

    if (/^confirm booking$/i.test(text) || /\bconfirm booking\b/i.test(t)) {
      return { type: 'action', action: 'confirm_booking' };
    }

    // HIGH-PRIORITY: station-specific queries (check these before generic synonyms)
    // hours/availability
    const hoursMatch = t.match(/hours for (.+)|is (.+) open|opening hours for (.+)/i);
    if (hoursMatch) {
      const name = (hoursMatch[1] || hoursMatch[2] || hoursMatch[3] || '').trim();
      if (name) return { type: 'station_query', q: name, field: 'hours' };
    }
    // price at <station>
    const priceMatch = t.match(/price (?:at|for) (.+)/i);
    if (priceMatch) {
      const name = priceMatch[1].trim();
      if (name) return { type: 'station_query', q: name, field: 'price' };
    }
    // charging speed
    const speedMatch = t.match(/(?:charging speed|speed) (?:at|for) (.+)/i);
    if (speedMatch) {
      const name = speedMatch[1].trim();
      if (name) return { type: 'station_query', q: name, field: 'speed' };
    }
    // connector queries
    const connMatch = t.match(/connector(?:s)?\s+at\s+(.+?)\s*(?:for\s+(car|bike|scooter|\w+))?$/i);
    if (connMatch) {
      const station = connMatch[1].trim();
      const vehicle = (connMatch[2] || '').toLowerCase();
      return { type: 'connector_query', station, vehicle };
    }

    // check synonyms map
    for (const intent in synonyms){
      for (const word of synonyms[intent]){
        if (t.includes(word)) return { type: 'intent', intent };
      }
    }

    // station-specific question: "is <station> open" or "hours for <station>"
    const m = t.match(/hours for (.+)|is (.+) open|opening hours for (.+)/i);
    if (m) {
      const name = (m[1] || m[2] || m[3] || '').trim();
      if (name) return { type: 'station_query', q: name, field: 'hours' };
    }

    // connector compatibility: 'connector at <station> for <vehicle>' or 'is <vehicle> supported at <station>'
    const conn1 = t.match(/connector(?:s)?\s+at\s+(.+?)\s*(?:for\s+(car|bike|scooter|\w+))?$/i);
    if (conn1) {
      const station = conn1[1] && conn1[1].trim();
      const vehicle = (conn1[2] || '').toLowerCase();
      return { type: 'connector_query', station, vehicle };
    }

    const conn2 = t.match(/is\s+(my\s+)?(car|bike|scooter|\w+)\s+supported(?:\s+at\s+(.+))?/i);
    if (conn2) {
      const vehicle = (conn2[2] || '').toLowerCase();
      const station = (conn2[3] || '').trim();
      if (station) return { type: 'connector_query', station, vehicle };
      // ask follow-up if station missing
      return { type: 'connector_followup', vehicle };
    }

    // fallback
    return { type: 'fallback', text: "I didn't catch that. Try asking 'list stations', 'nearby', 'hours for <station>' or 'price at <station>'." };
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
          <div class="chatbot-messages" id="chatbotMessages"></div>
          <div class="chatbot-input">
            <input type="text" id="chatbotInput" placeholder="Type a question..." />
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
        // Filter by name match
        const results = stations.filter(s => {
          const name = (s.name || s.title || '').toLowerCase();
          const location = (s.location || '').toLowerCase();
          const address = (s.address || '').toLowerCase();
          
          // Check if query matches name, location, or address
          return name.includes(query) || 
                 location.includes(query) || 
                 address.includes(query) ||
                 query.includes(name);
        });
        
        // Sort by relevance (exact matches first)
        results.sort((a, b) => {
          const aName = (a.name || a.title || '').toLowerCase();
          const bName = (b.name || b.title || '').toLowerCase();
          const aExact = aName === query ? 1 : 0;
          const bExact = bName === query ? 1 : 0;
          return bExact - aExact;
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
        // try to find stations on page first
        const names = findStationsList();
        if (names.length){
          addMessage(msgContainer, 'Stations I found on this page: ' + names.slice(0,8).map(n => `<strong>${n}</strong>`).join(', '));
          renderQuickReplies(names.slice(0,5).map(n=>({ label: `Details: ${n}`, value: `hours for ${n}`})));
          return;
        }

        // otherwise fetch from backend
        addMessage(msgContainer, 'Searching stations...');
        const stations = await window.fetchStations();
        if (!stations || stations.length === 0) return addMessage(msgContainer, 'No stations available right now.');
        const names2 = stations.slice(0,8).map(s=>s.name || s.title || s._id || 'unnamed');
        context.lastStationSearch = stations;
        addMessage(msgContainer, 'Stations: ' + names2.map(n=>`<strong>${n}</strong>`).join(', '));
        renderQuickReplies(names2.slice(0,5).map(n=>({ label: `Details: ${n}`, value: `hours for ${n}`})));
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
            { label: 'List stations', value: 'list stations' },
            { label: 'Duration options', value: 'duration' },
            { label: 'Find nearby', value: 'nearby' }
          ]);
          break;
        case 'duration':
          // respond with static durations
          addMessage(msgContainer, defaultReplies.duration);
          renderQuickReplies([
            { label: '30 minutes', value: '30 minutes' },
            { label: '1 hour', value: '1 hour' },
            { label: '2 hours', value: '2 hours' }
          ]);
          break;
        case 'hours':
          addMessage(msgContainer, defaultReplies.hours);
          addMessage(msgContainer, 'Try: "hours for <station name>" or click a station below to fetch details.');
          break;
        case 'book':
          addMessage(msgContainer, defaultReplies.book);
          addMessage(msgContainer, `<a href="/booking.html">Open Booking page</a>`);
          break;
        case 'price':
          addMessage(msgContainer, defaultReplies.price);
          break;
        case 'nearby':
          // try to use geolocation
          if (navigator.geolocation){
            addMessage(msgContainer, 'Requesting location access...');
            navigator.geolocation.getCurrentPosition(async (pos)=>{
              const { latitude, longitude } = pos.coords;
              addMessage(msgContainer, `Found your location! Searching nearby stations...`);
              
              // Get all stations and calculate distances
              try {
                const stations = await window.fetchStations();
                if (!stations || !stations.length) {
                  addMessage(msgContainer, 'No stations available. Try the Stations page.');
                  return;
                }
                
                // Calculate distances and sort
                const withDistance = stations.map(s => {
                  const lat = s.latitude || s.lat || 0;
                  const lng = s.longitude || s.lng || 0;
                  const distance = calculateDistance(latitude, longitude, lat, lng);
                  return { ...s, distance };
                }).sort((a, b) => a.distance - b.distance);
                
                const nearby = withDistance.slice(0, 5);
                if (nearby.length) {
                  addMessage(msgContainer, '<strong>Nearby stations:</strong>');
                  nearby.forEach(s => {
                    const dist = s.distance < 1 ? `${Math.round(s.distance * 1000)}m` : `${s.distance.toFixed(1)}km`;
                    addMessage(msgContainer, `📍 <strong>${s.name || s.title}</strong> - ${dist} away`);
                  });
                  renderQuickReplies(nearby.slice(0, 3).map(s => ({
                    label: `Details: ${s.name || s.title}`,
                    value: `hours for ${s.name || s.title}`
                  })));
                } else {
                  addMessage(msgContainer, 'No nearby stations found.');
                }
              } catch (e){
                console.error('Nearby search error:', e);
                addMessage(msgContainer, 'Error searching nearby stations. Showing all stations instead.');
                handleAction('list_stations');
              }
            }, (err)=> {
              console.error('Geolocation error:', err);
              addMessage(msgContainer, '⚠️ Location access denied or unavailable. This feature requires HTTPS or localhost.');
              addMessage(msgContainer, 'Showing all available stations instead:');
              handleAction('list_stations');
            });
          } else {
            addMessage(msgContainer, 'Geolocation is not supported by your browser. Showing all stations:');
            handleAction('list_stations');
          }
          break;
        default:
          addMessage(msgContainer, "I can help with bookings, hours, prices, and station searches.");
      }
    }

    async function handleStationQuery(q, field){
      addMessage(msgContainer, `Searching for <strong>${q}</strong>...`);
      // First try search endpoint
      const results = await searchStationsApi(q);
      if (results && results.length){
        const s = results[0];
        context.lastStationSearch = results;
        
        if (field === 'hours'){
          const hours = s.openingHours || s.hours || s.opening || '24/7';
          addMessage(msgContainer, `✅ <strong>${s.name || s.title}</strong><br>📅 Hours: ${hours}`);
          renderQuickReplies([
            { label: `Price at ${s.name || s.title}`, value: `price at ${s.name || s.title}` },
            { label: 'Book this station', value: `book ${s.name || s.title} on today at 10:00` }
          ]);
          return;
        }
        if (field === 'price'){
          const price = s.price || s.rate || s.pricing || null;
          if (price) {
            addMessage(msgContainer, `✅ <strong>${s.name || s.title}</strong><br>💰 Price: ${price}`);
          } else {
            addMessage(msgContainer, `✅ <strong>${s.name || s.title}</strong><br>💰 Price: Contact station for pricing details`);
          }
          renderQuickReplies([
            { label: `Hours for ${s.name || s.title}`, value: `hours for ${s.name || s.title}` },
            { label: 'Book this station', value: `book ${s.name || s.title} on today at 10:00` }
          ]);
          return;
        }
        if (field === 'speed'){
          const speed = s.chargingSpeed || s.speed || 'Standard';
          addMessage(msgContainer, `✅ <strong>${s.name || s.title}</strong><br>⚡ Charging speed: ${speed}`);
          renderQuickReplies([
            { label: `Book ${s.name || s.title}`, value: `book ${s.name || s.title} on today at 10:00` }
          ]);
          return;
        }

        // generic display
        const info = [`✅ <strong>${s.name || s.title}</strong>`];
        if (s.location) info.push(`📍 ${s.location}`);
        if (s.chargingSpeed) info.push(`⚡ ${s.chargingSpeed}`);
        if (s.openingHours) info.push(`📅 ${s.openingHours}`);
        addMessage(msgContainer, info.join('<br>'));
        renderQuickReplies([
          { label: 'Book this station', value: `book ${s.name || s.title} on today at 10:00` }
        ]);
      } else {
        // Get all stations to show suggestions
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

    async function handleUserInput(raw){
      const res = replyTo(raw);
      // handle follow-up: if bot previously asked for station for connector
      if (context.followup && context.followup.type === 'connector'){
        const stationName = raw.trim();
        const vehicle = context.followup.vehicle;
        // clear followup
        context.followup = null;
        return handleConnectorQuery(stationName, vehicle);
      }
      if (res == null) return;
      if (typeof res === 'string') { addMessage(msgContainer, res); return; }
      // pass the full action object so payloads (like time) are preserved
      if (res.type === 'action') return handleAction(res);
      if (res.type === 'intent') return handleIntent(res.intent);
      if (res.type === 'station_query') return handleStationQuery(res.q, res.field);
      if (res.type === 'book_fill') return handleBookFill(res.data);
      if (res.type === 'connector_query') return handleConnectorQuery(res.station, res.vehicle);
      if (res.type === 'connector_followup') return askStationForConnector(res.vehicle);
      if (res.type === 'fallback') return addMessage(msgContainer, res.text);
    }

    async function handleConnectorQuery(stationName, vehicle){
      addMessage(msgContainer, `Checking connector support at <strong>${stationName}</strong> for <strong>${vehicle || 'your vehicle'}</strong>...`);
      // try to find station data locally first
      let station = null;
      try {
        // check stations on page
        const nodes = document.querySelectorAll('.station-card h3, .station-card h2, .station-header h3');
        const names = Array.from(nodes).map(n => n.textContent.trim()).filter(Boolean);
        const match = names.find(n => n.toLowerCase().includes(stationName.toLowerCase()));
        if (match){
          // attempt to fetch details via searchStationsApi
          const results = await searchStationsApi(match);
          if (results && results.length) station = results[0];
        } else {
          const results = await searchStationsApi(stationName);
          if (results && results.length) station = results[0];
        }
      } catch(e){ console.warn('connector lookup error', e); }

      // if station has explicit connectors field, use it; otherwise fallback to chargingSpeed heuristics
      if (station){
        const connectors = station.connectors || station.connectorsAvailable || station.connectorTypes || null;
        if (connectors && connectors.length){
          // check compatibility if vehicle provided
          if (vehicle){
            const want = (vehicle === 'car' || vehicle === 'bike' || vehicle === 'scooter') ? vehicle : 'car';
            const supported = compatibilityMap[want] || [];
            const intersect = connectors.filter(c => supported.map(s=>s.toLowerCase()).includes(String(c).toLowerCase()));
            if (intersect.length) return addMessage(msgContainer, `This station supports: ${connectors.join(', ')}. Compatible connectors for your ${vehicle}: ${intersect.join(', ')}.`);
            return addMessage(msgContainer, `This station supports: ${connectors.join(', ')}. It may not support common connectors for your ${vehicle}.`);
          }
          return addMessage(msgContainer, `This station supports: ${connectors.join(', ')}.`);
        }

        // fallback to speed heuristic
        const speed = station.chargingSpeed || station.speed || '';
        if (vehicle){
          const want = (vehicle === 'car' || vehicle === 'bike' || vehicle === 'scooter') ? vehicle : 'car';
          const supported = compatibilityMap[want] || [];
          return addMessage(msgContainer, `Station shows charging speed '${speed}'. Typical connectors likely: ${supported.join(', ')} (best-effort).`);
        }
        return addMessage(msgContainer, `Station shows charging speed '${speed}'. Typical connectors might include Type 2, CCS or CHAdeMO depending on the station.`);
      }

      // no station data found
      if (vehicle){
        const want = (vehicle === 'car' || vehicle === 'bike' || vehicle === 'scooter') ? vehicle : 'car';
        return addMessage(msgContainer, `I don't have exact data for that station, but ${want}s commonly use: ${compatibilityMap[want].join(', ')}. Try the Stations page or provide the exact station name.`);
      }
      return addMessage(msgContainer, `I couldn't find that station. Please provide the exact station name as shown on the Stations page.`);
    }

    function askStationForConnector(vehicle){
      addMessage(msgContainer, `Which station do you want me to check for your ${vehicle}? Please type the station name.`);
      // store follow-up context
      context.followup = { type: 'connector', vehicle };
    }

    // Prefill booking form if on booking page and provide confirm button in chat
    function handleBookFill(data){
      const { station, date, time, duration, vehicle } = data;
      addMessage(msgContainer, `I can pre-fill the booking form for <strong>${station}</strong>.`);

      // If we're on the booking page, try to fill fields
      try {
        const bookingPageStationSelect = document.getElementById('station-select');
        const bookingDateInput = document.getElementById('booking-date');
        const durationSelect = document.getElementById('duration');
        const vehicleRadios = document.getElementsByName('vehicle-type');

        if (bookingPageStationSelect) {
          // select closest matching station
          const opt = Array.from(bookingPageStationSelect.options).find(o => o.value.toLowerCase().includes(station.toLowerCase()) || o.text.toLowerCase().includes(station.toLowerCase()));
          if (opt) { bookingPageStationSelect.value = opt.value; bookingPageStationSelect.dispatchEvent(new Event('change')); }
        }

        if (bookingDateInput && date instanceof Date && !isNaN(date)) {
          bookingDateInput.value = date.toISOString().split('T')[0];
        }

        if (duration && durationSelect) {
          // map minutes to select value if present
          const opt = Array.from(durationSelect.options).find(o => o.value === String(duration) || o.text.toLowerCase().includes(String(duration)));
          if (opt) durationSelect.value = opt.value;
          durationSelect.dispatchEvent(new Event('change'));
        }

        if (vehicle && vehicleRadios && vehicleRadios.length){
          Array.from(vehicleRadios).forEach(r => { if (r.value === vehicle) r.checked = true; });
        }
      } catch(e){ console.warn('Prefill booking failed', e); }

      // Render a confirm button in chat — suggestion-only UI: clicking inserts 'confirm booking' into input
      renderQuickReplies([{ label: 'Confirm booking', value: 'confirm booking' }]);
    }

    // Event listeners
    if (isEmbeddedMode) {
      // Embedded mode - show welcome message immediately
      addMessage(msgContainer, "Hello! I'm your EV charging assistant. I can help with bookings, hours, and station information.");
      renderQuickReplies([
        { label: 'List stations', value: 'list stations' },
        { label: 'Find nearby', value: 'nearby' },
        { label: 'Booking help', value: 'book' }
      ]);

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
          addMessage(msgContainer, "Hello! I can help with bookings, hours and station lists.");
          renderQuickReplies([
            { label: 'List stations', value: 'list stations' },
            { label: 'Find nearby', value: 'nearby' },
            { label: 'Booking help', value: 'book' }
          ]);
        } else {
          win.style.display = 'none';
        }
      });
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
