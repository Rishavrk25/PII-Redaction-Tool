# PII Redaction Tool — Evaluation Strategy & Metrics

## 1. Evaluation Objective

The goal of this evaluation is to measure how effectively the PII Redaction Tool identifies and redacts Personally Identifiable Information (PII) from DOCX documents — specifically Indian financial prospectuses. The evaluation quantifies detection accuracy using standard information retrieval metrics against a manually curated ground truth dataset.

---

## 2. Ground Truth Construction

### Methodology
A human reviewer manually examined the input document (Red Herring Prospectus of KSH International Limited, ~334,000 characters) and identified every instance of PII across the following categories:

| PII Type     | Ground Truth Count |
|--------------|--------------------|
| PERSON       | 26                 |
| EMAIL        | 26                 |
| PHONE        | 21                 |
| COMPANY      | 19                 |
| ADDRESS      | 12                 |
| SSN          | 0                  |
| CREDIT_CARD  | 0                  |
| DOB          | 0                  |
| IP           | 0                  |
| **Total**    | **104**            |

### Ground Truth Format
The ground truth is stored as a structured JSON file (`evaluation/ground_truth.json`) containing each PII entity's:
- `type` — The PII category (e.g., PERSON, EMAIL)
- `value` — The exact text string
- `approximate_count` — Expected number of occurrences in the document

### Matching Strategy
A detection is considered a **True Positive (TP)** if the detected value contains (or is contained by) a ground truth value of the same type, using case-insensitive substring matching. This accounts for slight boundary differences in how regex captures text versus how a human annotator marks it.

---

## 3. Evaluation Metrics

We use standard information retrieval metrics. Given that non-PII text vastly outnumbers PII tokens (~100 entities in 334K characters), **naive accuracy is meaningless** (a "predict nothing" baseline achieves >99.9% accuracy). Therefore, we focus on:

### Primary Metrics

| Metric        | Formula                                     | Purpose                                              |
|---------------|---------------------------------------------|------------------------------------------------------|
| **Precision** | TP / (TP + FP)                              | Of all items flagged as PII, how many were correct?  |
| **Recall**    | TP / (TP + FN)                              | Of all actual PII, how many did we find?             |
| **F1 Score**  | 2 × (Precision × Recall) / (Precision + Recall) | Harmonic mean balancing precision and recall      |

### Aggregation Method
- **Per-type metrics**: Precision, Recall, and F1 are computed independently for each PII category (PERSON, EMAIL, PHONE, etc.)
- **Overall metrics**: Micro-averaged across all categories (pooling all TP, FP, FN counts before computing)

---

## 4. Results

### Per-Type Performance

| PII Type | TP | FP | FN | Precision | Recall | F1     |
|----------|----|----|-----|-----------|--------|--------|
| PERSON   | 22 | 5  | 4   | 81.5%     | 84.6%  | 83.0%  |
| EMAIL    | 26 | 0  | 0   | 100.0%    | 100.0% | 100.0% |
| PHONE    | 20 | 2  | 1   | 90.9%     | 95.2%  | 93.0%  |
| COMPANY  | 17 | 36 | 4   | 32.1%     | 81.0%  | 46.0%  |
| ADDRESS  | 9  | 20 | 4   | 31.0%     | 69.2%  | 42.9%  |

### Overall (Micro-Averaged)

| Metric        | Value   |
|---------------|---------|
| **Precision** | 59.9%   |
| **Recall**    | 87.8%   |
| **F1 Score**  | 71.2%   |
| Total TP      | 94      |
| Total FP      | 63      |
| Total FN      | 13      |

---

## 5. Analysis of Results

### Strengths
- **Email detection is perfect** (100% Precision and Recall) — regex patterns for email addresses are unambiguous.
- **Phone detection is strong** (93% F1) — the `libphonenumber-js` library combined with custom Indian phone patterns handles diverse formats well.
- **Person detection is solid** (83% F1) — context-label based detection ("Director:", "Name:", etc.) works well in structured financial documents.
- **High overall Recall** (87.8%) — the tool successfully identifies the vast majority of PII, which is critical for a privacy-focused tool where missing PII is worse than over-flagging.

### Weaknesses
- **Company detection has low precision** (32.1%) — many partial company names and organizational fragments are flagged (e.g., "Advisory Private Limited" instead of the full company name).
- **Address detection has low precision** (31.0%) — Indian addresses are highly variable in format, and the regex patterns sometimes capture address-like fragments from non-address text.

### Why Recall > Precision is Preferred
In PII redaction, **a missed PII entity (False Negative) is far more dangerous than a false alarm (False Positive)**:
- A False Negative means sensitive data leaks into the output — a potential compliance violation.
- A False Positive simply means a non-sensitive term gets replaced with synthetic data — an inconvenience, not a risk.

Therefore, the tool is intentionally tuned toward higher recall at the cost of some precision.

---

## 6. Confidence Threshold Tuning

The tool exposes a configurable **confidence threshold** (default: 0.70) that controls the precision/recall tradeoff:

| Threshold | Effect                                                                 |
|-----------|------------------------------------------------------------------------|
| **0.50**  | Maximum recall — catches more PII but increases false positives        |
| **0.70**  | Balanced default — good recall with acceptable precision               |
| **0.90**  | High precision — fewer false positives but may miss ambiguous PII      |

Each detector assigns a confidence score based on pattern strength and contextual signals. Users can adjust this threshold based on their risk tolerance.

---

## 7. Design Tradeoffs

| Decision                          | Rationale                                                                                      |
|-----------------------------------|------------------------------------------------------------------------------------------------|
| Regex-based over NLP/NER          | No production-quality Node.js NER library handles Indian names reliably. Regex is fast, deterministic, and dependency-free. |
| Context-label person detection    | Financial documents use structured labels ("Director:", "Authorized Signatory:") making context-based extraction highly effective. |
| Conservative DOB detection        | Only flags dates with explicit "Date of Birth"/"DOB" labels to avoid false positives from hundreds of legitimate financial dates. |
| Exclude regulatory body names     | Government entities (SEBI, RBI, MCA) are public knowledge; redacting them would make the document nonsensical. |
| Synthetic replacements over [REDACTED] | Using realistic fake data (via Faker.js) preserves document readability and structural integrity. |

---

## 8. Future Improvements

1. **NER Integration**: Integrating a pre-trained Named Entity Recognition model (e.g., via ONNX Runtime) would significantly improve Person and Company detection precision without relying solely on context labels.
2. **Address Parser**: A dedicated Indian address parsing library could reduce address false positives by validating structural components (PIN code, state, city).
3. **Feedback Loop**: Implementing a mechanism where users can flag false positives/negatives to iteratively improve detector patterns.
4. **Multi-document Evaluation**: Expanding the ground truth dataset across multiple document types (contracts, HR records, medical forms) to validate generalization.
