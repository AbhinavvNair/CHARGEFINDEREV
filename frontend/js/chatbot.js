(function(){
  // Simple rule-based chatbot for the frontend only
  const defaultReplies = [
    { q: /hello|hi|hey/i, a: "Hi! I'm the Jaipur EV assistant. How can I help you today?" },
    { q: /hours|open/i, a: "Most stations are listed with opening hours; many operate 24/7. Which station are you asking about?" },
    { q: /book|booking|reserve/i, a: "You can book a slot using the Booking page. Select a station and pick a date/time." },
    { q: /price|cost|fee/i, a: "Prices vary by station; typical rates are shown on the booking page (e.g. ₹40-₹60 per 30 mins)." },
    { q: /nearby|near me|closest/i, a: "Use the map view to find stations near your current location (Allow location access in the browser)." },
    { q: /help|support/i, a: "You can reach support at the Contact page, or ask me and I'll try to help." }
  ];

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
    bubble.textContent = text;
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

    // Quick command: list stations
    if (/^list stations$/i.test(text) || /stations/i.test(text) && /list|show|nearby/i.test(text)){
      const names = findStationsList();
      if (names.length) return 'Nearby stations: ' + names.join(', ');
      return 'I could not find station names on this page; try the Stations page or reload.';
    }

    // Match rules
    for (const r of defaultReplies){
      if (r.q.test(text)) return r.a;
    }

    // Fallback
    return "Sorry, I don't understand that yet. Try: 'booking', 'list stations', 'hours', or 'price'.";
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

    toggle.addEventListener('click', () => {
      if (win.style.display === 'none') {
        win.style.display = 'flex';
        addMessage(msgContainer, "Hello! I can help with bookings, hours and station lists.");
      } else {
        win.style.display = 'none';
      }
    });

    send.addEventListener('click', () => {
      const v = input.value.trim();
      if (!v) return;
      addMessage(msgContainer, v, 'user');
      const response = replyTo(v);
      setTimeout(()=> addMessage(msgContainer, response, 'bot'), 300);
      input.value = '';
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { send.click(); }
    });
  }

  // Wait until DOM ready
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
