const { parentPort, workerData } = require('worker_threads');
const { redact } = require('./redactor');

(async () => {
  try {
    const result = await redact(workerData);

    parentPort.postMessage({
      status: 'done',
      result: {
        detections: result.detections,
        byType: result.byType,
        replacements: result.replacements,
        auditReport: result.auditReport,
      }
    });
  } catch (err) {
    parentPort.postMessage({ status: 'error', error: err.message });
  }
})();
