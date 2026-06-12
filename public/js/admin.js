const PRIZE_NAMES = ['1st Prize', '2nd Prize', '3rd Prize', '4th Prize', '5th Prize', '6th Prize'];
const PRIZE_LABELS = ['Apple Desktop', 'Apple Laptop', 'iPhone 17 Pro Max', 'iPhone 17 Pro', 'Apple Watch', '$500 USD'];

let adminPassword = '';

const loginSection = document.getElementById('loginSection');
const adminSection = document.getElementById('adminSection');
const loginForm = document.getElementById('loginForm');
const configForm = document.getElementById('configForm');
const passwordInput = document.getElementById('password');
const prizesContainer = document.getElementById('prizesContainer');
const probTotal = document.getElementById('probTotal');
const statsBody = document.getElementById('statsBody');
const logoutBtn = document.getElementById('logoutBtn');
const saveMsg = document.getElementById('saveMsg');

function headers() {
  return {
    'Content-Type': 'application/json',
    'X-Admin-Password': adminPassword,
  };
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  adminPassword = passwordInput.value;
  try {
    const res = await fetch('/api/admin/config', { headers: headers() });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || `Login failed (${res.status})`);
      return;
    }
    loginSection.style.display = 'none';
    adminSection.style.display = 'block';
    await loadConfig();
    await loadStats();
  } catch {
    alert('Sign in failed');
  }
});

logoutBtn.addEventListener('click', () => {
  adminPassword = '';
  passwordInput.value = '';
  loginSection.style.display = 'block';
  adminSection.style.display = 'none';
});

function renderPrizes(prizes) {
  prizesContainer.innerHTML = prizes
    .map(
      (p, i) => `
    <div class="prize-row">
      <span class="prize-label">${p.name} - ${p.label}</span>
      <div class="prob-input">
        <input type="number" name="prob_${i}" value="${p.probability}" min="0" step="0.1" data-index="${i}">
        <span>wt</span>
      </div>
    </div>
  `
    )
    .join('');

  prizesContainer.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', updateTotal);
  });
  updateTotal();
}

function updateTotal() {
  const inputs = prizesContainer.querySelectorAll('input[type="number"]');
  let total = 0;
  inputs.forEach((inp) => {
    total += Number(inp.value) || 0;
  });
  probTotal.textContent = total.toFixed(1);
  probTotal.className = total > 0 ? 'total-ok' : 'total-err';
}

async function loadConfig() {
  const res = await fetch('/api/admin/config', { headers: headers() });
  const data = await res.json();
  document.getElementById('maxDraws').value = data.maxDrawsPerUser;
  renderPrizes(data.prizes);
}

async function loadStats() {
  const res = await fetch('/api/admin/stats', { headers: headers() });
  const data = await res.json();
  document.getElementById('totalUsers').textContent = data.totalUsers;
  document.getElementById('totalDraws').textContent = data.totalDraws;
  statsBody.innerHTML = data.users
    .slice(0, 50)
    .map(
      (u) => `
    <tr>
      <td>${u.userId}</td>
      <td>${u.drawCount}</td>
      <td>${u.lastPrize ? u.lastPrize.prizeName + ' - ' + u.lastPrize.prizeLabel : '-'}</td>
    </tr>
  `
    )
    .join('');
}

configForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const maxDraws = Number(document.getElementById('maxDraws').value);
  const inputs = prizesContainer.querySelectorAll('input[type="number"]');
  const prizes = Array.from(inputs).map((inp, i) => ({
    name: PRIZE_NAMES[i],
    label: PRIZE_LABELS[i],
    probability: Number(inp.value) || 0,
  }));

  try {
    const res = await fetch('/api/admin/config', {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ maxDrawsPerUser: maxDraws, prizes }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Save failed');
      return;
    }
    saveMsg.textContent = 'Saved successfully!';
    saveMsg.className = 'msg ok';
    setTimeout(() => (saveMsg.textContent = ''), 3000);
  } catch {
    alert('Save failed');
  }
});

document.getElementById('refreshStats').addEventListener('click', loadStats);
