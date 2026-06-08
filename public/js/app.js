const SEGMENT_COUNT = 6;
const SPIN_DURATION = 5000;

let prizes = [];
let remaining = 0;
let isSpinning = false;
let currentRotation = 0;

const wheelEl = document.getElementById('wheel');
const spinBtn = document.getElementById('spinBtn');
const remainingEl = document.getElementById('remaining');
const resultModal = document.getElementById('resultModal');
const resultText = document.getElementById('resultText');
const closeModal = document.getElementById('closeModal');

const SEGMENT_COLORS = ['#ffb3c6', '#ffd6e0', '#ffb3c6', '#ffd6e0', '#ffb3c6', '#ffd6e0'];
const PRIZE_ICONS = ['🖥️', '💻', '📱', '📲', '⌚', '💵'];
const PRIZE_SHORT = ['Desktop', 'Laptop', '17 Pro Max', '17 Pro', 'Watch', '$500'];

const spinBtnText = spinBtn.querySelector('.spin-btn-text');
const tapHand = document.getElementById('tapHand');

function getPrizeIcon(id) {
  return PRIZE_ICONS[id] || '🎁';
}

function setSpinLabel(text) {
  if (spinBtnText) spinBtnText.textContent = text;
  else spinBtn.textContent = text;
}

function updateTapHand() {
  if (!tapHand) return;
  const show = remaining > 0 && !isSpinning;
  tapHand.classList.toggle('hidden', !show);
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

async function loadStatus() {
  const userId = getUserId();
  const res = await fetch(`/api/status?userId=${encodeURIComponent(userId)}`);
  const data = await res.json();
  prizes = data.prizes;
  remaining = data.remaining;
  remainingEl.textContent = remaining;
  requestAnimationFrame(() => buildWheel(prizes));
  spinBtn.disabled = remaining <= 0;
  setSpinLabel(remaining > 0 ? 'Spin' : 'No spins left');
  updateTapHand();
}

function calcTargetRotation(prizeIndex) {
  const segmentAngle = 360 / SEGMENT_COUNT;
  const segmentCenter = prizeIndex * segmentAngle + segmentAngle / 2;
  const offset = 360 - segmentCenter;
  const extraSpins = 5 * 360;
  return currentRotation + extraSpins + offset - (currentRotation % 360);
}

async function spin() {
  if (isSpinning || remaining <= 0) return;

  isSpinning = true;
  spinBtn.disabled = true;
  setSpinLabel('Spinning...');
  updateTapHand();

  try {
    const userId = getUserId();
    const res = await fetch('/api/spin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Draw failed');
      isSpinning = false;
      spinBtn.disabled = remaining <= 0;
      setSpinLabel(remaining > 0 ? 'Spin' : 'No spins left');
      updateTapHand();
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
      spinBtn.disabled = remaining <= 0;
      setSpinLabel(remaining > 0 ? 'Spin' : 'No spins left');
      updateTapHand();
    }, SPIN_DURATION + 200);
  } catch {
    alert('Network error. Please try again.');
    isSpinning = false;
    spinBtn.disabled = false;
    setSpinLabel('Spin');
    updateTapHand();
  }
}

spinBtn.addEventListener('click', spin);
closeModal.addEventListener('click', () => resultModal.classList.remove('show'));
resultModal.addEventListener('click', (e) => {
  if (e.target === resultModal) resultModal.classList.remove('show');
});

buildLights();
loadStatus();
updateTapHand();

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
