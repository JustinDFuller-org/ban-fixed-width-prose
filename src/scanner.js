const FRONT_MATTER_MARKERS = new Set(["---", "..."]);
const FENCE_PATTERN = /^\s{0,3}(`{3,}|~{3,})/;
const HEADING_PATTERN = /^\s{0,3}#{1,6}(?:\s|$)/;
const SETEXT_PATTERN = /^\s{0,3}(?:=+|-+)\s*$/;
const THEMATIC_BREAK_PATTERN = /^\s{0,3}(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/;
const LIST_PATTERN = /^(\s{0,3})([-+*]|\d+[.)])\s+(.*)$/;
const BLOCKQUOTE_PATTERN = /^\s{0,3}> ?(.*)$/;
const HTML_BLOCK_PATTERN = /^\s{0,3}(?:<!--|<!DOCTYPE\b|<\/?(?:address|article|aside|base|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|ol|p|pre|script|section|summary|table|tbody|td|tfoot|th|thead|title|tr|ul)(?:\s|>|\/))/i;
const SKIPPED_DIRECTORIES = new Set([".git", "node_modules", "vendor", "dist", "build", "coverage"]);
const RECOGNIZED_EXTENSIONS = new Set([".md", ".markdown", ".mdown", ".mkdn", ".mdx", ".txt"]);

function splitLines(text) {
  return String(text).replace(/\r\n?/g, "\n").split("\n");
}

function isBlank(line) {
  return /^\s*$/.test(line);
}

function isIndentedCode(line) {
  return /^(?: {4}|\t)/.test(line);
}

function isThematicBreak(line) {
  return THEMATIC_BREAK_PATTERN.test(line);
}

function isStructuralLine(line) {
  return HEADING_PATTERN.test(line) || SETEXT_PATTERN.test(line) || isThematicBreak(line);
}

function isTableSeparator(line) {
  return /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function looksLikeTableRow(line) {
  return /^\s*\|.*\|\s*$/.test(line) || (line.match(/\|/g) || []).length >= 1;
}

function tableLines(lines) {
  const result = new Set();
  for (let index = 0; index < lines.length - 1; index += 1) {
    if (!looksLikeTableRow(lines[index]) || !isTableSeparator(lines[index + 1])) continue;
    result.add(index);
    result.add(index + 1);
    for (let row = index + 2; row < lines.length && !isBlank(lines[row]) && looksLikeTableRow(lines[row]); row += 1) result.add(row);
  }
  return result;
}

function isRawHtml(line) {
  return HTML_BLOCK_PATTERN.test(line);
}

function isListItem(line) {
  return LIST_PATTERN.exec(line);
}

function isBlockquote(line) {
  return BLOCKQUOTE_PATTERN.exec(line);
}

function firstContentColumn(line) {
  const index = line.search(/\S/);
  return index < 0 ? 1 : index + 1;
}

function excerpt(line) {
  return line.length > 240 ? `${line.slice(0, 237)}...` : line;
}

function finding(source, lineNumber, line, reason) {
  return { source, line: lineNumber, column: firstContentColumn(line), reason, excerpt: excerpt(line) };
}

function scanLines(lines, source) {
  const findings = [];
  const tables = tableLines(lines);
  let frontMatter = lines.length > 0 && lines[0].trim() === "---";
  let fence = null;
  let htmlComment = false;
  let htmlBlock = false;
  let active = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lineNumber = index + 1;

    if (frontMatter) {
      if (index > 0 && FRONT_MATTER_MARKERS.has(line.trim())) frontMatter = false;
      active = null;
      continue;
    }

    if (fence) {
      const match = FENCE_PATTERN.exec(line);
      if (match && match[1][0] === fence.character && match[1].length >= fence.length) fence = null;
      active = null;
      continue;
    }

    const fenceMatch = FENCE_PATTERN.exec(line);
    if (fenceMatch) {
      fence = { character: fenceMatch[1][0], length: fenceMatch[1].length };
      active = null;
      continue;
    }

    if (htmlComment) {
      if (line.includes("-->")) htmlComment = false;
      active = null;
      continue;
    }

    if (htmlBlock) {
      if (/^\s{0,3}<\//.test(line) || isBlank(line)) htmlBlock = false;
      active = null;
      continue;
    }

    if (/^\s{0,3}<!--/.test(line)) {
      htmlComment = !line.includes("-->");
      active = null;
      continue;
    }

    if (isRawHtml(line)) {
      htmlBlock = !/^\s{0,3}<\/?(?:hr|br|img|input|link|meta)\b[^>]*>\s*$/i.test(line) && !line.includes("</");
      active = null;
      continue;
    }

    if (isBlank(line) || isIndentedCode(line) || tables.has(index) || isStructuralLine(line)) {
      active = null;
      continue;
    }

    const blockquote = isBlockquote(line);
    const listItem = isListItem(blockquote ? blockquote[1] : line);
    if (listItem) {
      active = { type: "list", explicit: /(?: {2}|\\)$/.test(listItem[3]), prefix: blockquote ? "blockquote-list" : "list" };
      continue;
    }

    if (blockquote) {
      if (active?.type === "list" && active.prefix === "blockquote-list") {
        findings.push(finding(source, lineNumber, line, active.explicit ? "explicit-hard-break" : "list-item-continuation"));
        active = { type: "list", explicit: /(?: {2}|\\)$/.test(blockquote[1]), prefix: "blockquote-list" };
        continue;
      }
      if (active?.type === "blockquote") findings.push(finding(source, lineNumber, line, active.explicit ? "explicit-hard-break" : "blockquote-continuation"));
      active = { type: "blockquote", explicit: /(?: {2}|\\)$/.test(blockquote[1]) };
      continue;
    }

    if (active?.type === "list") {
      findings.push(finding(source, lineNumber, line, active.explicit ? "explicit-hard-break" : "list-item-continuation"));
      continue;
    }

    if (active?.type === "paragraph") findings.push(finding(source, lineNumber, line, active.explicit ? "explicit-hard-break" : "paragraph-continuation"));
    active = { type: "paragraph", explicit: /(?: {2}|\\)$/.test(line) };
  }

  return findings;
}

export function scanText(text, sourceOrOptions = {}) {
  const options = typeof sourceOrOptions === "string" ? { source: sourceOrOptions } : sourceOrOptions;
  const source = options.source || "<text>";
  const findings = scanLines(splitLines(text), source);
  return {
    findings,
    summary: { filesScanned: 1, filesWithFindings: findings.length > 0 ? 1 : 0, findingCount: findings.length },
    errors: []
  };
}

export { RECOGNIZED_EXTENSIONS, SKIPPED_DIRECTORIES, splitLines, splitLines as normalizeLines };
