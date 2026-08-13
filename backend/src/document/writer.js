/**
 * Document writer.
 *
 * Applies PII replacements directly in the DOCX XML, preserving all formatting.
 * Handles cross-run text replacement (where a PII value is split across
 * multiple <w:r> runs due to formatting).
 *
 * Strategy:
 *   1. Parse each XML file's text nodes
 *   2. Build a concatenated text view of each paragraph
 *   3. For each replacement, find the matching text span and replace it
 *   4. Handle cross-run spans by placing the full replacement in the first run
 *      and emptying the subsequent consumed runs
 *   5. Write the modified ZIP back as a DOCX
 *
 * @module document/writer
 */

const fs = require('fs');
const path = require('path');
const log = require('../utils/logging');

/**
 * Apply text replacements to a DOCX XML string.
 *
 * This is the core replacement engine. It works at the raw XML level,
 * finding <w:t> text nodes and performing string replacement.
 *
 * For simplicity and reliability, we use a text-level find-and-replace
 * approach on the concatenated text of each paragraph, then redistribute
 * the text back across the original runs.
 *
 * @param {string} xmlContent - Raw XML string
 * @param {Array<{original: string, replacement: string}>} replacements
 * @returns {string} Modified XML string
 */
function applyReplacements(xmlContent, replacements) {
  if (!replacements || replacements.length === 0) return xmlContent;

  let modified = xmlContent;

  // Sort replacements by original length descending (replace longer strings first
  // to avoid partial replacements)
  const sorted = [...replacements].sort((a, b) => b.original.length - a.original.length);

  for (const { original, replacement } of sorted) {
    if (!original || original.length === 0) continue;

    // Strategy 1: Direct replacement in <w:t> text nodes
    // This handles the common case where the PII is within a single run
    modified = replaceInTextNodes(modified, original, replacement);

    // Strategy 2: Handle cross-run text
    // Find PII that might be split across runs within a paragraph
    modified = replaceCrossRun(modified, original, replacement);
  }

  return modified;
}

/**
 * Replace text within individual <w:t> nodes.
 * @param {string} xml
 * @param {string} searchText
 * @param {string} replaceText
 * @returns {string}
 */
function replaceInTextNodes(xml, searchText, replaceText) {
  // Match <w:t> and <w:t xml:space="preserve"> content
  const textNodeRegex = /(<w:t(?:\s[^>]*)?>)([\s\S]*?)(<\/w:t>)/g;

  return xml.replace(textNodeRegex, (fullMatch, openTag, textContent, closeTag) => {
    if (textContent.includes(searchText)) {
      const newText = textContent.split(searchText).join(replaceText);
      return openTag + newText + closeTag;
    }
    return fullMatch;
  });
}

/**
 * Handle PII split across multiple runs within a paragraph.
 *
 * DOCX often splits text across runs for formatting reasons.
 * Example: "john" in one run, "@example" in another, ".com" in a third.
 *
 * We detect this by:
 *   1. Finding each <w:p> paragraph
 *   2. Concatenating all <w:t> text within it
 *   3. If the concatenated text contains the PII, we find which runs
 *      are involved and redistribute the replacement text
 *
 * @param {string} xml
 * @param {string} searchText
 * @param {string} replaceText
 * @returns {string}
 */
function replaceCrossRun(xml, searchText, replaceText) {
  // Process each paragraph
  const paragraphRegex = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;

  return xml.replace(paragraphRegex, (paragraph) => {
    // Extract all text from runs in this paragraph
    const runTextRegex = /(<w:t(?:\s[^>]*)?>)([\s\S]*?)(<\/w:t>)/g;
    const runs = [];
    let runMatch;

    while ((runMatch = runTextRegex.exec(paragraph)) !== null) {
      runs.push({
        fullMatch: runMatch[0],
        openTag: runMatch[1],
        text: runMatch[2],
        closeTag: runMatch[3],
        index: runMatch.index,
      });
    }

    if (runs.length === 0) return paragraph;

    // Concatenate all run texts
    const concatenated = runs.map(r => r.text).join('');

    // Check if the PII exists in the concatenated text
    if (!concatenated.includes(searchText)) return paragraph;

    // Find the position in the concatenated text
    let searchIdx = 0;
    let result = paragraph;

    while (true) {
      const pos = concatenated.indexOf(searchText, searchIdx);
      if (pos === -1) break;

      // Map position back to runs
      let charCount = 0;
      let startRun = -1;
      let endRun = -1;
      let startOffset = 0;
      let endOffset = 0;

      for (let i = 0; i < runs.length; i++) {
        const runStart = charCount;
        const runEnd = charCount + runs[i].text.length;

        if (pos >= runStart && pos < runEnd) {
          startRun = i;
          startOffset = pos - runStart;
        }
        if (pos + searchText.length > runStart && pos + searchText.length <= runEnd) {
          endRun = i;
          endOffset = pos + searchText.length - runStart;
        }

        charCount += runs[i].text.length;
      }

      if (startRun === -1 || endRun === -1) break;

      // If it's within a single run, it should have been caught by replaceInTextNodes
      if (startRun === endRun) {
        searchIdx = pos + searchText.length;
        continue;
      }

      // Cross-run replacement:
      // Put the replacement text in the first run, empty the rest
      let newParagraph = result;

      // Modify runs from end to start to preserve indices
      for (let i = endRun; i >= startRun; i--) {
        const run = runs[i];
        let newText;

        if (i === startRun) {
          // First run: keep text before the match + replacement + (nothing after)
          const before = run.text.substring(0, startOffset);
          newText = before + replaceText;
        } else if (i === endRun) {
          // Last run: keep text after the match
          const after = run.text.substring(endOffset);
          newText = after;
        } else {
          // Middle runs: empty them
          newText = '';
        }

        const oldFull = run.openTag + run.text + run.closeTag;
        // Ensure xml:space="preserve" for the replacement tag
        const newOpenTag = run.openTag.includes('xml:space')
          ? run.openTag
          : run.openTag.replace('<w:t>', '<w:t xml:space="preserve">');
        const newFull = newOpenTag + newText + run.closeTag;
        newParagraph = newParagraph.replace(oldFull, newFull);
      }

      result = newParagraph;
      break; // Process one occurrence per paragraph pass
    }

    return result;
  });
}

/**
 * Write a modified JSZip archive to a DOCX file.
 * @param {import('jszip')} zip - Modified JSZip instance
 * @param {string} outputPath - Output file path
 */
async function writeDocx(zip, outputPath) {
  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  fs.writeFileSync(outputPath, buffer);
  log.info(`Redacted document written to: ${outputPath}`);
}

module.exports = { applyReplacements, writeDocx, replaceInTextNodes, replaceCrossRun };
