
const { getNormalizer } = require('../utils/normalization');
const fakeGen = require('./fakeDataGenerator');

class ReplacementManager {
  constructor() {
        this.replacementMap = new Map();

        this.personIdentities = new Map();

        this.domainMap = new Map();
  }

    getReplacement(type, originalValue) {
    const normalizer = getNormalizer(type);
    const normalizedKey = `${type}::${normalizer(originalValue)}`;

    if (this.replacementMap.has(normalizedKey)) {
      const replacement = this.replacementMap.get(normalizedKey);
      
      return this._matchCase(originalValue, replacement);
    }

    const replacement = this._generateReplacement(type, originalValue);
    this.replacementMap.set(normalizedKey, replacement);
    return this._matchCase(originalValue, replacement);
  }

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

    _generatePersonReplacement(originalName) {
    const normalized = getNormalizer('PERSON')(originalName);

    if (this.personIdentities.has(normalized)) {
      return this.personIdentities.get(normalized).fullName;
    }

    const identity = fakeGen.generatePerson();
    this.personIdentities.set(normalized, identity);
    return identity.fullName;
  }

    _generateEmailReplacement(originalEmail) {
    const localPart = originalEmail.split('@')[0];
    const domain = originalEmail.split('@')[1];

    for (const [normalizedName, identity] of this.personIdentities.entries()) {
      const nameParts = normalizedName.split(/\s+/);
      const emailParts = localPart.toLowerCase().split(/[._-]/);

      const matchCount = nameParts.filter(np =>
        emailParts.some(ep => ep === np || np.startsWith(ep))
      ).length;

      if (matchCount >= 1 && nameParts.length <= 3) {
        return fakeGen.generateEmail(identity.firstName, identity.lastName);
      }
    }

    return fakeGen.generateEmail(null, null);
  }

    _matchCase(original, replacement) {
    if (!original || !replacement) return replacement;

    if (original === original.toUpperCase() && /[A-Za-z]/.test(original)) {
      return replacement.toUpperCase();
    }

    if (original === original.toLowerCase() && /[A-Za-z]/.test(original)) {
      return replacement.toLowerCase();
    }

    return replacement;
  }

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

    getRawMap() {
    return this.replacementMap;
  }

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
