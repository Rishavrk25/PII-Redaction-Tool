/**
 * Conflict resolver for overlapping PII detections.
 *
 * When two detectors flag overlapping text spans, we must pick one.
 * Strategy:
 *   1. Higher-priority type wins (CREDIT_CARD > SSN > EMAIL > PHONE > …)
 *   2. Same priority → higher confidence wins
 *   3. Same priority + confidence → longer span wins
 *
 * @module utils/conflictResolver
 */

const config = require('../../config/default');

/**
 * Check whether two detections overlap in the source text.
 * @param {object} a - { start, end }
 * @param {object} b - { start, end }
 * @returns {boolean}
 */
function overlaps(a, b) {
  return a.start < b.end && b.start < a.end;
}

/**
 * Get priority index for a detection type (higher = wins).
 * @param {string} type
 * @returns {number}
 */
function getPriority(type) {
  const idx = config.detectorPriority.indexOf(type);
  return idx === -1 ? -1 : idx;
}

/**
 * Resolve conflicts among an array of detections.
 * Returns a new array with non-overlapping detections.
 *
 * @param {Array<object>} detections - Array of detection objects
 * @returns {Array<object>} Conflict-free detections
 */
function resolveConflicts(detections) {
  if (!detections || detections.length === 0) return [];

  // Sort by start position, then by priority descending, then confidence descending
  const sorted = [...detections].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    const priDiff = getPriority(b.type) - getPriority(a.type);
    if (priDiff !== 0) return priDiff;
    return b.confidence - a.confidence;
  });

  const resolved = [];

  for (const detection of sorted) {
    // Check if this detection overlaps with any already-accepted detection
    const conflicting = resolved.find(accepted => overlaps(accepted, detection));

    if (!conflicting) {
      resolved.push(detection);
      continue;
    }

    // Decide which one wins
    const existingPri = getPriority(conflicting.type);
    const newPri = getPriority(detection.type);

    if (newPri > existingPri) {
      // New detection has higher priority — replace
      const idx = resolved.indexOf(conflicting);
      resolved[idx] = detection;
    } else if (newPri === existingPri && detection.confidence > conflicting.confidence) {
      // Same priority, higher confidence — replace
      const idx = resolved.indexOf(conflicting);
      resolved[idx] = detection;
    }
    // Otherwise, keep the existing one
  }

  return resolved.sort((a, b) => a.start - b.start);
}

module.exports = { resolveConflicts, overlaps, getPriority };
