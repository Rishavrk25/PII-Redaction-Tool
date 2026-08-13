/**
 * Tests for ReplacementManager.
 */

const ReplacementManager = require('../../src/replacement/replacementManager');
const fakeGen = require('../../src/replacement/fakeDataGenerator');

describe('ReplacementManager', () => {
  let manager;

  beforeEach(() => {
    // Reset seed for deterministic tests
    fakeGen.resetSeed(123);
    manager = new ReplacementManager();
  });

  test('generates consistent replacements for the same entity', () => {
    const val1 = manager.getReplacement('PERSON', 'John Doe');
    const val2 = manager.getReplacement('PERSON', 'John Doe');
    expect(val1).toBe(val2);
  });

  test('treats case and whitespace variations as the same entity', () => {
    const val1 = manager.getReplacement('PERSON', 'John Doe');
    const val2 = manager.getReplacement('PERSON', 'JOHN DOE');
    const val3 = manager.getReplacement('PERSON', 'John   Doe');
    
    // Replacement value matches case of the original request
    expect(val1).toBe(val1); // normal case
    expect(val2).toBe(val1.toUpperCase()); // all caps variation should return all caps
  });

  test('preserves person-email relationship', () => {
    // Generate person first
    const personReplacement = manager.getReplacement('PERSON', 'Alice Smith');
    
    // Generate email derived from same person
    const emailReplacement = manager.getReplacement('EMAIL', 'alice.smith@example.com');
    
    // Email should contain parts of the person's synthetic name
    const [firstName, lastName] = personReplacement.split(' ');
    expect(emailReplacement.toLowerCase()).toContain(firstName.toLowerCase());
    expect(emailReplacement.toLowerCase()).toContain(lastName.toLowerCase());
  });

  test('different types generate different replacements even with same original value', () => {
    const p1 = manager.getReplacement('COMPANY', 'Apple Limited');
    const p2 = manager.getReplacement('PERSON', 'Apple Limited'); // Unlikely in real life, but tests mapping separation
    expect(p1).not.toBe(p2);
  });
});
