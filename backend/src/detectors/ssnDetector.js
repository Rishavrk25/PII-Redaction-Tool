
const BaseDetector = require('./baseDetector');

const SSN_REGEX = /\b(\d{3})-(\d{2})-(\d{4})\b/g;

const SSN_LABELS = [
  'ssn', 'social security', 'social security number',
  'social security no', 'ss#', 'ss #',
];

class SSNDetector extends BaseDetector {
  constructor() {
    super('SSN', 'ssn-regex');
  }

    detect(text) {
    const detections = [];
    let match;

    SSN_REGEX.lastIndex = 0;
    while ((match = SSN_REGEX.exec(text)) !== null) {
      const value = match[0];
      const start = match.index;
      const end = start + value.length;

      const [, area, group, serial] = match;

      const areaNum = parseInt(area, 10);
      if (areaNum === 0 || areaNum === 666 || areaNum >= 900) continue;
      if (group === '00') continue;
      if (serial === '0000') continue;

      const hasContext = this.hasContextLabel(text, start, SSN_LABELS, 100);

      const confidence = hasContext ? 0.95 : 0.40;

      if (confidence < 0.50) continue;

      detections.push(this.buildDetection(value, start, end, confidence, text));
    }

    return detections;
  }
}

module.exports = SSNDetector;
