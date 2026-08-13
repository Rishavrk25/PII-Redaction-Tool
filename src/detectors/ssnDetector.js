/**
 * Social Security Number (SSN) detector.
 * Pattern: XXX-XX-XXXX
 * Only flags as SSN when explicit context is present ("SSN", "Social Security").
 * Low false-positive risk in Indian documents.
 * @module detectors/ssnDetector
 */

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

  /**
   * @param {string} text
   * @returns {Array<object>}
   */
  detect(text) {
    const detections = [];
    let match;

    SSN_REGEX.lastIndex = 0;
    while ((match = SSN_REGEX.exec(text)) !== null) {
      const value = match[0];
      const start = match.index;
      const end = start + value.length;

      const [, area, group, serial] = match;

      // SSN validation rules:
      // - Area number cannot be 000, 666, or 900–999
      // - Group number cannot be 00
      // - Serial number cannot be 0000
      const areaNum = parseInt(area, 10);
      if (areaNum === 0 || areaNum === 666 || areaNum >= 900) continue;
      if (group === '00') continue;
      if (serial === '0000') continue;

      // Require SSN context — don't blindly flag dashed numbers
      const hasContext = this.hasContextLabel(text, start, SSN_LABELS, 100);

      // Without context, very low confidence
      const confidence = hasContext ? 0.95 : 0.40;

      // Skip very low confidence
      if (confidence < 0.50) continue;

      detections.push(this.buildDetection(value, start, end, confidence, text));
    }

    return detections;
  }
}

module.exports = SSNDetector;
