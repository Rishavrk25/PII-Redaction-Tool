/**
 * Evaluation metrics calculator.
 * Computes precision, recall, F1, and accuracy for PII detection.
 * @module evaluation/metrics
 */

/**
 * Calculate evaluation metrics for a single PII type.
 * @param {Array<string>} groundTruth - Expected PII values
 * @param {Array<string>} predictions - Detected PII values
 * @returns {object} { tp, fp, fn, precision, recall, f1, accuracy }
 */
function calculateMetrics(groundTruth, predictions) {
  const gtSet = new Set(groundTruth.map(v => v.toLowerCase().trim()));
  const predSet = new Set(predictions.map(v => v.toLowerCase().trim()));

  let tp = 0; // True Positives: in both ground truth and predictions
  let fp = 0; // False Positives: in predictions but not ground truth
  let fn = 0; // False Negatives: in ground truth but not predictions

  // Count TPs and FPs
  for (const pred of predSet) {
    if (gtSet.has(pred)) {
      tp++;
    } else {
      // Check partial match (fuzzy matching for names/addresses)
      const partialMatch = [...gtSet].some(gt => fuzzyMatch(gt, pred));
      if (partialMatch) {
        tp++;
      } else {
        fp++;
      }
    }
  }

  // Count FNs
  for (const gt of gtSet) {
    const found = predSet.has(gt) || [...predSet].some(pred => fuzzyMatch(gt, pred));
    if (!found) {
      fn++;
    }
  }

  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  // Note: TN is not meaningful for PII detection (vast majority of text is not PII)
  // We set TN = 0 for the accuracy formula, which makes accuracy = tp / (tp + fp + fn)
  // This is noted in the evaluation report
  const tn = 0;
  const accuracy = tp + tn + fp + fn > 0 ? (tp + tn) / (tp + tn + fp + fn) : 0;

  return {
    tp,
    fp,
    fn,
    tn,
    precision: Math.round(precision * 10000) / 10000,
    recall: Math.round(recall * 10000) / 10000,
    f1: Math.round(f1 * 10000) / 10000,
    accuracy: Math.round(accuracy * 10000) / 10000,
  };
}

/**
 * Calculate overall metrics across all PII types.
 * Uses micro-averaging (sum TP/FP/FN across types).
 * @param {object} perTypeMetrics - { TYPE: { tp, fp, fn, ... }, ... }
 * @returns {object}
 */
function calculateOverallMetrics(perTypeMetrics) {
  let totalTP = 0;
  let totalFP = 0;
  let totalFN = 0;

  for (const metrics of Object.values(perTypeMetrics)) {
    totalTP += metrics.tp;
    totalFP += metrics.fp;
    totalFN += metrics.fn;
  }

  const precision = totalTP + totalFP > 0 ? totalTP / (totalTP + totalFP) : 0;
  const recall = totalTP + totalFN > 0 ? totalTP / (totalTP + totalFN) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const accuracy = totalTP + totalFP + totalFN > 0
    ? totalTP / (totalTP + totalFP + totalFN)
    : 0;

  return {
    tp: totalTP,
    fp: totalFP,
    fn: totalFN,
    precision: Math.round(precision * 10000) / 10000,
    recall: Math.round(recall * 10000) / 10000,
    f1: Math.round(f1 * 10000) / 10000,
    accuracy: Math.round(accuracy * 10000) / 10000,
  };
}

/**
 * Fuzzy match for entity comparison.
 * Allows minor differences in formatting/whitespace.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function fuzzyMatch(a, b) {
  // Normalize both strings
  const normA = a.replace(/\s+/g, ' ').replace(/[^a-z0-9@.+\s-]/g, '').trim();
  const normB = b.replace(/\s+/g, ' ').replace(/[^a-z0-9@.+\s-]/g, '').trim();

  if (normA === normB) return true;

  // One contains the other
  if (normA.includes(normB) || normB.includes(normA)) return true;

  return false;
}

module.exports = { calculateMetrics, calculateOverallMetrics, fuzzyMatch };
