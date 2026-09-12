import { scanPaths } from "./discovery.js";
import { scanText } from "./scanner.js";
import { renderJSON, renderText } from "./render.js";
import { VERSION } from "./version.js";

function help() {
  return [
    "Usage: ban-fixed-width-prose [options] [path ...]",
    "",
    "Scan Markdown-family and plain-text files for hard-wrapped prose.",
    "",
    "Options:",
    "  --stdin              Scan text from standard input",
    "  --format json|text   Select output format (default: json)",
    "  --include PATTERN    Repeatable path include filter",
    "  --exclude PATTERN    Repeatable path exclude filter",
    "  --debug              Include operational details on stderr",
    "  --help               Show this help",
    "  --version            Show the package version",
  ].join("\n") + "\n";
}

function parseArgs(args) {
  const options = { format: "json", include: [], exclude: [], debug: false, stdin: false, paths: [] };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--stdin") options.stdin = true;
    else if (argument === "--debug") options.debug = true;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--version" || argument === "-v") options.version = true;
    else if (["--format", "--include", "--exclude"].includes(argument)) {
      const value = args[++index];
      if (!value) throw new Error(`${argument} requires a value`);
      if (argument === "--format") {
        if (!["json", "text"].includes(value)) throw new Error(`unsupported format: ${value}`);
        options.format = value;
      } else options[argument.slice(2)].push(value);
    } else if (argument.startsWith("-")) throw new Error(`unknown option ${argument}`);
    else options.paths.push(argument);
  }
  if (options.stdin && options.paths.length > 0) throw new Error("--stdin cannot be combined with paths");
  return options;
}

async function main(args, input = process.stdin, output = process.stdout, errorOutput = process.stderr) {
  try {
    const options = parseArgs(args);
    const streams = input && typeof input === "object" && "stdin" in input && "stdout" in input && "stderr" in input
      ? input
      : { stdin: input, stdout: output, stderr: errorOutput };
    if (options.help) {
      streams.stdout.write(help());
      return 0;
    }
    if (options.version) {
      streams.stdout.write(`${VERSION}\n`);
      return 0;
    }
    const result = options.stdin
      ? scanText(await readInput(streams.stdin), { source: "<stdin>" })
      : await scanPaths(options.paths, options);
    if (options.debug) streams.stderr.write(`scanned ${result.summary.filesScanned} source(s), found ${result.summary.findingCount} finding(s)\n`);
    if (result.errors.length > 0) {
      streams.stderr.write(`${result.errors.map((item) => typeof item === "string" ? item : `${item.source}: ${item.message}`).join("\n")}\n`);
      streams.stdout.write(options.format === "text" ? renderText(result) : renderJSON(result));
      return 2;
    }
    streams.stdout.write(options.format === "text" ? renderText(result) : renderJSON(result));
    return result.findings.length > 0 ? 1 : 0;
  } catch (error) {
    (input && typeof input === "object" && "stderr" in input ? input.stderr : errorOutput).write(`error: ${error.message}\n`);
    return 2;
  }
}

async function readInput(stream) {
  if (typeof stream === "string") return stream;
  let text = "";
  for await (const chunk of stream) text += chunk;
  return text;
}

const helpText = help;
const run = main;

export { help, helpText, parseArgs, main, run, VERSION as version };
