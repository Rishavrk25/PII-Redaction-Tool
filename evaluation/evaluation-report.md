# PII Redaction Evaluation Report

*Generated: 2026-08-13T13:31:07.711Z*

## Dataset

- **Input document**: Red Herring Prospectus (KSH International Limited IPO)
- **Document type**: Indian financial prospectus (~334K characters)
- **Ground truth methodology**: Manual review of the document to identify all PII instances
- **Categories evaluated**: PERSON, EMAIL, PHONE, COMPANY, ADDRESS, SSN, CREDIT_CARD, DOB, IP

### Ground Truth Summary

| PII Type | Count |
|----------|-------|
| PERSON | 26 |
| EMAIL | 26 |
| PHONE | 21 |
| COMPANY | 19 |
| ADDRESS | 12 |
| SSN | 0 |
| CREDIT_CARD | 0 |
| DOB | 0 |
| IP | 0 |

## Metrics

### Per-Type Performance

| PII Type | TP | FP | FN | Precision | Recall | F1 |
|----------|----|----|----|-----------|---------|----|
| PERSON | 22 | 5 | 4 | 81.5% | 84.6% | 83.0% |
| EMAIL | 26 | 0 | 0 | 100.0% | 100.0% | 100.0% |
| PHONE | 20 | 2 | 1 | 90.9% | 95.2% | 93.0% |
| COMPANY | 17 | 36 | 4 | 32.1% | 81.0% | 46.0% |
| ADDRESS | 9 | 20 | 4 | 31.0% | 69.2% | 42.9% |
| SSN | 0 | 0 | 0 | 0.0% | 0.0% | 0.0% |
| CREDIT_CARD | 0 | 0 | 0 | 0.0% | 0.0% | 0.0% |
| DOB | 0 | 0 | 0 | 0.0% | 0.0% | 0.0% |
| IP | 0 | 0 | 0 | 0.0% | 0.0% | 0.0% |

### Overall Performance (Micro-Averaged)

| Metric | Value |
|--------|-------|
| **Precision** | 59.9% |
| **Recall** | 87.8% |
| **F1 Score** | 71.2% |
| **Accuracy** | 55.3% |
| Total TP | 94 |
| Total FP | 63 |
| Total FN | 13 |

> **Note on Accuracy**: Accuracy can be misleading for PII detection because non-PII text
> vastly outnumbers PII tokens. In a 334K-character document with ~100 PII entities,
> a naive "predict nothing" baseline would achieve >99.9% accuracy. Therefore,
> **Precision, Recall, and F1 are the primary evaluation metrics**.

## False Positives

Representative false positive examples:

- **PERSON**: "PARK VI PRIVATE LIMITED" was detected but is not in the ground truth.
- **PERSON**: "Offer Closing Date" was detected but is not in the ground truth.
- **PERSON**: "Park VI Private Limited" was detected but is not in the ground truth.
- **PHONE**: "+ 91 22 4009 4400" was detected but is not in the ground truth.
- **PHONE**: "91 (20) 6729 5100" was detected but is not in the ground truth.
- **PHONE**: "+ 91 8879770456" was detected but is not in the ground truth.
- **COMPANY**: "Pandit LLP" was detected but is not in the ground truth.
- **COMPANY**: "Formerly Link Intime India Private Limited" was detected but is not in the ground truth.
- **COMPANY**: "Advisory Private Limited" was detected but is not in the ground truth.
- **ADDRESS**: "Village Birdewadi Chakan Taluka - Khed Pune – 410 501" was detected but is not in the ground truth.
- **ADDRESS**: "Village Birdewadi, Chakan Taluka - Khed, Pune – 410 501" was detected but is not in the ground truth.
- **ADDRESS**: "201, Tower 2, Montreal Business Centre, Off Pallod Farms, Baner, Pune – 411 045," was detected but is not in the ground truth.

## False Negatives

Representative missed PII examples:

- **PERSON**: "Shanti Gopalkrishnan" was in the ground truth but not detected.
- **PERSON**: "Hitesh Ramani" was in the ground truth but not detected.
- **PERSON**: "Chitra Raste" was in the ground truth but not detected.
- **PHONE**: "+91 8879770456" was in the ground truth but not detected.
- **PHONE**: "+ 91 (20) 6729 5100" was in the ground truth but not detected.
- **COMPANY**: "Link Intime India Private Limited" was in the ground truth but not detected.
- **COMPANY**: "Waterloo Industrial Park VI Private Limited" was in the ground truth but not detected.
- **COMPANY**: "Kirtane & Pandit LLP" was in the ground truth but not detected.
- **ADDRESS**: "11/3, 11/4 and 11/5, Village Birdewadi, Chakan Taluka - Khed, Pune – 410 501, Maharashtra, India" was in the ground truth but not detected.
- **ADDRESS**: "201, Tower 2, Montreal Business Centre, Off Pallod Farms, Baner, Pune – 411 045, Maharashtra, India" was in the ground truth but not detected.
- **ADDRESS**: "5th Floor, Wing A, Gopal House, S. No. 127/1B/1, Plot A1 Opp Harshal Hall Kothrud, Pune – 411 038, Maharashtra, India" was in the ground truth but not detected.

## Tradeoffs & Design Decisions

### Regex-Based Detection
- **Advantages**: Fast, deterministic, no model dependencies, easy to debug
- **Limitations**: Cannot understand semantic context; relies on patterns and labels

### Rule-Based Person/Company Detection (vs. NER)
- **Advantages**: No model to download/load; works well for structured documents with context labels
- **Limitations**: May miss names that appear without any contextual signal; cannot generalize to unseen name patterns
- **Why not NER**: No production-quality local NER library exists for Node.js that handles Indian names reliably

### Context-Dependent DOB Detection
- **Decision**: Only flag dates as DOB when explicit "Date of Birth"/"DOB" context exists
- **Rationale**: Financial documents contain hundreds of legitimate dates (incorporation, filing, meeting dates)
- **Risk**: A birth date without any label would be missed

### Company Detection Scope
- **Decision**: Redact business-partner and named company entities; exclude government/regulatory bodies (SEBI, RBI)
- **Rationale**: Regulatory body names are public knowledge and their redaction would make the document nonsensical

### DOCX Formatting
- **Approach**: Direct XML manipulation via JSZip preserves all formatting
- **Limitation**: Cross-run text replacement may occasionally affect formatting of the replaced text
- **Mitigation**: We handle cross-run cases by placing replacement in the first run and emptying subsequent consumed runs
