/**
 * Main redactor pipeline.
 *
 * Orchestrates the full PII detection and redaction process:
 *   1. Read DOCX → extract text
 *   2. Run all enabled detectors
 *   3. Resolve conflicts
 *   4. Filter by confidence threshold
 *   5. Generate synthetic replacements
 *   6. Apply replacements to DOCX XML
 *   7. Write output files (redacted DOCX + audit report)
 *
 * @module redactor
 */

const { extractText, readDocxAsZip, getTextXMLFiles } = require('./document/reader');
const { applyReplacements, writeDocx } = require('./document/writer');
const { resolveConflicts } = require('./utils/conflictResolver');
const ReplacementManager = require('./replacement/replacementManager');
const log = require('./utils/logging');
const config = require('../config/default');
const fs = require('fs');
const path = require('path');

// Import all detectors
const EmailDetector = require('./detectors/emailDetector');
const PhoneDetector = require('./detectors/phoneDetector');
const SSNDetector = require('./detectors/ssnDetector');
const CreditCardDetector = require('./detectors/creditCardDetector');
const IPDetector = require('./detectors/ipDetector');
const DOBDetector = require('./detectors/dobDetector');
const PersonDetector = require('./detectors/personDetector');
const CompanyDetector = require('./detectors/companyDetector');
const AddressDetector = require('./detectors/addressDetector');

/**
 * Run the full redaction pipeline.
 * @param {object} options
 * @param {string} options.input - Input DOCX path
 * @param {string} [options.output] - Output DOCX path
 * @param {number} [options.threshold] - Confidence threshold
 * @param {boolean} [options.dryRun] - If true, detect but don't modify
 * @param {string} [options.report] - Audit report output path
 * @param {boolean} [options.verbose] - Enable verbose logging
 * @returns {Promise<object>} Detection results and statistics
 */
async function redact(options) {
  const {
    input,
    output,
    threshold = config.threshold,
    dryRun = false,
    report,
    verbose = false,
  } = options;

  log.setVerbose(verbose);
  log.info('=== PII Redaction Tool ===');
  log.info(`Input: ${input}`);
  log.info(`Threshold: ${threshold}`);
  log.info(`Mode: ${dryRun ? 'DRY RUN' : 'REDACT'}`);

  // Step 1: Extract text
  const text = await extractText(input);

  // Step 2: Run detectors
  log.info('Running PII detectors...');
  const allDetections = runDetectors(text);
  log.info(`Total raw detections: ${allDetections.length}`);

  // Step 3: Resolve conflicts
  const resolved = resolveConflicts(allDetections);
  log.info(`After conflict resolution: ${resolved.length}`);

  // Step 4: Filter by threshold
  const filtered = resolved.filter(d => d.confidence >= threshold);
  const belowThreshold = resolved.filter(d => d.confidence < threshold);
  log.info(`Above threshold (${threshold}): ${filtered.length}`);
  log.info(`Below threshold: ${belowThreshold.length}`);

  // Log detections by type
  const byType = {};
  filtered.forEach(d => {
    byType[d.type] = (byType[d.type] || 0) + 1;
  });
  log.info('Detections by type:');
  Object.entries(byType).sort(([, a], [, b]) => b - a).forEach(([type, count]) => {
    log.info(`  ${type}: ${count}`);
  });

  // Log individual detections in verbose mode
  if (verbose) {
    filtered.forEach(d => log.logDetection(d));
  }

  // Step 5: Generate replacements
  log.info('Generating synthetic replacements...');
  const replacementManager = new ReplacementManager();
  const replacements = [];

  for (const detection of filtered) {
    const replacement = replacementManager.getReplacement(detection.type, detection.value);
    replacements.push({
      original: detection.value,
      replacement,
      type: detection.type,
      confidence: detection.confidence,
    });
  }

  // Deduplicate replacements (same original → same replacement)
  const uniqueReplacements = deduplicateReplacements(replacements);
  log.info(`Unique replacement mappings: ${uniqueReplacements.length}`);

  // Step 6: Apply to DOCX (unless dry run)
  if (!dryRun && output) {
    log.info('Applying replacements to DOCX...');
    await applyToDocx(input, output, uniqueReplacements);
  } else if (dryRun) {
    log.info('DRY RUN — no files modified');
    log.info('\n--- Detection Summary ---');
    uniqueReplacements.forEach(r => {
      if (config.privacySafeLogging) {
        log.info(`  [${r.type}] entity detected → replacement generated`);
      } else {
        log.info(`  [${r.type}] "${r.original}" → "${r.replacement}"`);
      }
    });
  }

  // Step 7: Generate audit report
  const auditReport = generateAuditReport(filtered, belowThreshold, replacementManager);
  if (report && !dryRun) {
    writeAuditReport(report, auditReport);
  }

  log.info('=== Redaction complete ===');

  return {
    detections: filtered,
    belowThreshold,
    replacements: uniqueReplacements,
    auditReport,
    byType,
    text, // For evaluation
  };
}

/**
 * Run all enabled detectors against the text.
 * @param {string} text
 * @returns {Array<object>}
 */
function runDetectors(text) {
  const detectors = [];

  if (config.detectors.email) detectors.push(new EmailDetector());
  if (config.detectors.phone) detectors.push(new PhoneDetector());
  if (config.detectors.ssn) detectors.push(new SSNDetector());
  if (config.detectors.creditCard) detectors.push(new CreditCardDetector());
  if (config.detectors.ip) detectors.push(new IPDetector());
  if (config.detectors.dob) detectors.push(new DOBDetector());
  if (config.detectors.person) detectors.push(new PersonDetector());
  if (config.detectors.company) detectors.push(new CompanyDetector());
  if (config.detectors.address) detectors.push(new AddressDetector());

  const allDetections = [];

  for (const detector of detectors) {
    log.debug(`Running ${detector.name}...`);
    try {
      const detections = detector.detect(text);
      log.debug(`  ${detector.name}: ${detections.length} detections`);
      allDetections.push(...detections);
    } catch (err) {
      log.error(`Detector ${detector.name} failed: ${err.message}`);
    }
  }

  return allDetections;
}

/**
 * Apply replacements to a DOCX file and write the output.
 * @param {string} inputPath
 * @param {string} outputPath
 * @param {Array<{original: string, replacement: string}>} replacements
 */
async function applyToDocx(inputPath, outputPath, replacements) {
  const zip = await readDocxAsZip(inputPath);
  const xmlFiles = await getTextXMLFiles(zip);

  for (const xmlFile of xmlFiles) {
    log.debug(`Processing: ${xmlFile.name}`);
    const modified = applyReplacements(xmlFile.content, replacements);
    zip.file(xmlFile.name, modified);
  }

  await writeDocx(zip, outputPath);
}

/**
 * Deduplicate replacements so each unique original maps to one replacement.
 * @param {Array} replacements
 * @returns {Array}
 */
function deduplicateReplacements(replacements) {
  const seen = new Map();
  const unique = [];

  for (const r of replacements) {
    if (!seen.has(r.original)) {
      seen.set(r.original, r);
      unique.push(r);
    }
  }

  return unique;
}

/**
 * Generate the audit report object.
 * @param {Array} detections
 * @param {Array} belowThreshold
 * @param {ReplacementManager} replacementManager
 * @returns {object}
 */
function generateAuditReport(detections, belowThreshold, replacementManager) {
  const byType = {};
  detections.forEach(d => {
    byType[d.type] = (byType[d.type] || 0) + 1;
  });

  return {
    summary: {
      totalDetections: detections.length,
      belowThresholdCount: belowThreshold.length,
      byType,
      uniqueEntities: replacementManager.getCounts(),
    },
    detections: detections.map(d => ({
      type: d.type,
      confidence: d.confidence,
      detector: d.detector,
      // Privacy: use hashed identifier instead of raw value
      entityHash: require('crypto')
        .createHash('sha256')
        .update(d.value)
        .digest('hex')
        .substring(0, 12),
      position: { start: d.start, end: d.end },
      contextPreview: d.context
        ? d.context.substring(0, 80) + (d.context.length > 80 ? '...' : '')
        : '',
    })),
  };
}

/**
 * Write the audit report to a JSON file.
 * @param {string} reportPath
 * @param {object} auditReport
 */
function writeAuditReport(reportPath, auditReport) {
  const dir = path.dirname(reportPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(reportPath, JSON.stringify(auditReport, null, 2), 'utf8');
  log.info(`Audit report written to: ${reportPath}`);
}

module.exports = { redact, runDetectors };
