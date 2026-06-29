/**
 * Calculate sectionPercentage given answered questions, expectedQuestions and maxPercentage.
 *
 * Phase 1 (answered <= expected):
 *   percentage = (answered / expected) * maxPercentage
 *
 * Phase 2 — asymptotic decay (answered > expected):
 *   overtimeSteps = answered - expected
 *   decayRange    = 99 - maxPercentage
 *   percentage    = maxPercentage + (decayRange * (overtimeSteps / (overtimeSteps + 2)))
 *   hard cap      = 99
 */
export function calcSectionPercentage(
  answered,
  expectedQuestions,
  maxPercentage,
) {
  if (answered <= 0) return 0;

  if (answered <= expectedQuestions) {
    return parseFloat(
      ((answered / expectedQuestions) * maxPercentage).toFixed(1),
    );
  }

  const overtimeSteps = answered - expectedQuestions;
  const decayRange = 99 - maxPercentage;
  const pct =
    maxPercentage + decayRange * (overtimeSteps / (overtimeSteps + 2));
  return Math.min(parseFloat(pct.toFixed(1)), 99);
}
