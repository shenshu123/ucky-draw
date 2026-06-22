const COUPONS = [
  { id: 0, minSpend: 100, discount: 10, label: '€10 OFF', name: 'Spend €100 save €10' },
  { id: 1, minSpend: 200, discount: 30, label: '€30 OFF', name: 'Spend €200 save €30' },
  { id: 2, minSpend: 500, discount: 80, label: '€80 OFF', name: 'Spend €500 save €80' },
  { id: 3, minSpend: 900, discount: 200, label: '€200 OFF', name: 'Spend €900 save €200' },
  { id: 4, minSpend: 1500, discount: 500, label: '€500 OFF', name: 'Spend €1,500 save €500' },
];

const SPIN_TIERS = [
  { minSpend: 99, spins: 1 },
  { minSpend: 166, spins: 2 },
  { minSpend: 288, spins: 4 },
  { minSpend: 388, spins: 6 },
  { minSpend: 520, spins: 10 },
];

function pickCoupon() {
  const index = Math.floor(Math.random() * COUPONS.length);
  return { ...COUPONS[index] };
}

function getSpinsForSpend(amount) {
  const n = Number(amount);
  if (!n || n < SPIN_TIERS[0].minSpend) return 0;
  let spins = 0;
  for (const tier of SPIN_TIERS) {
    if (n >= tier.minSpend) spins = tier.spins;
  }
  return spins;
}

function getCouponList() {
  return COUPONS.map((c) => ({
    id: c.id,
    minSpend: c.minSpend,
    discount: c.discount,
    label: c.label,
    name: c.name,
  }));
}

module.exports = { COUPONS, SPIN_TIERS, pickCoupon, getSpinsForSpend, getCouponList };
