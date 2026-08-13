
const BaseDetector = require('./baseDetector');
const { luhnCheck, looksLikeFinancialAmount } = require('../utils/validation');

const CC_REGEX = /\b(\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{1,7})\b/g;

const CC_LABELS = [
  'credit card', 'card number', 'card no', 'card #',
  'debit card', 'payment card', 'cc#', 'cc #',
  'visa', 'mastercard', 'amex', 'american express',
];

class CreditCardDetector extends BaseDetector {
  constructor() {
    super('CREDIT_CARD', 'credit-card-regex');
  }

    detect(text) {
    const detections = [];
    let match;

    CC_REGEX.lastIndex = 0;
    while ((match = CC_REGEX.exec(text)) !== null) {
      const value = match[0];
      const start = match.index;
      const end = start + value.length;

      const digits = value.replace(/\D/g, '');

      if (digits.length < 13 || digits.length > 19) continue;

      if (!luhnCheck(digits)) continue;

      const context = text.substring(Math.max(0, start - 40), end + 40);
      if (looksLikeFinancialAmount(context)) continue;

      let confidence = 0.75;
      if (this.hasContextLabel(text, start, CC_LABELS, 100)) {
        confidence = 0.95;
      }

      if (/^4/.test(digits)) confidence += 0.05; 
      else if (/^5[1-5]/.test(digits)) confidence += 0.05; 
      else if (/^3[47]/.test(digits)) confidence += 0.05; 
      else if (/^6(?:011|5)/.test(digits)) confidence += 0.05; 

      confidence = Math.min(1, confidence);

      detections.push(this.buildDetection(value, start, end, confidence, text));
    }

    return detections;
  }
}

module.exports = CreditCardDetector;
