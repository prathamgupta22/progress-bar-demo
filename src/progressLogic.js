/**
 * progressLogic.js
 * Pure calculation functions — mirrors backend EtriageService.js logic exactly.
 *
 * Variable naming:
 *   checkpointPercentage   — bar fills to this % via Phase 1. Not a hard max,
 *                            since Phase 2 goes past it toward 99%.
 *   medianClusterQuestions — median of known branching completion clusters for
 *                            this section. Picked from real cluster data
 *                            (e.g. [2,15,31,45,50,61] -> median cluster = 31),
 *                            not a guessed average.
 *   maxQuestions           — absolute longest known path through this section.
 *                            Previously analytics-only. Now also used to detect
 *                            when a user has gone BEYOND every known path —
 *                            a genuine anomaly, not normal overtime.
 *   showSectionToast       — true when a section boundary was just hit. Named
 *                            for what it triggers in the UI: a toast message.
 *
 * Dampener — switched from round(medianClusterQuestions / 10) to sqrt(medianClusterQuestions):
 *
 *   The round(/10) version was not actually dynamic in practice — every section
 *   under ~25 questions rounded down to the same dampener value (2), identical
 *   to a flat constant. sqrt() has no rounding step function, so every section
 *   size produces a distinct, smoothly scaled dampener. Still grows slower than
 *   linear, so large sections (61 questions) don't get punished proportionally
 *   harder than small ones (6 questions) — just gently scaled.
 *
 *     dampener = max(2, sqrt(medianClusterQuestions))
 *
 * Beyond-maxQuestions handling (new):
 *
 *   If answered > maxQuestions, the user has gone past the absolute longest
 *   known path for this section. This is no longer "normal overtime" — it
 *   signals either a content bug, an infinite loop, or genuinely stale config.
 *   The dampener is halved (floored at 1.5) so the bar visibly accelerates
 *   toward 99% faster than standard Phase 2 — communicating "this is unusual"
 *   without ever breaking the never-reaches-100%-via-answering guarantee.
 *
 *   This also gives the backend a clean condition to log/alert on:
 *   answered > maxQuestions means real-world data exceeded what content team
 *   believed was the longest possible path.
 *
 * Never-reaches-100% guarantee — unaffected by either change:
 *   overtimeSteps / (overtimeSteps + dampener) can only equal 1 if dampener = 0.
 *   Both sqrt() and the halved beyond-max dampener are floored above 0
 *   (2 and 1.5 respectively), so the asymptote toward 99% always holds.
 */

/**
 * Returns the dampener value for a given state.
 * Exposed separately so the UI can display "what dampener is active" for transparency.
 */
export function getDampener(
  medianClusterQuestions,
  answered = 0,
  maxQuestions = Infinity,
) {
  const base = Math.max(2, Math.sqrt(medianClusterQuestions));
  if (answered > maxQuestions) {
    // Beyond every known path — accelerate toward 99%, signal anomaly
    return Math.max(1.5, base / 2);
  }
  return base;
}

/**
 * Calculate sectionPercentage.
 *
 * Phase 1 (answered <= medianClusterQuestions):
 *   percentage = (answered / medianClusterQuestions) * checkpointPercentage
 *
 * Phase 2 — asymptotic decay (answered > medianClusterQuestions):
 *   overtimeSteps = answered - medianClusterQuestions
 *   dampener      = getDampener(...)   <- sqrt-based, halves if beyond maxQuestions
 *   decayRange    = 99 - checkpointPercentage
 *   percentage    = checkpointPercentage + (decayRange * (overtimeSteps / (overtimeSteps + dampener)))
 *   hard cap      = 99
 */
export function calcSectionPercentage(
  answered,
  medianClusterQuestions,
  checkpointPercentage,
  maxQuestions = Infinity,
) {
  if (answered <= 0) return 0;

  if (answered <= medianClusterQuestions) {
    return parseFloat(
      ((answered / medianClusterQuestions) * checkpointPercentage).toFixed(1),
    );
  }

  const overtimeSteps = answered - medianClusterQuestions;
  const dampener = getDampener(medianClusterQuestions, answered, maxQuestions);
  const decayRange = 99 - checkpointPercentage;
  const pct =
    checkpointPercentage +
    decayRange * (overtimeSteps / (overtimeSteps + dampener));
  return Math.min(parseFloat(pct.toFixed(1)), 99);
}
