
const mammoth = require('mammoth');
const fs = require('fs');
const JSZip = require('jszip');
const log = require('../utils/logging');

async function extractText(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Input file not found: ${filePath}`);
  }

  log.info(`Extracting text from: ${filePath}`);
  const result = await mammoth.extractRawText({ path: filePath });

  if (result.messages && result.messages.length > 0) {
    result.messages.forEach(msg => {
      if (msg.type === 'warning') {
        log.debug(`mammoth warning: ${msg.message}`);
      }
    });
  }

  log.info(`Extracted ${result.value.length} characters`);
  return result.value;
}

async function readDocxAsZip(filePath) {
  const buffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);
  return zip;
}

async function getTextXMLFiles(zip) {
  const xmlFiles = [];
  const targetPaths = [];

  if (zip.file('word/document.xml')) {
    targetPaths.push('word/document.xml');
  }

  zip.forEach((path) => {
    if (/^word\/(header|footer)\d+\.xml$/.test(path)) {
      targetPaths.push(path);
    }
  });

  for (const path of targetPaths) {
    const file = zip.file(path);
    if (file) {
      const content = await file.async('string');
      xmlFiles.push({ name: path, content });
    }
  }

  return xmlFiles;
}

module.exports = { extractText, readDocxAsZip, getTextXMLFiles };
