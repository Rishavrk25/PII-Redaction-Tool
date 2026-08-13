/**
 * Document reader.
 *
 * Uses mammoth for text extraction (for PII detection pipeline)
 * and JSZip for raw XML access (for modification/replacement).
 *
 * @module document/reader
 */

const mammoth = require('mammoth');
const fs = require('fs');
const JSZip = require('jszip');
const log = require('../utils/logging');

/**
 * Extract plain text from a DOCX file for PII detection.
 * @param {string} filePath - Path to the DOCX file
 * @returns {Promise<string>} Full plain text
 */
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

/**
 * Read a DOCX file as a JSZip instance for XML-level manipulation.
 * @param {string} filePath - Path to the DOCX file
 * @returns {Promise<JSZip>} The parsed ZIP archive
 */
async function readDocxAsZip(filePath) {
  const buffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);
  return zip;
}

/**
 * Get all XML files in a DOCX that contain text content.
 * Includes document.xml, headers, footers.
 * @param {JSZip} zip
 * @returns {Promise<Array<{name: string, content: string}>>}
 */
async function getTextXMLFiles(zip) {
  const xmlFiles = [];
  const targetPaths = [];

  // Main document
  if (zip.file('word/document.xml')) {
    targetPaths.push('word/document.xml');
  }

  // Headers and footers
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
