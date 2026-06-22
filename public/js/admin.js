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
  renderPrizes(data.prizes);
}

async function setUserSpins(userId, maxDraws, row) {
  const msgEl = row.querySelector('.set-msg');
  try {
    const res = await fetch('/api/admin/users', {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ userId, maxDraws }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Update failed');
      return;
    }
    msgEl.textContent = 'Saved';
    msgEl.className = 'set-msg ok';
    setTimeout(() => {
      msgEl.textContent = '';
      msgEl.className = 'set-msg';
    }, 2000);
    await loadStats();
  } catch {
    alert('Update failed');
  }
}

async function loadStats() {
  const res = await fetch('/api/admin/stats', { headers: headers() });
  const data = await res.json();
  document.getElementById('totalUsers').textContent = data.totalUsers;
  document.getElementById('totalDraws').textContent = data.totalDraws;
  statsBody.innerHTML = data.users
    .map(
      (u) => `
    <tr data-user-id="${u.userId}">
      <td><strong>${u.username}</strong></td>
      <td>${u.coupon ? u.coupon.label || u.coupon.name : '-'}</td>
      <td>${u.couponRedeemed ? (u.redeemSpendAmount ? '€' + u.redeemSpendAmount + ' → ' + u.redeemSpinsGranted + ' spins' : 'Yes') : '-'}</td>
      <td>${u.maxDraws}</td>
      <td>${u.drawCount}</td>
      <td>${u.remaining}</td>
      <td>${u.lastPrize ? u.lastPrize.prizeName + ' - ' + u.lastPrize.prizeLabel : '-'}</td>
      <td class="set-spins-cell">
        <input type="number" class="set-spins-input" value="${u.maxDraws}" min="0">
        <button type="button" class="btn-set-spins">Save</button>
        <span class="set-msg"></span>
      </td>
    </tr>
  `
    )
    .join('');

  statsBody.querySelectorAll('.btn-set-spins').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = btn.closest('tr');
      const userId = row.dataset.userId;
      const maxDraws = Number(row.querySelector('.set-spins-input').value);
      if (Number.isNaN(maxDraws) || maxDraws < 0) {
        alert('Enter a valid spin count');
        return;
      }
      setUserSpins(userId, maxDraws, row);
    });
  });
}

configForm.addEventListener('submit', async (e) => {
  e.preventDefault();
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
      body: JSON.stringify({ maxDrawsPerUser: 0, prizes }),
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
