const config = {
    detectors: {
    email: true,
    phone: true,
    person: true,
    company: true,
    address: true,
    ssn: true,
    creditCard: true,
    dob: true,
    ip: true,
  },

    threshold: 0.70,

    fakerSeed: 42,

    paths: {
    defaultOutput: 'output/',
    defaultReport: 'reports/pii-audit.json',
    groundTruth: 'evaluation/ground_truth.json',
    evaluationReport: 'evaluation/evaluation-report.md',
  },

    detectorPriority: [
    'COMPANY',
    'PERSON',
    'ADDRESS',
    'DOB',
    'IP',
    'PHONE',
    'EMAIL',
    'SSN',
    'CREDIT_CARD',
  ],

    contextWindow: 60,

    privacySafeLogging: true,
};

module.exports = config;
