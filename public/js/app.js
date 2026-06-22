const SEGMENT_COUNT = 6;
const SPIN_DURATION = 5000;
const USER_KEY = 'lucky_draw_user';

let prizes = [];
let remaining = 0;
let isSpinning = false;
let currentRotation = 0;
let currentUserId = null;
let currentUsername = '';
let canDrawCoupon = true;
let canRedeem = false;
let userCoupon = null;
let couponRedeemed = false;
let pendingAction = null;

const wheelEl = document.getElementById('wheel');
const spinBtn = document.getElementById('spinBtn');
const remainingEl = document.getElementById('remaining');
const resultModal = document.getElementById('resultModal');
const resultText = document.getElementById('resultText');
const closeModal = document.getElementById('closeModal');
const authModal = document.getElementById('authModal');
const authError = document.getElementById('authError');
const userBar = document.getElementById('userBar');
const usernameDisplay = document.getElementById('usernameDisplay');
const logoutBtn = document.getElementById('logoutBtn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const drawCouponBtn = document.getElementById('drawCouponBtn');
const redeemBtn = document.getElementById('redeemBtn');
const redeemBox = document.getElementById('redeemBox');
const myCouponBox = document.getElementById('myCouponBox');
const myCouponValue = document.getElementById('myCouponValue');
const couponStatus = document.getElementById('couponStatus');
const spendTier = document.getElementById('spendTier');
const couponResultModal = document.getElementById('couponResultModal');
const couponResultText = document.getElementById('couponResultText');
const closeCouponModal = document.getElementById('closeCouponModal');

const SEGMENT_COLORS = ['#ffb3c6', '#ffd6e0', '#ffb3c6', '#ffd6e0', '#ffb3c6', '#ffd6e0'];
const PRIZE_ICONS = ['🖥️', '💻', '📱', '📲', '⌚', '💵'];
const PRIZE_SHORT = ['Desktop', 'Laptop', '17 Pro Max', '17 Pro', 'Watch', '$500'];

const spinBtnText = spinBtn.querySelector('.spin-btn-text');
const tapHand = document.getElementById('tapHand');

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

function saveUser(userId, username) {
  localStorage.setItem(USER_KEY, JSON.stringify({ userId, username }));
  currentUserId = userId;
  currentUsername = username;
}

function clearUser() {
  localStorage.removeItem(USER_KEY);
  currentUserId = null;
  currentUsername = '';
}

function requireAuth(action) {
  pendingAction = action;
  authModal.classList.add('show');
  showAuthError('');
}

function hideAuth() {
  authModal.classList.remove('show');
}

function showAuthError(msg) {
  authError.textContent = msg;
}

function updateUserBar() {
  if (currentUserId) {
    userBar.style.display = 'block';
    usernameDisplay.textContent = currentUsername;
  } else {
    userBar.style.display = 'none';
  }
}

function updateCouponUI() {
  if (!currentUserId) {
    drawCouponBtn.disabled = false;
    drawCouponBtn.textContent = '🎟️ Draw Welfare Coupon';
    myCouponBox.style.display = 'none';
    redeemBox.style.display = 'none';
    couponStatus.textContent = 'Sign in to draw your one-time welfare coupon.';
    return;
  }

  if (userCoupon) {
    myCouponBox.style.display = 'block';
    myCouponValue.textContent = userCoupon.name || userCoupon.label;
    drawCouponBtn.disabled = true;
    drawCouponBtn.textContent = '✓ Coupon Drawn';
  } else if (canDrawCoupon) {
    myCouponBox.style.display = 'none';
    drawCouponBtn.disabled = false;
    drawCouponBtn.textContent = '🎟️ Draw Welfare Coupon';
    couponStatus.textContent = 'You have 1 chance to draw a welfare coupon!';
  }

  if (userCoupon && canRedeem) {
    redeemBox.style.display = 'block';
    couponStatus.textContent = 'Redeem your coupon with spend amount to earn wheel spins.';
  } else if (userCoupon && couponRedeemed) {
    redeemBox.style.display = 'none';
    couponStatus.textContent = 'Coupon redeemed. Use your spins on the wheel above!';
  } else if (!userCoupon && !canDrawCoupon) {
    couponStatus.textContent = '';
  }
}

function getPrizeIcon(id) {
  return PRIZE_ICONS[id] || '🎁';
}

function setSpinLabel(text) {
  if (spinBtnText) spinBtnText.textContent = text;
  else spinBtn.textContent = text;
}

function updateTapHand() {
  if (!tapHand) return;
  const show = currentUserId && remaining > 0 && !isSpinning;
  tapHand.classList.toggle('hidden', !show);
}

function updateSpinBtn() {
  if (!currentUserId) {
    spinBtn.disabled = false;
    setSpinLabel('Spin');
    return;
  }
  spinBtn.disabled = remaining <= 0 || isSpinning;
  if (isSpinning) setSpinLabel('Spinning...');
  else setSpinLabel(remaining > 0 ? 'Spin' : 'No spins left');
  updateTapHand();
}

function buildWheel(prizeList) {
  const stops = SEGMENT_COLORS.map(
    (color, i) => `${color} ${(i * 100) / SEGMENT_COUNT}% ${((i + 1) * 100) / SEGMENT_COUNT}%`
  ).join(', ');
  wheelEl.style.background = `conic-gradient(from -90deg, ${stops})`;

  wheelEl.querySelectorAll('.wheel-label').forEach((el) => el.remove());

  const segmentAngle = 360 / SEGMENT_COUNT;
  const wheelSize = wheelEl.offsetWidth || 300;
  const labelRadius = Math.round(wheelSize * 0.39);

  prizeList.forEach((prize, i) => {
    const segDeg = i * segmentAngle + segmentAngle / 2 - 90;
    const shortName = PRIZE_SHORT[prize.id] || prize.label;

    const label = document.createElement('div');
    label.className = 'wheel-label';
    label.style.transform = `rotate(${segDeg}deg)`;

    const inner = document.createElement('div');
    inner.className = 'wheel-label-inner';
    inner.style.transform = `translateY(-${labelRadius}px) rotate(90deg)`;
    inner.innerHTML = `
      <span class="prize-icon">${getPrizeIcon(prize.id)}</span>
      <span class="prize-label">${shortName}</span>
    `;

    label.appendChild(inner);
    wheelEl.appendChild(label);
  });
}

function buildLights() {
  const lightsEl = document.getElementById('wheelLights');
  lightsEl.innerHTML = '';
  for (let i = 0; i < 24; i++) {
    const light = document.createElement('div');
    light.className = 'light' + (i % 2 === 0 ? ' light-on' : '');
    light.style.transform = `rotate(${i * 15}deg) translateY(-176px)`;
    lightsEl.appendChild(light);
  }
}

function applyUserData(data) {
  if (data.loggedIn) {
    remaining = data.remaining;
    currentUsername = data.username;
    canDrawCoupon = data.canDrawCoupon;
    canRedeem = data.canRedeem;
    userCoupon = data.coupon;
    couponRedeemed = data.couponRedeemed;
    remainingEl.textContent = remaining;
  } else {
    remaining = 0;
    canDrawCoupon = true;
    canRedeem = false;
    userCoupon = null;
    couponRedeemed = false;
    remainingEl.textContent = currentUserId ? '-' : '-';
  }
  updateUserBar();
  updateCouponUI();
  updateSpinBtn();
}

async function loadStatus() {
  const url = currentUserId
    ? `/api/status?userId=${encodeURIComponent(currentUserId)}`
    : '/api/status';

  const res = await fetch(url);
  const data = await res.json();

  if (currentUserId && !res.ok) {
    clearUser();
    showAuthError(data.error || 'Session expired. Please sign in again.');
    pendingAction = null;
  }

  prizes = data.prizes || [];
  requestAnimationFrame(() => buildWheel(prizes));
  applyUserData(data);
}

async function handleAuth(endpoint, username, password) {
  showAuthError('');
  const res = await fetch(`/api/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    showAuthError(data.error || 'Request failed');
    return;
  }
  saveUser(data.userId, data.username);
  hideAuth();
  await loadStatus();

  const action = pendingAction;
  pendingAction = null;
  if (action === 'spin') spin();
  else if (action === 'coupon') drawCoupon();
  else if (action === 'redeem') redeemCoupon();
}

function calcTargetRotation(prizeIndex) {
  const segmentAngle = 360 / SEGMENT_COUNT;
  const segmentCenter = prizeIndex * segmentAngle + segmentAngle / 2;
  const offset = 360 - segmentCenter;
  const extraSpins = 5 * 360;
  return currentRotation + extraSpins + offset - (currentRotation % 360);
}

async function spin() {
  if (!currentUserId) {
    requireAuth('spin');
    return;
  }
  if (isSpinning || remaining <= 0) return;

  isSpinning = true;
  updateSpinBtn();

  try {
    const res = await fetch('/api/spin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUserId }),
    });
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Draw failed');
      isSpinning = false;
      updateSpinBtn();
      return;
    }

    const targetRotation = calcTargetRotation(data.prizeIndex);
    wheelEl.style.transition = `transform ${SPIN_DURATION}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)`;
    wheelEl.style.transform = `rotate(${targetRotation}deg)`;
    currentRotation = targetRotation;

    setTimeout(() => {
      remaining = data.remaining;
      remainingEl.textContent = remaining;
      const icon = getPrizeIcon(data.prizeIndex);
      resultText.innerHTML = `You won<br><span class="result-prize-icon">${icon}</span><strong>${data.prize.name}</strong><br>${data.prize.label}`;
      resultModal.classList.add('show');
      isSpinning = false;
      updateSpinBtn();
    }, SPIN_DURATION + 200);
  } catch {
    alert('Network error. Please try again.');
    isSpinning = false;
    updateSpinBtn();
  }
}

async function drawCoupon() {
  if (!currentUserId) {
    requireAuth('coupon');
    return;
  }
  if (!canDrawCoupon || userCoupon) {
    alert('You have already used your coupon draw chance.');
    return;
  }

  drawCouponBtn.disabled = true;
  drawCouponBtn.textContent = 'Drawing...';

  try {
    const res = await fetch('/api/coupon-draw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUserId }),
    });
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Coupon draw failed');
      drawCouponBtn.disabled = false;
      drawCouponBtn.textContent = '🎟️ Draw Welfare Coupon';
      return;
    }

    userCoupon = data.coupon;
    canDrawCoupon = false;
    canRedeem = true;
    couponResultText.innerHTML = `You won a coupon!<br><strong>${data.coupon.name}</strong>`;
    couponResultModal.classList.add('show');
    updateCouponUI();
  } catch {
    alert('Network error. Please try again.');
    drawCouponBtn.disabled = false;
    drawCouponBtn.textContent = '🎟️ Draw Welfare Coupon';
  }
}

async function redeemCoupon() {
  if (!currentUserId) {
    requireAuth('redeem');
    return;
  }
  if (!canRedeem || !userCoupon) {
    alert('No coupon available to redeem.');
    return;
  }

  const amount = Number(spendTier.value);
  redeemBtn.disabled = true;
  redeemBtn.textContent = 'Redeeming...';

  try {
    const res = await fetch('/api/coupon-redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUserId, spendAmount: amount }),
    });
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Redeem failed');
      redeemBtn.disabled = false;
      redeemBtn.textContent = 'Redeem for Spins';
      return;
    }

    remaining = data.remaining;
    remainingEl.textContent = remaining;
    canRedeem = false;
    couponRedeemed = true;
    alert(data.message || `You earned ${data.spinsGranted} spins!`);
    await loadStatus();
  } catch {
    alert('Network error. Please try again.');
  } finally {
    redeemBtn.disabled = false;
    redeemBtn.textContent = 'Redeem for Spins';
  }
}

document.querySelectorAll('.auth-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    const isLogin = tab.dataset.tab === 'login';
    loginForm.style.display = isLogin ? 'block' : 'none';
    registerForm.style.display = isLogin ? 'none' : 'block';
    showAuthError('');
  });
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  await handleAuth('login', document.getElementById('loginUsername').value.trim(), document.getElementById('loginPassword').value);
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  await handleAuth('register', document.getElementById('registerUsername').value.trim(), document.getElementById('registerPassword').value);
});

logoutBtn.addEventListener('click', () => {
  clearUser();
  pendingAction = null;
  loadStatus();
});

spinBtn.addEventListener('click', spin);
drawCouponBtn.addEventListener('click', drawCoupon);
redeemBtn.addEventListener('click', redeemCoupon);
closeModal.addEventListener('click', () => resultModal.classList.remove('show'));
closeCouponModal.addEventListener('click', () => couponResultModal.classList.remove('show'));
resultModal.addEventListener('click', (e) => {
  if (e.target === resultModal) resultModal.classList.remove('show');
});
couponResultModal.addEventListener('click', (e) => {
  if (e.target === couponResultModal) couponResultModal.classList.remove('show');
});

buildLights();

const stored = getStoredUser();
if (stored?.userId) {
  currentUserId = stored.userId;
  currentUsername = stored.username || '';
}
loadStatus();

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (prizes.length) buildWheel(prizes);
  }, 150);
});

setInterval(() => {
  document.querySelectorAll('.light').forEach((el, i) => {
    el.classList.toggle('light-on', (Date.now() / 500 + i) % 2 < 1);
  });
}, 500);
