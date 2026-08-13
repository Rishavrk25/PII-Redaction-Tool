
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

    detect(text) {
    const detections = [];
    const seen = new Set();

    this._detectFromLabels(text, detections, seen);

    this._detectStructuredAddresses(text, detections, seen);

    return detections;
  }

    _detectFromLabels(text, detections, seen) {
    for (const label of ADDRESS_LABELS) {
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      const regex = new RegExp(
        escaped + '\\s*:?\\s*([^]*?)(?:India\\s*[;.]|\\d{3}\\s*\\d{3}\\s*[,;.])',
        'gi'
      );

      let match;
      while ((match = regex.exec(text)) !== null) {
        let address = match[1];
        if (!address) continue;

        const fullEnd = match.index + match[0].length;
        address = text.substring(match.index + match[0].indexOf(match[1]), fullEnd).trim();

        address = address.replace(/\n+/g, ', ').replace(/\s+/g, ' ').trim();

        if (address.length < 15 || address.length > 500) continue;

        if (!this._hasAddressSignal(address)) continue;

        const start = match.index + match[0].indexOf(match[1]);
        const end = fullEnd;
        const key = `${start}-${end}`;
        if (seen.has(key)) continue;

        const overlapping = detections.some(d =>
          (start >= d.start && start < d.end) || (end > d.start && end <= d.end)
        );
        if (overlapping) continue;

        seen.add(key);
        detections.push(this.buildDetection(address, start, end, 0.88, text));
      }
    }
  }

    _detectStructuredAddresses(text, detections, seen) {
    
    const structuredRegex = /(?:(?:\d+(?:st|nd|rd|th)\s+Floor|Wing\s+[A-Z]|Plot\s+(?:No\.?\s*)?\d|S\.?\s*No\.?\s*\d|Village\s+\w+|Flat\s+No\.?\s*\d)[^]*?(?:India\s*[;.]|\d{3}\s*\d{3}))/gi;

    let match;
    while ((match = structuredRegex.exec(text)) !== null) {
      const value = match[0].replace(/\n+/g, ', ').replace(/\s+/g, ' ').trim();
      const start = match.index;
      const end = start + match[0].length;
      const key = `${start}-${end}`;

      if (seen.has(key)) continue;
      if (value.length < 20 || value.length > 500) continue;

      const overlapping = detections.some(d =>
        (start >= d.start && start < d.end) || (end > d.start && end <= d.end)
      );
      if (overlapping) continue;

      seen.add(key);
      detections.push(this.buildDetection(value, start, end, 0.82, text));
    }
  }

    _hasAddressSignal(text) {
    const lower = text.toLowerCase();
    const signals = [
      /\d{3}\s*\d{3}/,              
      /floor/i, /wing/i, /plot/i,
      /road/i, /street/i, /lane/i,
      /village/i, /taluka/i, /district/i,
      /pune|mumbai|delhi|bangalore|hyderabad|chennai/i,
      /maharashtra|karnataka|tamil\s*nadu|gujarat/i,
      /india/i,
      /s\.\s*no/i,                   
      /bandra|kurla|churchgate|vikhroli|kothrud|baner|shivajinagar|wakdewadi/i,
    ];
    return signals.some(s => s.test(lower));
  }
}

module.exports = AddressDetector;
