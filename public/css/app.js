document.addEventListener('DOMContentLoaded', () => {
  const tokenForm = document.getElementById('tokenForm');
  const pnlForm = document.getElementById('pnlForm');
  const responseArea = document.getElementById('responseArea');
  const clearBtn = document.getElementById('clearBtn');
  const apiRadios = document.querySelectorAll('input[name="api"]');

  // Handle API switching
  apiRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const selectedApi = e.target.value;
      
      // Hide all forms
      tokenForm.classList.remove('active');
      pnlForm.classList.remove('active');
      
      // Show selected form
      if (selectedApi === 'token') {
        tokenForm.classList.add('active');
      } else if (selectedApi === 'pnl') {
        pnlForm.classList.add('active');
      }
    });
  });

  function showResponse(data, status) {
    const header = { status };
    const out = { header, body: data };
    responseArea.textContent = JSON.stringify(out, null, 2);
    
    // Add animation
    responseArea.style.animation = 'none';
    setTimeout(() => {
      responseArea.style.animation = 'fadeIn 0.3s ease';
    }, 10);
  }

  // Token Insight API
  tokenForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = tokenForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Loading...</span>';
    
    const form = new FormData(tokenForm);
    const id = form.get('id');
    const vs_currency = form.get('vs_currency');
    const history_days = form.get('history_days');

    const body = {};
    if (vs_currency) body.vs_currency = vs_currency;
    if (history_days) body.history_days = Number(history_days);

    try {
      const res = await fetch(`/api/token/${encodeURIComponent(id)}/insight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      showResponse(json, res.status);
    } catch (err) {
      showResponse({ error: String(err) }, 0);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Send Request</span><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3L13 8L8 13M13 8H3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    }
  });

  // Hyperliquid PNL API
  pnlForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = pnlForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Loading...</span>';
    
    const form = new FormData(pnlForm);
    const wallet = form.get('wallet');
    const start = form.get('start');
    const end = form.get('end');

    try {
      const params = new URLSearchParams({ 
        start: String(start), 
        end: String(end) 
      });
      const res = await fetch(`/api/hyperliquid/${encodeURIComponent(wallet)}/pnl?${params.toString()}`);
      const json = await res.json();
      showResponse(json, res.status);
    } catch (err) {
      showResponse({ error: String(err) }, 0);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Send Request</span><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3L13 8L8 13M13 8H3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    }
  });

  // Clear response
  clearBtn.addEventListener('click', () => {
    responseArea.textContent = '{ }';
    responseArea.style.animation = 'fadeIn 0.3s ease';
  });
});
