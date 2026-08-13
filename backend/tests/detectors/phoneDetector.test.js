/**
 * Tests for PhoneDetector.
 */

const PhoneDetector = require('../../src/detectors/phoneDetector');

describe('PhoneDetector', () => {
  const detector = new PhoneDetector();

  test('detects Indian mobile numbers', () => {
    const text = 'Call me at +91 9876543210 for details.';
    const results = detector.detect(text);
    expect(results.length).toBe(1);
    expect(results[0].value.replace(/\s+/g, '')).toBe('+919876543210');
  });

  test('detects Indian landline numbers with STD codes', () => {
    const text = 'Tel: 022-26403100 or Tel: 020-66064494';
    const results = detector.detect(text);
    expect(results.length).toBe(2);
    expect(results[0].value).toBe('022-26403100');
    expect(results[1].value).toBe('020-66064494');
  });

  test('rejects numbers that are clearly financial figures', () => {
    const text = 'Profit was Rs. 98,76,54,321 and cost was $ 1,234,567.89.';
    const results = detector.detect(text);
    expect(results.length).toBe(0);
  });

  test('detects numbers formatted with parentheses', () => {
    const text = 'Phone: +91 (20) 6729 5100';
    const results = detector.detect(text);
    expect(results.length).toBe(1);
    expect(results[0].value).toBe('91 (20) 6729 5100');
  });
});
