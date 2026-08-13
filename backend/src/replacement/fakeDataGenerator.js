
const { faker } = require('@faker-js/faker');
const config = require('../../config/default');

faker.seed(config.fakerSeed);

let personCounter = 0;
let companyCounter = 0;

function generatePerson() {
  personCounter++;
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
  };
}

function generateEmail(firstName, lastName) {
  if (firstName && lastName) {
    const domains = ['example.com', 'example.org', 'example.net'];
    const domain = domains[Math.floor(faker.number.int({ max: domains.length - 1 }))];
    return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;
  }
  return faker.internet.email({ provider: 'example.com' });
}

function generatePhone(original) {
  
  const digits = [];
  for (let i = 0; i < 10; i++) {
    digits.push(faker.number.int({ min: 0, max: 9 }));
  }
  
  digits[0] = faker.number.int({ min: 1, max: 9 });

  const raw = digits.join('');

  // Try to match the original's format
  if (!original) return `+91 ${raw.substring(0, 5)} ${raw.substring(5)}`;

  if (/^\+\s*91/.test(original)) {
    
    if (/^\+\s*91\s+\d{2}\s+\d{4}\s+\d{4}/.test(original)) {
      return `+91 ${raw.substring(0, 2)} ${raw.substring(2, 6)} ${raw.substring(6)}`;
    }
    if (/^\+\s*91\s+\d{5}\s+\d{5}/.test(original)) {
      return `+91 ${raw.substring(0, 5)} ${raw.substring(5)}`;
    }
    return `+91 ${raw.substring(0, 5)} ${raw.substring(5)}`;
  }

  if (/^0\d{2,3}[\s-]/.test(original)) {
    
    const stdCode = original.match(/^(0\d{2,3})/)[1];
    const fakeStd = '0' + faker.number.int({ min: 10, max: 99 });
    return `${fakeStd} ${raw.substring(0, 4)} ${raw.substring(4, 8)}`;
  }

  if (/^022-/.test(original)) {
    return `011-${raw.substring(0, 8)}`;
  }

  return `+91 ${raw.substring(0, 5)} ${raw.substring(5)}`;
}

function generateSSN() {
  const area = faker.number.int({ min: 100, max: 599 });
  const group = faker.number.int({ min: 1, max: 99 });
  const serial = faker.number.int({ min: 1, max: 9999 });
  return `${String(area).padStart(3, '0')}-${String(group).padStart(2, '0')}-${String(serial).padStart(4, '0')}`;
}

function generateCreditCard() {
  
  const testCards = [
    '4111 1111 1111 1111',
    '5500 0000 0000 0004',
    '3400 0000 0000 009',
    '6011 0000 0000 0004',
  ];
  return testCards[faker.number.int({ min: 0, max: testCards.length - 1 })];
}

function generateDOB() {
  const date = faker.date.birthdate({ min: 25, max: 65, mode: 'age' });
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function generateIP() {
  const testNets = ['192.0.2', '198.51.100', '203.0.113'];
  const net = testNets[faker.number.int({ min: 0, max: testNets.length - 1 })];
  return `${net}.${faker.number.int({ min: 1, max: 254 })}`;
}

function generateCompany(original) {
  companyCounter++;
  const baseName = faker.company.name();

  if (!original) return `${baseName} Limited`;

  if (/Private\s+Limited|Pvt\.?\s*Ltd\.?/i.test(original)) {
    return `${baseName} Private Limited`;
  }
  if (/LLP/i.test(original)) {
    return `${baseName} LLP`;
  }
  if (/Limited|Ltd\.?/i.test(original)) {
    return `${baseName} Limited`;
  }
  if (/Corporation/i.test(original)) {
    return `${baseName} Corporation`;
  }
  if (/Inc\.?/i.test(original)) {
    return `${baseName} Inc.`;
  }
  if (/Bank/i.test(original)) {
    return `${baseName} Bank`;
  }
  if (/N\.?\s*A\.?/i.test(original)) {
    return `${baseName} N.A.`;
  }

  return `${baseName} Limited`;
}

function generateAddress() {
  const plotNum = faker.number.int({ min: 1, max: 200 });
  const floor = faker.number.int({ min: 1, max: 10 });
  const building = faker.company.name() + ' Tower';
  const road = faker.location.street();
  const city = faker.helpers.arrayElement(['New Delhi', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Chandigarh']);
  const pin = faker.number.int({ min: 100001, max: 899999 });
  const state = faker.helpers.arrayElement(['Delhi', 'West Bengal', 'Gujarat', 'Rajasthan', 'Uttar Pradesh', 'Punjab']);

  return `Plot No. ${plotNum}, ${floor}${getOrdinal(floor)} Floor, ${building}, ${road}, ${city} – ${pin}, ${state}, India`;
}

function getOrdinal(n) {
  if (n % 10 === 1 && n % 100 !== 11) return 'st';
  if (n % 10 === 2 && n % 100 !== 12) return 'nd';
  if (n % 10 === 3 && n % 100 !== 13) return 'rd';
  return 'th';
}

function resetSeed(seed) {
  faker.seed(seed || config.fakerSeed);
  personCounter = 0;
  companyCounter = 0;
}

module.exports = {
  generatePerson,
  generateEmail,
  generatePhone,
  generateSSN,
  generateCreditCard,
  generateDOB,
  generateIP,
  generateCompany,
  generateAddress,
  resetSeed,
};
