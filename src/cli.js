#!/usr/bin/env node

/**
 * CLI entry point for the PII Redaction Tool.
 *
 * Usage:
 *   node src/cli.js --input input/prospectus.docx --output output/redacted.docx
 *   node src/cli.js --input input/prospectus.docx --dry-run
 *   node src/cli.js --input input/prospectus.docx --output output/redacted.docx --threshold 0.90 --report reports/pii-audit.json --verbose
 *
 * @module cli
 */

const { Command } = require('commander');
const path = require('path');
const { redact } = require('./redactor');
const log = require('./utils/logging');

const program = new Command();

program
  .name('pii-redact')
  .description('Detect and redact PII from DOCX documents, replacing with realistic synthetic data.')
  .version('1.0.0')
  .requiredOption('-i, --input <path>', 'Input DOCX file path')
  .option('-o, --output <path>', 'Output redacted DOCX file path')
  .option('-t, --threshold <number>', 'Confidence threshold (0-1)', parseFloat, 0.70)
  .option('-d, --dry-run', 'Detect PII without modifying the document', false)
  .option('-r, --report <path>', 'Audit report output path (JSON)')
  .option('-v, --verbose', 'Enable verbose logging', false);

program.parse(process.argv);

const opts = program.opts();

// Validate
if (!opts.input) {
  log.error('--input is required');
  process.exit(1);
}

if (!opts.dryRun && !opts.output) {
  // Default output path
  const inputBase = path.basename(opts.input, path.extname(opts.input));
  opts.output = path.join('output', `${inputBase.replace(/\s+/g, '_')}_Redacted.docx`);
}

// Resolve paths
opts.input = path.resolve(opts.input);
if (opts.output) opts.output = path.resolve(opts.output);
if (opts.report) opts.report = path.resolve(opts.report);

// Check that output doesn't overwrite input
if (opts.output && path.resolve(opts.input) === path.resolve(opts.output)) {
  log.error('Output path must be different from input path. The original document must never be overwritten.');
  process.exit(1);
}

// Run
(async () => {
  try {
    const result = await redact({
      input: opts.input,
      output: opts.output,
      threshold: opts.threshold,
      dryRun: opts.dryRun,
      report: opts.report,
      verbose: opts.verbose,
    });

    // Print summary
    console.log('\n╔══════════════════════════════════╗');
    console.log('║     PII Redaction Summary        ║');
    console.log('╠══════════════════════════════════╣');
    console.log(`║ Total detections: ${String(result.detections.length).padStart(13)} ║`);

    const types = Object.entries(result.byType).sort(([, a], [, b]) => b - a);
    for (const [type, count] of types) {
      const paddedType = type.padEnd(20);
      const paddedCount = String(count).padStart(5);
      console.log(`║   ${paddedType} ${paddedCount}     ║`);
    }

    console.log(`║ Below threshold: ${String(result.belowThreshold.length).padStart(14)} ║`);
    console.log(`║ Unique replacements: ${String(result.replacements.length).padStart(11)} ║`);
    console.log('╚══════════════════════════════════╝');

    if (opts.output && !opts.dryRun) {
      console.log(`\nRedacted document: ${opts.output}`);
    }
    if (opts.report && !opts.dryRun) {
      console.log(`Audit report: ${opts.report}`);
    }

  } catch (err) {
    log.error(err.message);
    if (opts.verbose) console.error(err.stack);
    process.exit(1);
  }
})();
