
const config = require('../../config/default');

let verbose = false;

function setVerbose(v) {
  verbose = !!v;
}

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

function info(message) {
  console.log(`[INFO] ${message}`);
}

function debug(message) {
  if (verbose) {
    console.log(`[DEBUG] ${message}`);
  }
}

function warn(message) {
  console.warn(`[WARN] ${message}`);
}

function error(message) {
  console.error(`[ERROR] ${message}`);
}

module.exports = { setVerbose, logDetection, info, debug, warn, error };
