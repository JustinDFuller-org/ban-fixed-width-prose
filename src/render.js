function sortedFindings(findings) {
  return [...findings].sort((left, right) => left.source.localeCompare(right.source) || left.line - right.line || left.column - right.column || left.reason.localeCompare(right.reason));
}

function renderJSON(result) {
  return `${JSON.stringify({ findings: sortedFindings(result.findings), summary: result.summary, errors: result.errors }, null, 2)}\n`;
}

function renderText(result) {
  const lines = sortedFindings(result.findings).map((item) => `${item.source}:${item.line}:${item.column}: ${item.reason}: ${item.excerpt}`);
  return lines.length > 0 ? `${lines.join("\n")}\n` : "";
}

export { renderJSON, renderText, sortedFindings };
