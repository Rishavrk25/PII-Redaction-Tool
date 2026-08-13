
const BaseDetector = require('./baseDetector');

const STRICT_NAME_REGEX = /([A-Z][a-z]{1,15}(?:\s+[A-Z][a-z]{1,15}){1,3})/;

const PERSON_LABELS_WITH_COLON = [
  { regex: /Contact\s+Person\s*:\s*/gi, confidence: 0.93 },
  { regex: /Contact\s+Person\s*:\s*(?:[A-Z][a-z]+\s+)*?/gi, confidence: 0.93 },
];

const ROLE_SUFFIXES = [
  'Company Secretary and Compliance Officer',
  'Company Secretary',
  'Compliance Officer',
  'Managing Director',
  'Chief Executive Officer',
  'Chief Financial Officer',
  'Whole-Time Director',
  'Whole Time Director',
  'Joint Managing Director',
  'Executive Director',
  'Independent Director',
  'Chairman and Executive Director',
  'Chairman',
  'Director',
  'Chartered Accountants',
  'Partner',
  'Promoter Selling Shareholder',
];

const FALSE_POSITIVE_NAMES = new Set([
  'red herring', 'fresh issue', 'offer price', 'price band',
  'equity shares', 'face value', 'net proceeds', 'offer for',
  'our company', 'our board', 'our promoters', 'the offer',
  'the company', 'each of', 'all of', 'none of', 'any of',
  'some of', 'most of', 'two of', 'four of', 'eight of',
  'both of', 'one of', 'such of', 'certain of',
  'public offer', 'initial public', 'bid offer', 'book built',
  'book building', 'anchor investor', 'book running', 'lead manager',
  'stock exchange', 'mutual fund', 'share capital', 'general risks',
  'risk factors', 'working day', 'working days', 'private limited',
  'public limited', 'registered office', 'corporate office',
  'net worth', 'total income', 'profit after', 'profit before',
  'cash flow', 'balance sheet', 'fiscal year', 'financial year',
  'companies act', 'supreme court', 'high court',
  'offer date', 'closing date', 'opening date',
  'long term', 'short term', 'net debt', 'manufacturing unit',
  'department of', 'interest of', 'interests of',
  'promoter group', 'group and', 'against our',
  'by our', 'for sale', 'the members', 'the interests',
  'the board', 'the right', 'the requirement', 'the joint',
  'the managing', 'the institute', 'board of',
  'new delhi', 'share premium', 'paid up',
  'metal extrusion', 'industrial park', 'offer closing',
  'offer opening', 'selling shareholder', 'selling shareholders',
  'product three', 'product fiscal', 'rating outlook',
  'instrument december', 'anchor investor', 'offer date',
  'fiscal period', 'photo voltaic', 'short term bank',
  'pandit llp'
]);

class PersonDetector extends BaseDetector {
  constructor() {
    super('PERSON', 'person-context');
        this.knownNames = new Set();
  }

    detect(text) {
    const detections = [];
    const seen = new Set(); 

    this._detectNameCommaRole(text, detections, seen);
    this._detectContactPerson(text, detections, seen);
    this._detectSlashNames(text, detections, seen);
    this._detectTitlePrefixed(text, detections, seen);
    this._detectPromoterNames(text, detections, seen);

    this._searchKnownNames(text, detections, seen);

    return detections;
  }

    _detectNameCommaRole(text, detections, seen) {
    for (const suffix of ROLE_SUFFIXES) {
      const escaped = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(
        '([A-Z][a-z]{1,15}(?:\\s+[A-Z][a-z]{1,15}){1,3})\\s*,?\\s+' + escaped,
        'gi'
      );
      let match;
      while ((match = regex.exec(text)) !== null) {
        const name = match[1].trim();
        if (!this._isValidName(name)) continue;

        const nameStart = match.index;
        const nameEnd = nameStart + name.length;
        this._addDetection(name, nameStart, nameEnd, 0.92, text, detections, seen);
      }
    }
  }

    _detectContactPerson(text, detections, seen) {
    const regex = /Contact\s+Person\s*:\s*([A-Z][a-z]{1,15}(?:\s+[A-Z][a-z]{1,15}){1,3})/gi;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const name = match[1].trim();
      if (!this._isValidName(name)) continue;

      const nameIdx = match[0].indexOf(match[1]);
      const nameStart = match.index + nameIdx;
      const nameEnd = nameStart + name.length;
      this._addDetection(name, nameStart, nameEnd, 0.94, text, detections, seen);
    }
  }

    _detectTitlePrefixed(text, detections, seen) {
    const regex = /\b(?:Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Shri\.?|Smt\.?)\s+([A-Z][a-z]{1,15}(?:\s+[A-Z][a-z]{1,15}){1,3})\b/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const name = match[1].trim();
      if (!this._isValidName(name)) continue;

      const nameIdx = match[0].indexOf(match[1]);
      const nameStart = match.index + nameIdx;
      const nameEnd = nameStart + name.length;
      this._addDetection(name, nameStart, nameEnd, 0.93, text, detections, seen);
    }
  }

    _detectSlashNames(text, detections, seen) {
    
    const regex = /Contact\s+Person\s*:\s*((?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\s*\/\s*)*[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/gi;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const nameList = match[1];
      const names = nameList.split(/\s*\/\s*/).map(n => n.trim()).filter(Boolean);

      for (const name of names) {
        if (!this._isValidName(name)) continue;

        const nameStart = text.indexOf(name, match.index);
        if (nameStart === -1) continue;
        const nameEnd = nameStart + name.length;
        this._addDetection(name, nameStart, nameEnd, 0.90, text, detections, seen);
      }
    }

    const slashRegex = /\b([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*\/\s*([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g;
    while ((match = slashRegex.exec(text)) !== null) {
      for (let i = 1; i <= 2; i++) {
        const name = match[i].trim();
        if (!this._isValidName(name)) continue;
        const nameStart = text.indexOf(name, match.index);
        if (nameStart === -1) continue;
        const nameEnd = nameStart + name.length;
        this._addDetection(name, nameStart, nameEnd, 0.85, text, detections, seen);
      }
    }
  }

    _detectPromoterNames(text, detections, seen) {
    const regex = /OUR\s+PROMOTERS\s*:\s*([^\n]+(?:\n[^\n]{5,})*)/gi;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const section = match[1];
      
      const parts = section.split(/\s*,\s*|\s+AND\s+/i);
      for (const part of parts) {
        const trimmed = part.trim();
        
        if (/TRUST|LIMITED|PRIVATE|LTD|LLP|COMPANY|CORPORATION|PARK/i.test(trimmed)) continue;
        if (trimmed.length < 5 || trimmed.length > 50) continue;

        const titleCase = trimmed.replace(/\b\w+/g, w =>
          w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
        );

        const words = titleCase.split(/\s+/).filter(w => w.length >= 2);
        if (words.length < 2 || words.length > 4) continue;
        if (!this._isValidName(titleCase)) continue;

        this.knownNames.add(titleCase);
      }
    }
  }

    _searchKnownNames(text, detections, seen) {
    for (const name of this.knownNames) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      const regex = new RegExp(`\\b${escaped}\\b`, 'g');
      let match;
      while ((match = regex.exec(text)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        this._addDetection(match[0], start, end, 0.85, text, detections, seen);
      }

      const upperName = name.toUpperCase();
      const upperEscaped = upperName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const upperRegex = new RegExp(`\\b${upperEscaped}\\b`, 'g');
      while ((match = upperRegex.exec(text)) !== null) {
        const start = match.index;
        const end = start + match[0].length;

        if (!this._isInPersonContext(text, start)) continue;
        this._addDetection(match[0], start, end, 0.82, text, detections, seen);
      }
    }
  }

    _addDetection(name, start, end, confidence, text, detections, seen) {
    
    let cleanName = name.replace(/^[\s\n]+|[\s\n]+$/g, '').replace(/\n+/g, ' ').replace(/[*^&]/g, '').trim();
    
    // Check if the clean name is just a fragment of the original match
    if (cleanName.length < 5) return;

    // Adjust start/end based on trimmed whitespace (approximate)
    const adjustedStart = text.indexOf(cleanName, start - 10);
    const finalStart = adjustedStart !== -1 ? adjustedStart : start;
    const finalEnd = finalStart + cleanName.length;

    const key = `${finalStart}-${finalEnd}`;
    if (seen.has(key)) return;

    if (!this._isValidName(cleanName)) return;

    seen.add(key);
    this.knownNames.add(cleanName);
    detections.push(this.buildDetection(cleanName, finalStart, finalEnd, confidence, text));
  }

  /**
   * Check if a candidate name is valid.
   * @private
   */
  _isValidName(name) {
    if (!name) return false;

    // Reject if it contains double newlines (usually means it spanned paragraphs)
    if (/\n\s*\n/.test(name)) return false;

    const lower = name.toLowerCase().trim();

    // Check false positives
    if (FALSE_POSITIVE_NAMES.has(lower)) return true === false;

    // Must be 2-4 words, each at least 2 chars
    const words = name.trim().split(/\s+/);
    if (words.length < 2 || words.length > 4) return false;
    if (words.some(w => w.replace(/[*^&.]/g, '').length < 2)) return false;

    const isAllCaps = name === name.toUpperCase();
    if (!isAllCaps) {
      if (!words.every(w => /^[A-Z]/.test(w))) return false;
    }

    if (/\d/.test(name)) return false;

    if (/\b(the|of|and|or|in|on|at|to|for|from|by|with|our|their|its|this|that|such|any|all|no|not)\b/i.test(name)) {
      return false;
    }

    if (name.length > 50) return false;

    return true;
  }

    _isInPersonContext(text, position) {
    const before = text.substring(Math.max(0, position - 200), position).toLowerCase();
    const after = text.substring(position, Math.min(text.length, position + 200)).toLowerCase();
    const window = before + after;
    return /promoter|director|chairman|contact\s+person|shareholder|secretary|officer|spouse|hegde|shetty/i.test(window);
  }
}

module.exports = PersonDetector;
