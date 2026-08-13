
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

    detect(text) {
    const detections = [];
    let match;

    EMAIL_REGEX.lastIndex = 0;
    while ((match = EMAIL_REGEX.exec(text)) !== null) {
      const value = match[0];
      const start = match.index;
      const end = start + value.length;

      if (!isValidEmail(value)) continue;

      const before = text.substring(Math.max(0, start - 10), start).toLowerCase();
      if (before.includes('http') || before.includes('www')) continue;

      let confidence = 0.95;

      if (this.hasContextLabel(text, start, CONTEXT_LABELS, 40)) {
        confidence = 0.99;
      }

      detections.push(this.buildDetection(value, start, end, confidence, text));
    }

    return detections;
  }
}

module.exports = EmailDetector;
