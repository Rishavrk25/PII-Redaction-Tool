/**
 * Default configuration for the PII Redaction Tool.
 * 
 * All settings can be overridden via CLI flags or environment variables.
 */
const config = {
  /** Which detectors are enabled */
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

  /**
   * Minimum confidence threshold for automatic redaction.
   * Detections below this are logged but not redacted.
   *   >= 0.90 — high confidence, auto-redact
   *   0.70–0.89 — medium, redact but flag in audit
   *   < 0.70 — low, skip unless forced
   */
  threshold: 0.70,

  /** Seed for deterministic Faker output */
  fakerSeed: 42,

  /** Default paths */
  paths: {
    defaultOutput: 'output/',
    defaultReport: 'reports/pii-audit.json',
    groundTruth: 'evaluation/ground_truth.json',
    evaluationReport: 'evaluation/evaluation-report.md',
  },

  /**
   * Conflict resolution priority (higher index = higher priority).
   * When detections overlap, the type with higher priority wins.
   */
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

  /** Context window: number of characters around a detection to include */
  contextWindow: 60,

  /** Privacy-safe logging: if true, raw PII values are never logged */
  privacySafeLogging: true,
};

module.exports = config;
