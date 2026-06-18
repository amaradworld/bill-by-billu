export function checkPasswordStrength(password) {
  let score = 0;
  const feedback = [];

  if (password.length >= 8) score += 1;
  else feedback.push('At least 8 characters');

  if (password.length >= 12) score += 1;

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  else feedback.push('Mix uppercase and lowercase');

  if (/\d/.test(password)) score += 1;
  else feedback.push('Include a number');

  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else feedback.push('Include a special character');

  const levels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const colors = ['text-red-500', 'text-red-400', 'text-amber-500', 'text-green-500', 'text-green-600'];
  const idx = Math.min(score, 4);

  return {
    score,
    level: levels[idx],
    color: colors[idx],
    percentage: (score / 5) * 100,
    feedback,
    isValid: score >= 3,
  };
}
