
function luhnCheck(number) {
  const digits = number.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let alternate = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }

  return sum % 10 === 0;
}

/**
 * Validate an IPv4 address.
 * Each octet must be 0–255, no leading zeros (except "0" itself).
 * @param {string} ip - IP address string like "192.168.1.1"
 * @returns {boolean}
 */
function isValidIPv4(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;

  return parts.every(part => {
    if (!/^\d{1,3}$/.test(part)) return false;
    const num = parseInt(part, 10);
    if (num < 0 || num > 255) return false;
    // Reject leading zeros (e.g., "01", "001") but allow "0"
    if (part.length > 1 && part[0] === '0') return false;
    return true;
  });
}

function isValidEmail(email) {
  
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email);
}

function isValidIndianPIN(pin) {
  const digits = pin.replace(/\s/g, '');
  return /^[1-9]\d{5}$/.test(digits);
}

function looksLikeFinancialAmount(context) {
  return /[₹$€£]|million|crore|lakh|billion|per\s+share|face\s+value|aggregat/i.test(context);
}

function looksLikeRegulatoryNumber(context) {
  return /\b(SEBI|CIN|PAN|TAN|GSTIN|registration\s+number|certificate|form\s+\d|section\s+\d|regulation|rule)/i.test(context);
}

module.exports = {
  luhnCheck,
  isValidIPv4,
  isValidEmail,
  isValidIndianPIN,
  looksLikeFinancialAmount,
  looksLikeRegulatoryNumber,
};
