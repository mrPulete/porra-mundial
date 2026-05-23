export function scorePrediction(
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number
) {
  const exact = predictedHome === actualHome && predictedAway === actualAway;
  const predictedDiff = predictedHome - predictedAway;
  const actualDiff = actualHome - actualAway;
  const winnerHit = Math.sign(predictedDiff) === Math.sign(actualDiff);

  if (exact) {
    return { points: 3, exact: true, accuracy: 1 };
  }

  if (winnerHit) {
    return { points: 1, exact: false, accuracy: 0.6 };
  }

  return { points: 0, exact: false, accuracy: 0 };
}
