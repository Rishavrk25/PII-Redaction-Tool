
const ReplacementManager = require('../../src/replacement/replacementManager');
const fakeGen = require('../../src/replacement/fakeDataGenerator');

describe('ReplacementManager', () => {
  let manager;

  beforeEach(() => {
    
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

    expect(val1).toBe(val1); 
    expect(val2).toBe(val1.toUpperCase()); 
  });

  test('preserves person-email relationship', () => {
    
    const personReplacement = manager.getReplacement('PERSON', 'Alice Smith');

    const emailReplacement = manager.getReplacement('EMAIL', 'alice.smith@example.com');

    const [firstName, lastName] = personReplacement.split(' ');
    expect(emailReplacement.toLowerCase()).toContain(firstName.toLowerCase());
    expect(emailReplacement.toLowerCase()).toContain(lastName.toLowerCase());
  });

  test('different types generate different replacements even with same original value', () => {
    const p1 = manager.getReplacement('COMPANY', 'Apple Limited');
    const p2 = manager.getReplacement('PERSON', 'Apple Limited'); 
    expect(p1).not.toBe(p2);
  });
});
