---
name: no-fixed-width-prose
description: Keep prose edits free of physical wraps while preserving structural Markdown.
---

Keep each logical prose paragraph, blockquote, and list item on one physical line. Reflow prose when editing it. Fenced and indented code, tables, front matter, headings, raw HTML, and separate list items are structural and remain allowed. Use the CLI or GitHub Action for final repository enforcement because opaque writes and specialized tools may not be visible to a pre-write hook.
