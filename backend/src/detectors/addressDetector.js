/**
 * Physical/mailing address detector.
 *
 * Strategy:
 *   1. Context-driven: extract addresses after "Registered Office:", "Corporate Office:", etc.
 *   2. Indian address patterns: Village, Taluka, District, PIN code
 *   3. Street/building patterns: Floor, Wing, Plot, S. No., Road
 *
 * Addresses are multi-line and tricky; we capture from the label to the next
 * section break (indicated by state/country + PIN code ending).
 *
 * @module detectors/addressDetector
 */

const BaseDetector = require('./baseDetector');
const { isValidIndianPIN } = require('../utils/validation');

const ADDRESS_LABELS = [
  'registered office',
  'corporate office',
  'residential address',
  'mailing address',
  'office address',
  'address:',
  'address of',
  'registered address',
  'principal office',
  'head office',
];

/**
 * Indian state names for address boundary detection.
 */
const INDIAN_STATES = [
  'maharashtra', 'karnataka', 'tamil nadu', 'andhra pradesh', 'telangana',
  'kerala', 'gujarat', 'rajasthan', 'madhya pradesh', 'uttar pradesh',
  'west bengal', 'punjab', 'haryana', 'bihar', 'odisha', 'goa',
  'delhi', 'mumbai', 'pune', 'bengaluru', 'hyderabad', 'chennai',
];

class AddressDetector extends BaseDetector {
  constructor() {
    super('ADDRESS', 'address-context');
  }

  /**
   * @param {string} text
   * @returns {Array<object>}
   */
  detect(text) {
    const detections = [];
    const seen = new Set();

    // Strategy 1: Context-label driven address extraction
    this._detectFromLabels(text, detections, seen);

    // Strategy 2: Structured address patterns (Floor, Plot, Village + PIN)
    this._detectStructuredAddresses(text, detections, seen);

    return detections;
  }

  /**
   * Extract addresses that follow context labels.
   * Captures text from the label until a PIN code + state/country line.
   * @private
   */
  _detectFromLabels(text, detections, seen) {
    for (const label of ADDRESS_LABELS) {
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Match the label followed by ":" and the address content
      const regex = new RegExp(
        escaped + '\\s*:?\\s*([^]*?)(?:India\\s*[;.]|\\d{3}\\s*\\d{3}\\s*[,;.])',
        'gi'
      );

      let match;
      while ((match = regex.exec(text)) !== null) {
        let address = match[1];
        if (!address) continue;

        // Include the terminating "India" or PIN code
        const fullEnd = match.index + match[0].length;
        address = text.substring(match.index + match[0].indexOf(match[1]), fullEnd).trim();

        // Clean up: collapse whitespace, remove excessive newlines
        address = address.replace(/\n+/g, ', ').replace(/\s+/g, ' ').trim();

        // Must have some meaningful content
        if (address.length < 15 || address.length > 500) continue;

        // Must contain at least one address-like signal
        if (!this._hasAddressSignal(address)) continue;

        const start = match.index + match[0].indexOf(match[1]);
        const end = fullEnd;
        const key = `${start}-${end}`;
        if (seen.has(key)) continue;

        // Check for overlap with existing detections
        const overlapping = detections.some(d =>
          (start >= d.start && start < d.end) || (end > d.start && end <= d.end)
        );
        if (overlapping) continue;

        seen.add(key);
        detections.push(this.buildDetection(address, start, end, 0.88, text));
      }
    }
  }

  /**
   * Detect structured Indian address patterns without explicit labels.
   * Looks for combinations of: floor/wing + building + road/area + city + PIN + state.
   * @private
   */
  _detectStructuredAddresses(text, detections, seen) {
    // Pattern: Text containing floor/plot/village indicators + PIN code + State + India
    const structuredRegex = /(?:(?:\d+(?:st|nd|rd|th)\s+Floor|Wing\s+[A-Z]|Plot\s+(?:No\.?\s*)?\d|S\.?\s*No\.?\s*\d|Village\s+\w+|Flat\s+No\.?\s*\d)[^]*?(?:India\s*[;.]|\d{3}\s*\d{3}))/gi;

    let match;
    while ((match = structuredRegex.exec(text)) !== null) {
      const value = match[0].replace(/\n+/g, ', ').replace(/\s+/g, ' ').trim();
      const start = match.index;
      const end = start + match[0].length;
      const key = `${start}-${end}`;

      if (seen.has(key)) continue;
      if (value.length < 20 || value.length > 500) continue;

      // Check for overlap
      const overlapping = detections.some(d =>
        (start >= d.start && start < d.end) || (end > d.start && end <= d.end)
      );
      if (overlapping) continue;

      seen.add(key);
      detections.push(this.buildDetection(value, start, end, 0.82, text));
    }
  }

  /**
   * Check if text contains address-like signals.
   * @private
   */
  _hasAddressSignal(text) {
    const lower = text.toLowerCase();
    const signals = [
      /\d{3}\s*\d{3}/,              // PIN code
      /floor/i, /wing/i, /plot/i,
      /road/i, /street/i, /lane/i,
      /village/i, /taluka/i, /district/i,
      /pune|mumbai|delhi|bangalore|hyderabad|chennai/i,
      /maharashtra|karnataka|tamil\s*nadu|gujarat/i,
      /india/i,
      /s\.\s*no/i,                   // Survey number
      /bandra|kurla|churchgate|vikhroli|kothrud|baner|shivajinagar|wakdewadi/i,
    ];
    return signals.some(s => s.test(lower));
  }
}

module.exports = AddressDetector;
