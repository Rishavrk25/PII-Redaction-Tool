
const BaseDetector = require('./baseDetector');

const COMPANY_SUFFIX_PATTERNS = [
  
  /\b([A-Z][a-zA-Z&.'()-]+(?:\s+[A-Z][a-zA-Z&.'()-]+){0,5})\s+(?:Private\s+Limited|Pvt\.?\s*Ltd\.?)\b/g,
  
  /\b([A-Z][a-zA-Z&.'()-]+(?:\s+[A-Z][a-zA-Z&.'()-]+){0,5})\s+(?:Limited|Ltd\.?)\b/g,
  
  /\b([A-Z][a-zA-Z&.'()-]+(?:\s+[A-Z][a-zA-Z&.'()-]+){0,5})\s+LLP\b/g,
  
  /\b([A-Z][a-zA-Z&.'()-]+(?:\s+[A-Z][a-zA-Z&.'()-]+){0,5})\s+(?:Corporation|Inc\.?|Incorporated)\b/g,
  
  /\b([A-Z][a-zA-Z&.'()-]+(?:\s+[A-Z][a-zA-Z&.'()-]+){0,3})\s+N\.?\s*A\.?\b/g,
  
  /\b([A-Z][a-zA-Z&.'()-]+(?:\s+[A-Z][a-zA-Z&.'()-]+){0,3})\s+&\s+(?:Associates|Co\.?)\b/g
];

const EXCLUDED_ORGS = new Set([
  'securities and exchange board of india',
  'reserve bank of india',
  'government of india',
  'ministry of corporate affairs',
  'registrar of companies',
  'national stock exchange of india limited',
  'bse limited',
  'central depository services india limited',
  'national securities depository limited',
  'central processing centre',
  'income tax',
  'goods and services tax',
  'central board',
  'regional director',
  'insurance regulatory',
  'pension fund',
  'indian penal',
  'national payments corporation',
  'solar energy corporation'
]);

const FALSE_POSITIVE_COMPANIES = new Set([
  'private limited',
  'public limited',
  'limited',
  'our company',
  'the company',
  'a company',
  'holding company',
  'parent company',
  'subsidiary company',
  'associate company',
  'group company',
  'any company',
  'such company',
  'other company',
  'one company',
  'another company',
  'foreign company',
  'indian company'
]);

class CompanyDetector extends BaseDetector {
  constructor() {
    super('COMPANY', 'company-suffix');
    this.knownCompanies = new Set();
  }

    detect(text) {
    const detections = [];
    const seen = new Set();

    this._detectBySuffix(text, detections, seen);

    this._detectFromContext(text, detections, seen);

    this._searchForKnownCompanies(text, detections, seen);

    return detections;
  }

    _detectBySuffix(text, detections, seen) {
    for (const pattern of COMPANY_SUFFIX_PATTERNS) {
      let match;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(text)) !== null) {
        let value = match[0].trim();
        const start = match.index + match[0].indexOf(value);
        let end = start + value.length;

        if (/\n\s*\n/.test(value)) continue; 
        value = value.replace(/\n+/g, ' ').replace(/\s+/g, ' ');

        if (this._isFalsePositive(value)) continue;
        if (this._isExcludedOrg(value)) continue;

        let cleanValue = value.replace(/^(The|A|An|Our|To|For|Of|In|By|With)\s+/i, '');
        
        // Find the actual start/end in the original text of the cleaned value
        const cleanStart = text.indexOf(cleanValue, start - 10);
        if (cleanStart === -1) continue;
        end = cleanStart + cleanValue.length;

        // Company name must be at least 2 words
        const words = cleanValue.split(/\s+/);
        if (words.length < 2) continue;

        const key = `${cleanStart}-${end}`;
        if (seen.has(key)) continue;
        
        // Prevent matching generic phrases like "Offer Escrow Collection Bank HDFC Bank Limited"
        cleanValue = this._trimGenericPrefixes(cleanValue);
        const finalStart = text.indexOf(cleanValue, cleanStart);
        if (finalStart === -1) continue;

        if (this._isFalsePositive(cleanValue)) continue;

        const finalKey = `${finalStart}-${finalStart + cleanValue.length}`;
        if (seen.has(finalKey)) continue;

        seen.add(finalKey);
        this.knownCompanies.add(cleanValue);
        detections.push(this.buildDetection(cleanValue, finalStart, finalStart + cleanValue.length, 0.90, text));
      }
    }
  }

  /**
   * Detect companies from structured context labels.
   * @private
   */
  _detectFromContext(text, detections, seen) {
    // "Formerly XYZ" pattern
    const formerlyRegex = /\bFormerly\s+([A-Z][a-zA-Z&.'()\s-]+(?:Limited|Ltd\.?|LLP|Private Limited|Pvt\.?\s*Ltd\.?))\b/gi;
    let match;
    while ((match = formerlyRegex.exec(text)) !== null) {
      const value = match[1].trim();
      const start = match.index + match[0].indexOf(match[1]);
      const end = start + value.length;
      const key = `${start}-${end}`;
      if (seen.has(key) || this._isExcludedOrg(value)) continue;
      seen.add(key);
      this.knownCompanies.add(value);
      detections.push(this.buildDetection(value, start, end, 0.88, text));
    }

    const bankRegex = /\b([A-Z][a-zA-Z&.'()-]+(?:\s+[A-Z][a-zA-Z&.'()-]+){0,3}\s+Bank(?:\s+(?:Limited|Ltd\.?|of\s+India))?)\b/g;
    while ((match = bankRegex.exec(text)) !== null) {
      let value = match[0].trim();
      const start = match.index;
      const end = start + value.length;
      
      value = this._trimGenericPrefixes(value);
      const finalStart = end - value.length;
      const key = `${finalStart}-${end}`;

      if (seen.has(key) || this._isExcludedOrg(value)) continue;
      if (value.split(/\s+/).length < 2) continue;
      if (this._isFalsePositive(value)) continue;

      if (/reserve\s+bank/i.test(value)) continue;
      if (/state\s+bank/i.test(value)) continue; 

      seen.add(key);
      this.knownCompanies.add(value);
      detections.push(this.buildDetection(value, finalStart, end, 0.88, text));
    }
  }

    _searchForKnownCompanies(text, detections, seen) {
    for (const company of this.knownCompanies) {
      const escaped = company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        const value = match[0];
        const start = match.index;
        const end = start + value.length;
        const key = `${start}-${end}`;
        if (seen.has(key)) continue;
        seen.add(key);
        detections.push(this.buildDetection(value, start, end, 0.85, text));
      }
    }
  }

    _trimGenericPrefixes(name) {
    const prefixes = [
      /^(?:Offer\s+)?Escrow\s+Collection\s+Bank\s+/i,
      /^(?:Public\s+)?Offer\s+Account\s+Bank\s+/i,
      /^Refund\s+Bank\s+/i,
      /^Sponsor\s+Bank(?:s)?\s+/i,
      /^Syndicate\s+Member(?:s)?\s+/i,
      /^Book\s+Running\s+Lead\s+Manager(?:s)?\s+/i,
      /^Corporate\s+Promoter\s+/i,
    ];
    
    let result = name;
    for (const p of prefixes) {
      result = result.replace(p, '');
    }
    return result.trim();
  }

  /**
   * @private
   */
  _isFalsePositive(name) {
    const lower = name.toLowerCase().trim();
    if (FALSE_POSITIVE_COMPANIES.has(lower)) return true;
    
    // Check if it's just a generic term followed by Limited
    if (/^(india|private|public|guarantee)\s+limited$/i.test(lower)) return true;
    
    return false;
  }

    _isExcludedOrg(name) {
    const lower = name.toLowerCase().trim();
    return [...EXCLUDED_ORGS].some(org => lower.includes(org));
  }
}

module.exports = CompanyDetector;
