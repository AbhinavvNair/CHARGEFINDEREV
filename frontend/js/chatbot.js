(function(){
  // Enhanced rule-based chatbot for the frontend only
  // We'll keep everything client-side and call the existing stations API when needed.

  const synonyms = {
    greeting: ['hello','hi','hey','yo'],
    hours: ['hours','open','opening','when open','timings'],
    book: ['book','booking','reserve','reserve a slot'],
    price: ['price','cost','fee','charge','charges','rate','rates'],
    nearby: ['nearby','near me','closest','closest to me','near'],
    stations: ['stations','list stations','show stations','station list']
  };

  const defaultReplies = {
    greeting: "Hi! I'm the Jaipur EV assistant. I can help with bookings, station info, prices and directions.",
    hours: "Most stations show opening hours on their detail page. Tell me a station name and I can fetch it for you.",
    book: "To book a slot open the Booking page and select a station, date and time. Which station would you like to book?",
    price: "Prices vary by station. If you tell me a station name I can look up its rates.",
    nearby: "I can show nearby stations — allow location access and ask 'nearby' or 'stations near me'. Would you like me to search now?",
    support: "You can reach support through the Contact page, or tell me the issue and I'll create a suggestion (frontend only)."
  };

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

    // exact commands
    if (/^list stations$/i.test(text) || (/stations/i.test(t) && /list|show|nearby|search|find/.test(t))) {
      return { type: 'action', action: 'list_stations' };
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

    // fallback
    return { type: 'fallback', text: "I didn't catch that. Try asking 'list stations', 'nearby', 'hours for <station>' or 'price at <station>'." };
  }

  // Initialize
  function init(){
    const cssHref = 'css/chatbot.css';
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssHref;
    document.head.appendChild(link);

    const { toggle, win } = createWidget();
    const msgContainer = win.querySelector('#chatbotMessages');
    const input = win.querySelector('#chatbotInput');
    const send = win.querySelector('#chatbotSend');

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

    async function searchStationsApi(q){
      try {
        // prefer the /search endpoint if available
        const url = window.config && window.config.backendUrl ? window.config.backendUrl.replace(/\/api\/stations/, '/api/stations/search') : '/api/stations/search';
        const full = url + '?name=' + encodeURIComponent(q);
        const res = await fetch(full);
        if (!res.ok) return [];
        const data = await res.json();
        return data;
      } catch (e){
        console.error('searchStationsApi error', e);
        return [];
      }
    }

    async function handleAction(action){
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
    }

    async function handleIntent(intent){
      context.lastIntent = intent;
      switch(intent){
        case 'greeting':
          addMessage(msgContainer, defaultReplies.greeting);
          renderQuickReplies([
            { label: 'List stations', value: 'list stations' },
            { label: 'Find nearby', value: 'nearby' }
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
          addMessage(msgContainer, defaultReplies.nearby);
          // try to use geolocation
          if (navigator.geolocation){
            addMessage(msgContainer, 'Requesting location...');
            navigator.geolocation.getCurrentPosition(async (pos)=>{
              const { latitude, longitude } = pos.coords;
              addMessage(msgContainer, `Searching near ${latitude.toFixed(3)}, ${longitude.toFixed(3)}...`);
              // call backend /stations?lat=&lng=&radius= if implemented
              try {
                const url = (window.config && window.config.backendUrl) ? window.config.backendUrl.replace(/\/api\/stations/, '/api/stations') : '/api/stations';
                const nearbyUrl = url + `?lat=${latitude}&lng=${longitude}&radius=5000`;
                const res = await fetch(nearbyUrl);
                const data = await res.json();
                if (Array.isArray(data) && data.length){
                  const names = data.slice(0,8).map(s=>s.name || s._id);
                  addMessage(msgContainer, 'Nearby: ' + names.map(n=>`<strong>${n}</strong>`).join(', '));
                } else {
                  addMessage(msgContainer, 'No nearby stations found. Try the Stations page.');
                }
              } catch (e){
                addMessage(msgContainer, 'Error searching nearby stations.');
              }
            }, (err)=> addMessage(msgContainer, 'Unable to get location: ' + err.message));
          } else {
            addMessage(msgContainer, 'Geolocation is not supported by your browser.');
          }
          break;
        default:
          addMessage(msgContainer, "I can help with bookings, hours, prices, and station searches.");
      }
    }

    async function handleStationQuery(q, field){
      addMessage(msgContainer, `Looking up <strong>${q}</strong>...`);
      // First try search endpoint
      const results = await searchStationsApi(q);
      if (results && results.length){
        const s = results[0];
        context.lastStationSearch = results;
        if (field === 'hours'){
          const hours = s.openingHours || s.hours || s.opening || 'Hours not available';
          addMessage(msgContainer, `<strong>${s.name}</strong>: ${hours}`);
        } else {
          // generic display
          const info = [];
          if (s.name) info.push(`<strong>${s.name}</strong>`);
          if (s.chargingSpeed) info.push(`Speed: ${s.chargingSpeed}`);
          if (s.price) info.push(`Price: ${s.price}`);
          if (s.openingHours) info.push(`Hours: ${s.openingHours}`);
          addMessage(msgContainer, info.join(' • ') || 'No details available');
          renderQuickReplies([{ label: 'Open booking for this station', value: '/booking.html' }]);
        }
      } else {
        addMessage(msgContainer, 'No matching station found. Try a different name or visit the Stations page.');
      }
    }

    async function handleUserInput(raw){
      const res = replyTo(raw);
      if (res == null) return;
      if (typeof res === 'string') { addMessage(msgContainer, res); return; }

      if (res.type === 'action') return handleAction(res.action);
      if (res.type === 'intent') return handleIntent(res.intent);
      if (res.type === 'station_query') return handleStationQuery(res.q, res.field);
      if (res.type === 'fallback') return addMessage(msgContainer, res.text);
    }

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
