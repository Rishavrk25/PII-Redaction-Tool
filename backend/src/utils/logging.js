/**
 * Privacy-safe logging utility.
 * In safe mode, PII values are never printed — only type and position are logged.
 * @module utils/logging
 */

const config = require('../../config/default');

/** Current verbosity level */
let verbose = false;

/**
 * Set the verbose flag.
 * @param {boolean} v
 */
function setVerbose(v) {
  verbose = !!v;
}

/**
 * Log a PII detection in a privacy-safe manner.
 * @param {object} detection - { type, value, start, end, confidence, detector }
 */
function logDetection(detection) {
  if (!verbose) return;

  if (config.privacySafeLogging) {
    console.log(
      `  [${detection.type}] detected at position ${detection.start}–${detection.end} ` +
      `(confidence: ${detection.confidence.toFixed(2)}, detector: ${detection.detector})`
    );
  } else {
    console.log(
      `  [${detection.type}] "${detection.value}" at ${detection.start}–${detection.end} ` +
      `(confidence: ${detection.confidence.toFixed(2)})`
    );
  }
}

/**
 * Log general info.
 * @param {string} message
 */
function info(message) {
  console.log(`[INFO] ${message}`);
}

/**
 * Log verbose details (only when --verbose is set).
 * @param {string} message
 */
function debug(message) {
  if (verbose) {
    console.log(`[DEBUG] ${message}`);
  }
}

/**
 * Log a warning.
 * @param {string} message
 */
function warn(message) {
  console.warn(`[WARN] ${message}`);
}

/**
 * Log an error.
 * @param {string} message
 */
function error(message) {
  console.error(`[ERROR] ${message}`);
}

module.exports = { setVerbose, logDetection, info, debug, warn, error };
