
const config = require('../../config/default');

class BaseDetector {
    constructor(type, name) {
    this.type = type;
    this.name = name;
  }

    detect(text) {
    throw new Error(`detect() must be implemented by ${this.name}`);
  }

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

    extractContext(text, start, end) {
    const window = config.contextWindow || 60;
    const ctxStart = Math.max(0, start - window);
    const ctxEnd = Math.min(text.length, end + window);
    let ctx = text.substring(ctxStart, ctxEnd).replace(/\n+/g, ' ').trim();
    if (ctxStart > 0) ctx = '...' + ctx;
    if (ctxEnd < text.length) ctx = ctx + '...';
    return ctx;
  }

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
