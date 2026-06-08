function pickPrize(prizes) {
  const total = prizes.reduce((sum, p) => sum + p.probability, 0);
  if (total <= 0) {
    return prizes[prizes.length - 1];
  }

  let rand = Math.random() * total;
  for (const prize of prizes) {
    rand -= prize.probability;
    if (rand <= 0) {
      return prize;
    }
  }
  return prizes[prizes.length - 1];
}

module.exports = { pickPrize };
