
const EmailDetector = require('../../src/detectors/emailDetector');

describe('EmailDetector', () => {
  const detector = new EmailDetector();

  test('detects a standard email address', () => {
    const text = 'Contact us at john.doe@example.com for details.';
    const results = detector.detect(text);
    expect(results.length).toBe(1);
    expect(results[0].value).toBe('john.doe@example.com');
    expect(results[0].type).toBe('EMAIL');
    expect(results[0].confidence).toBeGreaterThanOrEqual(0.90);
  });

  test('detects email with "Email:" context label', () => {
    const text = 'Email: cs.connect@kshinternational.com';
    const results = detector.detect(text);
    expect(results.length).toBe(1);
    expect(results[0].value).toBe('cs.connect@kshinternational.com');
    expect(results[0].confidence).toBeGreaterThanOrEqual(0.95);
  });

  test('detects multiple emails in one text', () => {
    const text = 'Send to alice@example.com or bob@example.org for help.';
    const results = detector.detect(text);
    expect(results.length).toBe(2);
  });

  test('does not detect invalid email', () => {
    const text = 'This is not@email or just @example.com';
    const results = detector.detect(text);
    expect(results.length).toBe(0);
  });

  test('does not detect email-like patterns in URLs', () => {
    const text = 'Visit https://user@example.com/page';
    const results = detector.detect(text);
    
    expect(results.length).toBe(0);
  });

  test('detects Indian-style business emails', () => {
    const text = 'E-mail: prakash.boricha@nuvama.com Website: www.nuvama.com';
    const results = detector.detect(text);
    expect(results.length).toBe(1);
    expect(results[0].value).toBe('prakash.boricha@nuvama.com');
  });
});
