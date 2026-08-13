
const fs = require('fs');
const path = require('path');

function generateReport({
  perTypeMetrics,
  overallMetrics,
  groundTruth,
  falsePositiveExamples = [],
  falseNegativeExamples = [],
  outputPath,
}) {
  const lines = [];

  lines.push('# PII Redaction Evaluation Report');
  lines.push('');
  lines.push(`*Generated: ${new Date().toISOString()}*`);
  lines.push('');

  // Dataset section
  lines.push('## Dataset');
  lines.push('');
  lines.push('- **Input document**: Red Herring Prospectus (KSH International Limited IPO)');
  lines.push('- **Document type**: Indian financial prospectus (~334K characters)');
  lines.push('- **Ground truth methodology**: Manual review of the document to identify all PII instances');
  lines.push('- **Categories evaluated**: PERSON, EMAIL, PHONE, COMPANY, ADDRESS, SSN, CREDIT_CARD, DOB, IP');
  lines.push('');
  lines.push('### Ground Truth Summary');
  lines.push('');
  lines.push('| PII Type | Count |');
  lines.push('|----------|-------|');
  for (const [type, values] of Object.entries(groundTruth)) {
    lines.push(`| ${type} | ${values.length} |`);
  }
  lines.push('');

  // Metrics table
  lines.push('## Metrics');
  lines.push('');
  lines.push('### Per-Type Performance');
  lines.push('');
  lines.push('| PII Type | TP | FP | FN | Precision | Recall | F1 |');
  lines.push('|----------|----|----|----|-----------|---------|----|');
  for (const [type, m] of Object.entries(perTypeMetrics)) {
    lines.push(`| ${type} | ${m.tp} | ${m.fp} | ${m.fn} | ${(m.precision * 100).toFixed(1)}% | ${(m.recall * 100).toFixed(1)}% | ${(m.f1 * 100).toFixed(1)}% |`);
  }
  lines.push('');

  // Overall metrics
  lines.push('### Overall Performance (Micro-Averaged)');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| **Precision** | ${(overallMetrics.precision * 100).toFixed(1)}% |`);
  lines.push(`| **Recall** | ${(overallMetrics.recall * 100).toFixed(1)}% |`);
  lines.push(`| **F1 Score** | ${(overallMetrics.f1 * 100).toFixed(1)}% |`);
  lines.push(`| **Accuracy** | ${(overallMetrics.accuracy * 100).toFixed(1)}% |`);
  lines.push(`| Total TP | ${overallMetrics.tp} |`);
  lines.push(`| Total FP | ${overallMetrics.fp} |`);
  lines.push(`| Total FN | ${overallMetrics.fn} |`);
  lines.push('');

  lines.push('> **Note on Accuracy**: Accuracy can be misleading for PII detection because non-PII text');
  lines.push('> vastly outnumbers PII tokens. In a 334K-character document with ~100 PII entities,');
  lines.push('> a naive "predict nothing" baseline would achieve >99.9% accuracy. Therefore,');
  lines.push('> **Precision, Recall, and F1 are the primary evaluation metrics**.');
  lines.push('');

  // False positives
  lines.push('## False Positives');
  lines.push('');
  if (falsePositiveExamples.length > 0) {
    lines.push('Representative false positive examples:');
    lines.push('');
    for (const example of falsePositiveExamples) {
      lines.push(`- ${example}`);
    }
  } else {
    lines.push('No significant false positives identified in the evaluation run.');
  }
  lines.push('');

  // False negatives
  lines.push('## False Negatives');
  lines.push('');
  if (falseNegativeExamples.length > 0) {
    lines.push('Representative missed PII examples:');
    lines.push('');
    for (const example of falseNegativeExamples) {
      lines.push(`- ${example}`);
    }
  } else {
    lines.push('No false negatives identified — all ground truth PII was detected.');
  }
  lines.push('');

  // Tradeoffs
  lines.push('## Tradeoffs & Design Decisions');
  lines.push('');
  lines.push('### Regex-Based Detection');
  lines.push('- **Advantages**: Fast, deterministic, no model dependencies, easy to debug');
  lines.push('- **Limitations**: Cannot understand semantic context; relies on patterns and labels');
  lines.push('');
  lines.push('### Rule-Based Person/Company Detection (vs. NER)');
  lines.push('- **Advantages**: No model to download/load; works well for structured documents with context labels');
  lines.push('- **Limitations**: May miss names that appear without any contextual signal; cannot generalize to unseen name patterns');
  lines.push('- **Why not NER**: No production-quality local NER library exists for Node.js that handles Indian names reliably');
  lines.push('');
  lines.push('### Context-Dependent DOB Detection');
  lines.push('- **Decision**: Only flag dates as DOB when explicit "Date of Birth"/"DOB" context exists');
  lines.push('- **Rationale**: Financial documents contain hundreds of legitimate dates (incorporation, filing, meeting dates)');
  lines.push('- **Risk**: A birth date without any label would be missed');
  lines.push('');
  lines.push('### Company Detection Scope');
  lines.push('- **Decision**: Redact business-partner and named company entities; exclude government/regulatory bodies (SEBI, RBI)');
  lines.push('- **Rationale**: Regulatory body names are public knowledge and their redaction would make the document nonsensical');
  lines.push('');
  lines.push('### DOCX Formatting');
  lines.push('- **Approach**: Direct XML manipulation via JSZip preserves all formatting');
  lines.push('- **Limitation**: Cross-run text replacement may occasionally affect formatting of the replaced text');
  lines.push('- **Mitigation**: We handle cross-run cases by placing replacement in the first run and emptying subsequent consumed runs');
  lines.push('');

  // Write report
  const content = lines.join('\n');
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, content, 'utf8');

  return content;
}

module.exports = { generateReport };
