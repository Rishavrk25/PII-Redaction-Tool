/**
 * Base class for all PII detectors.
 * Provides a common interface and shared helper methods.
 *
 * Every detector must implement `detect(text)` and return an array of
 * detection objects with { type, value, start, end, confidence, detector, context }.
 *
 * @module detectors/baseDetector
 */

const config = require('../../config/default');

class BaseDetector {
  /**
   * @param {string} type - PII type (e.g., 'EMAIL', 'PHONE')
   * @param {string} name - Human-readable detector name
   */
  constructor(type, name) {
    this.type = type;
    this.name = name;
  }

  /**
   * Detect PII entities in the given text.
   * Must be overridden by subclasses.
   *
   * @param {string} text - Full document text
   * @returns {Array<object>} Array of detection objects
   */
  detect(text) {
    throw new Error(`detect() must be implemented by ${this.name}`);
  }

  /**
   * Build a detection result object.
   * @param {string} value - The matched PII text
   * @param {number} start - Start index in the source text
   * @param {number} end - End index in the source text
   * @param {number} confidence - Confidence score 0–1
   * @param {string} text - Full source text (for context extraction)
   * @returns {object} Detection result
   */
  buildDetection(value, start, end, confidence, text) {
    return {
      type: this.type,
      value,
      start,
      end,
      confidence: Math.min(1, Math.max(0, confidence)),
      detector: this.name,
      context: this.extractContext(text, start, end),
    };
  }

  /**
   * Extract surrounding context for a detection.
   * @param {string} text - Full source text
   * @param {number} start
   * @param {number} end
   * @returns {string} Context snippet
   */
  extractContext(text, start, end) {
    const window = config.contextWindow || 60;
    const ctxStart = Math.max(0, start - window);
    const ctxEnd = Math.min(text.length, end + window);
    let ctx = text.substring(ctxStart, ctxEnd).replace(/\n+/g, ' ').trim();
    if (ctxStart > 0) ctx = '...' + ctx;
    if (ctxEnd < text.length) ctx = ctx + '...';
    return ctx;
  }

  /**
   * Check if a context label exists near a position.
   * @param {string} text - Full source text
   * @param {number} position - Position to check around
   * @param {Array<string|RegExp>} labels - Labels to search for
   * @param {number} [windowBefore=120] - How many chars before to search
   * @returns {boolean}
   */
  hasContextLabel(text, position, labels, windowBefore = 120) {
    const start = Math.max(0, position - windowBefore);
    const contextText = text.substring(start, position).toLowerCase();

    return labels.some(label => {
      if (label instanceof RegExp) {
        return label.test(contextText);
      }
      return contextText.includes(label.toLowerCase());
    });
  }
}

module.exports = BaseDetector;
