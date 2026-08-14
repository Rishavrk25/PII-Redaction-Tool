require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { redact } = require('./redactor');

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

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
  credentials: false
}));
app.use(express.json());

app.use('/download', express.static(outputDir));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'PII Redaction API is running' });
});

app.post('/api/redact', upload.single('document'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No document uploaded' });
  }

  const threshold = req.body.threshold ? parseFloat(req.body.threshold) : undefined;
  
  try {
    const inputPath = req.file.path;
    const outputFileName = `redacted-${path.parse(req.file.originalname).name}-${Date.now()}.docx`;
    const outputPath = path.join(outputDir, outputFileName);
    const reportFileName = `report-${Date.now()}.json`;
    const reportPath = path.join(outputDir, reportFileName);

    const result = await redact({
      input: inputPath,
      output: outputPath,
      threshold,
      report: reportPath,
      verbose: false,
    });

    fs.unlink(inputPath, (err) => {
      if (err) console.error(`Failed to delete upload: ${err.message}`);
    });

    res.json({
      message: 'Redaction successful',
      auditReport: result.auditReport,
      summary: {
        totalDetections: result.detections.length,
        byType: result.byType,
        uniqueReplacements: result.replacements.length
      },
      downloadUrl: `/download/${outputFileName}`,
      reportUrl: `/download/${reportFileName}`
    });

  } catch (error) {
    console.error('Redaction error:', error);
    res.status(500).json({ error: 'Redaction failed', details: error.message });
  }
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
