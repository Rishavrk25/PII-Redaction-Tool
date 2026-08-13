/**
 * IP address detector (IPv4).
 * Validates octet ranges and rejects document version numbers / section refs.
 * @module detectors/ipDetector
 */

const BaseDetector = require('./baseDetector');
const { isValidIPv4 } = require('../utils/validation');

// IPv4 pattern: four dot-separated decimal octets
const IPV4_REGEX = /\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g;

const IP_LABELS = [
  'ip address', 'ip:', 'ip addr', 'server', 'host',
  'network', 'subnet', 'gateway', 'dns',
];

class IPDetector extends BaseDetector {
  constructor() {
    super('IP', 'ip-regex');
  }

  /**
   * @param {string} text
   * @returns {Array<object>}
   */
  detect(text) {
    const detections = [];
    let match;

    IPV4_REGEX.lastIndex = 0;
    while ((match = IPV4_REGEX.exec(text)) !== null) {
      const value = match[0];
      const start = match.index;
      const end = start + value.length;

      // Must be a valid IPv4
      if (!isValidIPv4(value)) continue;

      // Skip loopback and broadcast
      if (value === '0.0.0.0' || value === '255.255.255.255') continue;
      if (value === '127.0.0.1') continue;

      // Skip if preceded/followed by a dot (version number like 1.2.3.4.5)
      if (start > 0 && text[start - 1] === '.') continue;
      if (end < text.length && text[end] === '.') continue;

      // Context-based confidence
      let confidence = 0.80;
      if (this.hasContextLabel(text, start, IP_LABELS, 80)) {
        confidence = 0.95;
      }

      detections.push(this.buildDetection(value, start, end, confidence, text));
    }

    return detections;
  }
}

module.exports = IPDetector;
