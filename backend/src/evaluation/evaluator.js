
const fs = require('fs');
const path = require('path');
const { redact } = require('../redactor');
const { calculateMetrics, calculateOverallMetrics } = require('./metrics');
const { generateReport } = require('./reportGenerator');
const config = require('../../config/default');
const log = require('../utils/logging');

async function evaluate(options = {}) {
  const inputPath = options.inputPath || path.resolve(__dirname, '../../input/Red Herring Prospectus(1).docx');
  const groundTruthPath = options.groundTruthPath || path.resolve(__dirname, '../../evaluation/ground_truth.json');
  const reportPath = options.reportPath || path.resolve(__dirname, '../../evaluation/evaluation-report.md');

  log.info('=== PII Detection Evaluation ===');

  if (!fs.existsSync(groundTruthPath)) {
    throw new Error(`Ground truth not found: ${groundTruthPath}`);
  }
  const groundTruth = JSON.parse(fs.readFileSync(groundTruthPath, 'utf8'));
  log.info(`Loaded ground truth from: ${groundTruthPath}`);

  const result = await redact({
    input: inputPath,
    dryRun: true,
    threshold: 0.70,
    verbose: false,
  });

  const predictionsByType = {};
  for (const detection of result.detections) {
    if (!predictionsByType[detection.type]) {
      predictionsByType[detection.type] = [];
    }
    predictionsByType[detection.type].push(detection.value);
  }

  for (const type of Object.keys(predictionsByType)) {
    predictionsByType[type] = [...new Set(predictionsByType[type].map(v => v.trim()))];
  }

  const perTypeMetrics = {};
  const allTypes = new Set([...Object.keys(groundTruth), ...Object.keys(predictionsByType)]);

  const falsePositiveExamples = [];
  const falseNegativeExamples = [];

  for (const type of allTypes) {
    const gt = groundTruth[type] || [];
    const preds = predictionsByType[type] || [];

    const metrics = calculateMetrics(gt, preds);
    perTypeMetrics[type] = metrics;

    log.info(`${type}: TP=${metrics.tp}, FP=${metrics.fp}, FN=${metrics.fn}, ` +
             `P=${(metrics.precision * 100).toFixed(1)}%, R=${(metrics.recall * 100).toFixed(1)}%, ` +
             `F1=${(metrics.f1 * 100).toFixed(1)}%`);

    if (metrics.fp > 0) {
      const gtSet = new Set(gt.map(v => v.toLowerCase().trim()));
      const fpExamples = preds
        .filter(p => !gtSet.has(p.toLowerCase().trim()))
        .slice(0, 3);
      fpExamples.forEach(ex => {
        falsePositiveExamples.push(`**${type}**: "${ex}" was detected but is not in the ground truth.`);
      });
    }
    if (metrics.fn > 0) {
      const predSet = new Set(preds.map(v => v.toLowerCase().trim()));
      const fnExamples = gt
        .filter(g => !predSet.has(g.toLowerCase().trim()))
        .slice(0, 3);
      fnExamples.forEach(ex => {
        falseNegativeExamples.push(`**${type}**: "${ex}" was in the ground truth but not detected.`);
      });
    }
  }

  const overallMetrics = calculateOverallMetrics(perTypeMetrics);

  log.info('');
  log.info(`Overall: P=${(overallMetrics.precision * 100).toFixed(1)}%, ` +
           `R=${(overallMetrics.recall * 100).toFixed(1)}%, ` +
           `F1=${(overallMetrics.f1 * 100).toFixed(1)}%, ` +
           `Acc=${(overallMetrics.accuracy * 100).toFixed(1)}%`);

  // Generate report
  generateReport({
    perTypeMetrics,
    overallMetrics,
    groundTruth,
    falsePositiveExamples,
    falseNegativeExamples,
    outputPath: reportPath,
  });

  log.info(`Evaluation report written to: ${reportPath}`);

  return { perTypeMetrics, overallMetrics, falsePositiveExamples, falseNegativeExamples };
}

// Allow standalone execution
if (require.main === module) {
  evaluate()
    .then(results => {
      console.log('\n=== Evaluation Complete ===');
      console.log('See: evaluation/evaluation-report.md');
    })
    .catch(err => {
      console.error('Evaluation failed:', err.message);
      console.error(err.stack);
      process.exit(1);
    });
}

module.exports = { evaluate };
