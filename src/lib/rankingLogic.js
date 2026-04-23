export const calculateSystemScore = (followers, sentimentStr) => {
  // Followers (in millions). Math.log10 prevents linear explosion.
  // 1 million -> baseline, 100 million -> high score
  const followerWeight = Math.min(100, Math.log10(Number(followers) + 1) * 20 + 30);
  
  let sentimentScore = 50;
  if (sentimentStr === 'Positive') sentimentScore = 90;
  if (sentimentStr === 'Negative') sentimentScore = 20;

  return (0.6 * followerWeight) + (0.4 * sentimentScore);
};

export const calculateFinalScore = (aiScore, systemScore) => {
  return (0.6 * aiScore) + (0.4 * systemScore);
};

export const calculateDecay = (initialImpact, timeElapsedHours, decayRate = 0.05) => {
  return initialImpact * Math.exp(-decayRate * timeElapsedHours);
};
