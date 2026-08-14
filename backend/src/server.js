require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Worker } = require('worker_threads');

const app = express();
const PORT = process.env.PORT || 3000;

const uploadDir = path.join(__dirname, '../uploads');
const outputDir = path.join(__dirname, '../output');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `upload-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        path.extname(file.originalname).toLowerCase() === '.docx') {
      cb(null, true);
    } else {
      cb(new Error('Only .docx files are supported'));
    }
  }
});

app.use(cors());
app.use(express.json());

app.use('/download', express.static(outputDir));

const jobs = new Map();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'PII Redaction API is running' });
});

app.post('/api/redact', upload.single('document'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No document uploaded' });
  }

  const threshold = req.body.threshold ? parseFloat(req.body.threshold) : undefined;
  const jobId = Date.now().toString(36) + Math.random().toString(36).substring(2, 8);

  const inputPath = req.file.path;
  const outputFileName = `redacted-${path.parse(req.file.originalname).name}-${Date.now()}.docx`;
  const outputPath = path.join(outputDir, outputFileName);
  const reportFileName = `report-${Date.now()}.json`;
  const reportPath = path.join(outputDir, reportFileName);

  jobs.set(jobId, { status: 'processing', startedAt: Date.now() });

  res.json({ jobId });

  const worker = new Worker(path.join(__dirname, 'worker.js'), {
    workerData: {
      input: inputPath,
      output: outputPath,
      threshold,
      report: reportPath,
      verbose: false,
    }
  });

  worker.on('message', (msg) => {
    fs.unlink(inputPath, () => {});

    if (msg.status === 'done') {
      jobs.set(jobId, {
        status: 'done',
        result: {
          message: 'Redaction successful',
          auditReport: msg.result.auditReport,
          summary: {
            totalDetections: msg.result.detections,
            byType: msg.result.byType,
            uniqueReplacements: msg.result.replacements
          },
          downloadUrl: `/download/${outputFileName}`,
          reportUrl: `/download/${reportFileName}`
        }
      });
    } else {
      jobs.set(jobId, { status: 'error', error: msg.error });
    }
  });

  worker.on('error', (err) => {
    fs.unlink(inputPath, () => {});
    console.error('Worker error:', err);
    jobs.set(jobId, { status: 'error', error: err.message });
  });
});

app.get('/api/status/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(job);
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  } else if (err) {
    return res.status(500).json({ error: err.message });
  }
  next();
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
