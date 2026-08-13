/**
 * Normalization utilities for entity comparison and deduplication.
 * Ensures that the same real-world entity (written in different formats)
 * maps to a single canonical form for consistent replacement.
 * @module utils/normalization
 */

/**
 * Normalize a person name for comparison.
 * Collapses whitespace, lowercases, removes titles and suffixes.
 * @param {string} name - Raw name string
 * @returns {string} Normalized name key
 */
function normalizeName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(mr\.?|mrs\.?|ms\.?|dr\.?|prof\.?|shri\.?|smt\.?)\b/gi, '')
    .replace(/[*^&]/g, '')        // remove annotation markers like *^&
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize an email address for comparison.
 * @param {string} email
 * @returns {string} Lowercased, trimmed email
 */
function normalizeEmail(email) {
  if (!email) return '';
  return email.toLowerCase().trim();
}

/**
 * Normalize a phone number for comparison.
 * Strips all non-digit characters except leading +.
 * @param {string} phone
 * @returns {string} Digits-only phone (with optional leading +)
 */
function normalizePhone(phone) {
  if (!phone) return '';
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits;
}

/**
 * Normalize a company name for comparison.
 * @param {string} company
 * @returns {string} Normalized company key
 */
function normalizeCompany(company) {
  if (!company) return '';
  return company
    .toLowerCase()
    .replace(/[*^&]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize an address for comparison.
 * @param {string} address
 * @returns {string} Normalized address key
 */
function normalizeAddress(address) {
  if (!address) return '';
  return address
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[,;]+/g, ',')
    .trim();
}

/**
 * Normalize generic text for comparison.
 * @param {string} text
 * @returns {string}
 */
function normalizeGeneric(text) {
  if (!text) return '';
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Get the normalization function for a given PII type.
 * @param {string} type - PII type (PERSON, EMAIL, PHONE, etc.)
 * @returns {Function} Normalization function
 */
function getNormalizer(type) {
  const normalizers = {
    PERSON: normalizeName,
    EMAIL: normalizeEmail,
    PHONE: normalizePhone,
    COMPANY: normalizeCompany,
    ADDRESS: normalizeAddress,
  };
  return normalizers[type] || normalizeGeneric;
}

module.exports = {
  normalizeName,
  normalizeEmail,
  normalizePhone,
  normalizeCompany,
  normalizeAddress,
  normalizeGeneric,
  getNormalizer,
};
