/**
 * Email address detector.
 * High confidence — emails are structurally unambiguous.
 * Confidence boosted when preceded by "Email:", "E-mail:", etc.
 * @module detectors/emailDetector
 */

const BaseDetector = require('./baseDetector');
const { isValidEmail } = require('../utils/validation');

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const CONTEXT_LABELS = [
  'email:', 'e-mail:', 'email id:', 'e-mail id:',
  'contact:', 'mail:', 'electronic mail:',
];

class EmailDetector extends BaseDetector {
  constructor() {
    super('EMAIL', 'email-regex');
  }

  /**
   * @param {string} text
   * @returns {Array<object>}
   */
  detect(text) {
    const detections = [];
    let match;

    EMAIL_REGEX.lastIndex = 0;
    while ((match = EMAIL_REGEX.exec(text)) !== null) {
      const value = match[0];
      const start = match.index;
      const end = start + value.length;

      // Basic validation
      if (!isValidEmail(value)) continue;

      // Skip website URLs that might look like emails
      // (check if preceded by "http" or "www")
      const before = text.substring(Math.max(0, start - 10), start).toLowerCase();
      if (before.includes('http') || before.includes('www')) continue;

      // Base confidence for structurally valid emails
      let confidence = 0.95;

      // Boost if preceded by email context label
      if (this.hasContextLabel(text, start, CONTEXT_LABELS, 40)) {
        confidence = 0.99;
      }

      detections.push(this.buildDetection(value, start, end, confidence, text));
    }

    return detections;
  }
}

module.exports = EmailDetector;
