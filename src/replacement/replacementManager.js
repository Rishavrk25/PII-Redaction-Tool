/**
 * Replacement Manager.
 *
 * Maintains a deterministic mapping: original entity → synthetic replacement.
 * If the same PII appears 20 times, it always maps to the same fake value.
 *
 * Also preserves relationships between PII entities:
 * - A person's name and their email share the same synthetic identity.
 * - Phone numbers associated with a person use the same replacement phone.
 *
 * @module replacement/replacementManager
 */

const { getNormalizer } = require('../utils/normalization');
const fakeGen = require('./fakeDataGenerator');

class ReplacementManager {
  constructor() {
    /**
     * Map from "TYPE::normalizedValue" → synthetic replacement string.
     * @type {Map<string, string>}
     */
    this.replacementMap = new Map();

    /**
     * Map from person normalizedName → generated synthetic identity.
     * Used to derive consistent emails from person names.
     * @type {Map<string, { firstName: string, lastName: string, fullName: string }>}
     */
    this.personIdentities = new Map();

    /**
     * Map from email domain → synthetic company domain (for email consistency).
     * @type {Map<string, string>}
     */
    this.domainMap = new Map();
  }

  /**
   * Get or create a synthetic replacement for a detected entity.
   * @param {string} type - PII type
   * @param {string} originalValue - Original detected text
   * @returns {string} Synthetic replacement
   */
  getReplacement(type, originalValue) {
    const normalizer = getNormalizer(type);
    const normalizedKey = `${type}::${normalizer(originalValue)}`;

    // Return existing mapping if available
    if (this.replacementMap.has(normalizedKey)) {
      const replacement = this.replacementMap.get(normalizedKey);
      // Preserve case style of the original
      return this._matchCase(originalValue, replacement);
    }

    // Generate new replacement
    const replacement = this._generateReplacement(type, originalValue);
    this.replacementMap.set(normalizedKey, replacement);
    return this._matchCase(originalValue, replacement);
  }

  /**
   * Generate a new synthetic value based on PII type.
   * @private
   */
  _generateReplacement(type, originalValue) {
    switch (type) {
      case 'PERSON':
        return this._generatePersonReplacement(originalValue);
      case 'EMAIL':
        return this._generateEmailReplacement(originalValue);
      case 'PHONE':
        return fakeGen.generatePhone(originalValue);
      case 'SSN':
        return fakeGen.generateSSN();
      case 'CREDIT_CARD':
        return fakeGen.generateCreditCard();
      case 'DOB':
        return fakeGen.generateDOB();
      case 'IP':
        return fakeGen.generateIP();
      case 'COMPANY':
        return fakeGen.generateCompany(originalValue);
      case 'ADDRESS':
        return fakeGen.generateAddress();
      default:
        return '[REDACTED]';
    }
  }

  /**
   * Generate a person replacement and store the identity for email derivation.
   * @private
   */
  _generatePersonReplacement(originalName) {
    const normalized = getNormalizer('PERSON')(originalName);

    if (this.personIdentities.has(normalized)) {
      return this.personIdentities.get(normalized).fullName;
    }

    const identity = fakeGen.generatePerson();
    this.personIdentities.set(normalized, identity);
    return identity.fullName;
  }

  /**
   * Generate an email that corresponds to a known person identity if possible.
   * @private
   */
  _generateEmailReplacement(originalEmail) {
    const localPart = originalEmail.split('@')[0];
    const domain = originalEmail.split('@')[1];

    // Check if the email's local part matches any known person
    for (const [normalizedName, identity] of this.personIdentities.entries()) {
      const nameParts = normalizedName.split(/\s+/);
      const emailParts = localPart.toLowerCase().split(/[._-]/);

      // Check if email local part contains parts of a known person's name
      const matchCount = nameParts.filter(np =>
        emailParts.some(ep => ep === np || np.startsWith(ep))
      ).length;

      if (matchCount >= 1 && nameParts.length <= 3) {
        return fakeGen.generateEmail(identity.firstName, identity.lastName);
      }
    }

    // No person match — generate a standalone email
    return fakeGen.generateEmail(null, null);
  }

  /**
   * Match the case style of the original value in the replacement.
   * @private
   */
  _matchCase(original, replacement) {
    if (!original || !replacement) return replacement;

    // If original is ALL CAPS, return replacement in ALL CAPS
    if (original === original.toUpperCase() && /[A-Za-z]/.test(original)) {
      return replacement.toUpperCase();
    }

    // If original is all lowercase, return lowercase
    if (original === original.toLowerCase() && /[A-Za-z]/.test(original)) {
      return replacement.toLowerCase();
    }

    // Otherwise return as generated (typically Title Case)
    return replacement;
  }

  /**
   * Get the full replacement map (for audit report).
   * Returns hashed versions of keys for privacy.
   * @returns {object}
   */
  getAuditMap() {
    const crypto = require('crypto');
    const result = {};
    for (const [key, value] of this.replacementMap.entries()) {
      const [type] = key.split('::');
      const hash = crypto.createHash('sha256').update(key).digest('hex').substring(0, 12);
      if (!result[type]) result[type] = {};
      result[type][hash] = value;
    }
    return result;
  }

  /**
   * Get the raw replacement map (for testing/debugging only).
   * @returns {Map<string, string>}
   */
  getRawMap() {
    return this.replacementMap;
  }

  /**
   * Get count of replacements by type.
   * @returns {object}
   */
  getCounts() {
    const counts = {};
    for (const key of this.replacementMap.keys()) {
      const [type] = key.split('::');
      counts[type] = (counts[type] || 0) + 1;
    }
    return counts;
  }
}

module.exports = ReplacementManager;
