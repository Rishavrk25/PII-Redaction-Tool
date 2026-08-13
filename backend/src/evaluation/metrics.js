
function calculateMetrics(groundTruth, predictions) {
  const gtSet = new Set(groundTruth.map(v => v.toLowerCase().trim()));
  const predSet = new Set(predictions.map(v => v.toLowerCase().trim()));

  let tp = 0; 
  let fp = 0; 
  let fn = 0; 

  for (const pred of predSet) {
    if (gtSet.has(pred)) {
      tp++;
    } else {
      
      const partialMatch = [...gtSet].some(gt => fuzzyMatch(gt, pred));
      if (partialMatch) {
        tp++;
      } else {
        fp++;
      }
    }
  }

  for (const gt of gtSet) {
    const found = predSet.has(gt) || [...predSet].some(pred => fuzzyMatch(gt, pred));
    if (!found) {
      fn++;
    }
  }

  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

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

function fuzzyMatch(a, b) {
  
  const normA = a.replace(/\s+/g, ' ').replace(/[^a-z0-9@.+\s-]/g, '').trim();
  const normB = b.replace(/\s+/g, ' ').replace(/[^a-z0-9@.+\s-]/g, '').trim();

  if (normA === normB) return true;

  if (normA.includes(normB) || normB.includes(normA)) return true;

  return false;
}

module.exports = { calculateMetrics, calculateOverallMetrics, fuzzyMatch };
