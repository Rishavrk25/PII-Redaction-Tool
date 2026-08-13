
const BaseDetector = require('./baseDetector');

const NUMERIC_DATE_REGEX = /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})\b/g;
const ISO_DATE_REGEX = /\b(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\b/g;

const MONTH_NAMES = 'January|February|March|April|May|June|July|August|September|October|November|December';
const NAMED_DATE_REGEX = new RegExp(
  `\\b(${MONTH_NAMES})\\s+(\\d{1,2}),?\\s+(\\d{4})\\b` + '|' +
  `\\b(\\d{1,2})\\s+(${MONTH_NAMES}),?\\s+(\\d{4})\\b`,
  'gi'
);

const DOB_LABELS = [
  'date of birth', 'dob', 'birth date', 'birthdate',
  'born on', 'born in', 'born:', 'birthday',
  'd.o.b', 'd.o.b.',
];

class DOBDetector extends BaseDetector {
  constructor() {
    super('DOB', 'dob-regex');
  }

    detect(text) {
    const detections = [];
    const seen = new Set();

    this._findDates(NUMERIC_DATE_REGEX, text, detections, seen);
    this._findDates(ISO_DATE_REGEX, text, detections, seen);
    this._findNamedDates(text, detections, seen);

    return detections;
  }

    _findDates(regex, text, detections, seen) {
    let match;
    regex.lastIndex = 0;
    while ((match = regex.exec(text)) !== null) {
      const value = match[0];
      const start = match.index;
      const end = start + value.length;
      const key = `${start}-${end}`;
      if (seen.has(key)) continue;

      if (!this.hasContextLabel(text, start, DOB_LABELS, 100)) continue;

      if (!this._isPlausibleDate(match)) continue;

      seen.add(key);
      detections.push(this.buildDetection(value, start, end, 0.92, text));
    }
  }

    _findNamedDates(text, detections, seen) {
    let match;
    NAMED_DATE_REGEX.lastIndex = 0;
    while ((match = NAMED_DATE_REGEX.exec(text)) !== null) {
      const value = match[0];
      const start = match.index;
      const end = start + value.length;
      const key = `${start}-${end}`;
      if (seen.has(key)) continue;

      if (!this.hasContextLabel(text, start, DOB_LABELS, 100)) continue;

      seen.add(key);
      detections.push(this.buildDetection(value, start, end, 0.93, text));
    }
  }

    _isPlausibleDate(match) {
    const parts = match.slice(1).filter(Boolean).map(Number);
    if (parts.length < 3) return true; 

    const [a, b, c] = parts;

    if (a >= 1900 && a <= 2100) return b >= 1 && b <= 12 && c >= 1 && c <= 31;
    return (a >= 1 && a <= 31 && b >= 1 && b <= 12) ||
           (a >= 1 && a <= 12 && b >= 1 && b <= 31);
  }
}

module.exports = DOBDetector;
