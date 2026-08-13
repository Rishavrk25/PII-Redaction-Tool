
const BaseDetector = require('./baseDetector');
const { parsePhoneNumberFromString } = require('libphonenumber-js');

const INDIAN_MOBILE = /\+\s*91[\s-]*(\d[\d\s-]{8,12}\d)/g;

const INDIAN_STD = /\b0\d{2,4}[\s-]+\d{6,8}\b/g;

const CONTEXT_PHONE = /(?:telephone|tel\.?|phone|contact\s*(?:no|number)?)\s*[:]\s*\+?\s*(\d[\d\s().-]{6,20}\d)/gi;

const PHONE_LABELS = [
  'telephone:', 'tel:', 'tel.:', 'phone:', 'phone no:',
  'contact no:', 'contact number:', 'mobile:', 'fax:',
];

class PhoneDetector extends BaseDetector {
  constructor() {
    super('PHONE', 'phone-regex');
  }

    detect(text) {
    const detections = [];
    const seen = new Set();

    this._matchPattern(INDIAN_MOBILE, text, detections, seen, 0.93);

    let match;
    INDIAN_STD.lastIndex = 0;
    while ((match = INDIAN_STD.exec(text)) !== null) {
      const value = match[0];
      const start = match.index;
      const end = start + value.length;
      const key = `${start}-${end}`;
      if (seen.has(key)) continue;

      if (!this.hasContextLabel(text, start, PHONE_LABELS, 80)) continue;

      const digits = value.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 15) continue;

      seen.add(key);
      detections.push(this.buildDetection(value, start, end, 0.90, text));
    }

    // Strategy 3: Context-driven phone extraction
    CONTEXT_PHONE.lastIndex = 0;
    while ((match = CONTEXT_PHONE.exec(text)) !== null) {
      // The full match includes the label — we want just the phone part
      const fullValue = match[0];
      const phoneValue = match[1] || fullValue;

      // Find the position of the phone number within the full match
      const labelEnd = fullValue.indexOf(phoneValue);
      const phoneStart = match.index + labelEnd;
      const phoneEnd = phoneStart + phoneValue.length;
      const key = `${phoneStart}-${phoneEnd}`;

      if (seen.has(key)) continue;

      // Check if this overlaps with an already-found detection
      const overlapping = detections.some(d =>
        (phoneStart >= d.start && phoneStart < d.end) ||
        (phoneEnd > d.start && phoneEnd <= d.end)
      );
      if (overlapping) continue;

      const digits = phoneValue.replace(/\D/g, '');
      if (digits.length < 7 || digits.length > 15) continue;

      // Skip if it looks like a financial number
      if (this._looksFinancial(text, phoneStart)) continue;

      seen.add(key);
      detections.push(this.buildDetection(phoneValue.trim(), phoneStart, phoneEnd, 0.92, text));
    }

    return detections;
  }

  /**
   * Match a regex pattern and add qualifying results.
   * @private
   */
  _matchPattern(regex, text, detections, seen, baseConfidence) {
    let match;
    regex.lastIndex = 0;
    while ((match = regex.exec(text)) !== null) {
      const value = match[0];
      const start = match.index;
      const end = start + value.length;
      const key = `${start}-${end}`;
      if (seen.has(key)) continue;

      // Validate: should have a reasonable number of digits
      const digits = value.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 15) continue;

      // Attempt libphonenumber validation
      let confidence = baseConfidence;
      try {
        const parsed = parsePhoneNumberFromString(value, 'IN');
        if (parsed && parsed.isValid()) {
          confidence = Math.min(0.99, confidence + 0.05);
        }
      } catch {
        
      }

      if (this.hasContextLabel(text, start, PHONE_LABELS, 80)) {
        confidence = Math.min(0.99, confidence + 0.03);
      }

      if (this._looksFinancial(text, start)) continue;

      seen.add(key);
      detections.push(this.buildDetection(value, start, end, confidence, text));
    }
  }

    _looksFinancial(text, position) {
    const window = text.substring(Math.max(0, position - 30), position + 30);
    return /[₹$€£]|million|crore|lakh|percent|%|face\s+value|aggregat|page\s+\d/i.test(window);
  }
}

module.exports = PhoneDetector;
