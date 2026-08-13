
const fs = require('fs');
const path = require('path');
const log = require('../utils/logging');

function applyReplacements(xmlContent, replacements) {
  if (!replacements || replacements.length === 0) return xmlContent;

  let modified = xmlContent;

  const sorted = [...replacements].sort((a, b) => b.original.length - a.original.length);

  for (const { original, replacement } of sorted) {
    if (!original || original.length === 0) continue;

    modified = replaceInTextNodes(modified, original, replacement);

    modified = replaceCrossRun(modified, original, replacement);
  }

  return modified;
}

function replaceInTextNodes(xml, searchText, replaceText) {
  
  const textNodeRegex = /(<w:t(?:\s[^>]*)?>)([\s\S]*?)(<\/w:t>)/g;

  return xml.replace(textNodeRegex, (fullMatch, openTag, textContent, closeTag) => {
    if (textContent.includes(searchText)) {
      const newText = textContent.split(searchText).join(replaceText);
      return openTag + newText + closeTag;
    }
    return fullMatch;
  });
}

function replaceCrossRun(xml, searchText, replaceText) {
  
  const paragraphRegex = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;

  return xml.replace(paragraphRegex, (paragraph) => {
    
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

      let newParagraph = result;

      for (let i = endRun; i >= startRun; i--) {
        const run = runs[i];
        let newText;

        if (i === startRun) {
          
          const before = run.text.substring(0, startOffset);
          newText = before + replaceText;
        } else if (i === endRun) {
          
          const after = run.text.substring(endOffset);
          newText = after;
        } else {
          
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
      break; 
    }

    return result;
  });
}

async function writeDocx(zip, outputPath) {
  
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
