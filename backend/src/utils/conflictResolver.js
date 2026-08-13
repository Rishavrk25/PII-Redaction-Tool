
const config = require('../../config/default');

function overlaps(a, b) {
  return a.start < b.end && b.start < a.end;
}

function getPriority(type) {
  const idx = config.detectorPriority.indexOf(type);
  return idx === -1 ? -1 : idx;
}

function resolveConflicts(detections) {
  if (!detections || detections.length === 0) return [];

  const sorted = [...detections].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    const priDiff = getPriority(b.type) - getPriority(a.type);
    if (priDiff !== 0) return priDiff;
    return b.confidence - a.confidence;
  });

  const resolved = [];

  for (const detection of sorted) {
    
    const conflicting = resolved.find(accepted => overlaps(accepted, detection));

    if (!conflicting) {
      resolved.push(detection);
      continue;
    }

    const existingPri = getPriority(conflicting.type);
    const newPri = getPriority(detection.type);

    if (newPri > existingPri) {
      
      const idx = resolved.indexOf(conflicting);
      resolved[idx] = detection;
    } else if (newPri === existingPri && detection.confidence > conflicting.confidence) {
      
      const idx = resolved.indexOf(conflicting);
      resolved[idx] = detection;
    }
    
  }

  return resolved.sort((a, b) => a.start - b.start);
}

module.exports = { resolveConflicts, overlaps, getPriority };
