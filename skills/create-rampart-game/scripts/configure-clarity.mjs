#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const [action = 'inspect', rootArg = process.cwd(), projectId = ''] = process.argv.slice(2);
const root = path.resolve(rootArg);
const htmlPath = path.join(root, 'index.html');
const ID_PATTERN = /^[a-z0-9_-]{4,64}$/i;
const CLARITY_LOADER_PATTERN = /\n?[ \t]*<script(?:[ \t]+type=["']text\/javascript["'])?>[ \t]*\r?\n?[\s\S]*?\(function\(c,l,a,r,i,t,y\)\{[\s\S]*?\}\)\(window,[ \t]*document,[ \t]*["']clarity["'],[ \t]*["']script["'],[ \t]*["']([^"']+)["']\);[ \t]*\r?\n?[ \t]*<\/script>[ \t]*\r?\n?/g;
const INVOCATION_ID_PATTERN = /(\}\)\(window,[ \t]*document,[ \t]*["']clarity["'],[ \t]*["']script["'],[ \t]*["'])[^"']+(["']\);)/;

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function readHtml() {
  if (!fs.existsSync(htmlPath)) fail(`index.html not found under ${root}`);
  return fs.readFileSync(htmlPath, 'utf8');
}

function loadersIn(html) {
  return [...html.matchAll(CLARITY_LOADER_PATTERN)].map((match) => ({
    block: match[0],
    projectId: match[1],
    index: match.index,
  }));
}

function writeAtomically(content) {
  const stat = fs.statSync(htmlPath);
  const temporaryPath = `${htmlPath}.clarity-${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporaryPath, content, 'utf8');
    fs.chmodSync(temporaryPath, stat.mode);
    fs.renameSync(temporaryPath, htmlPath);
  } catch (error) {
    try { fs.unlinkSync(temporaryPath); } catch (cleanupError) { /* Best-effort cleanup. */ }
    throw error;
  }
}

function status(html) {
  const loaders = loadersIn(html);
  return {
    action: 'inspect',
    root,
    htmlPath,
    present: loaders.length > 0,
    loaderCount: loaders.length,
    projectIds: loaders.map(({ projectId: id }) => id),
  };
}

const html = readHtml();
const loaders = loadersIn(html);

if (action === 'inspect') {
  process.stdout.write(`${JSON.stringify(status(html), null, 2)}\n`);
  process.exit(0);
}

if (!['remove', 'replace'].includes(action)) {
  fail('Usage: configure-clarity.mjs <inspect|remove|replace> <repo-root> [project-id]');
}
if (loaders.length === 0) fail('No recognizable Lexi Rampart Clarity loader found; no changes made.');
if (loaders.length !== 1) fail(`Expected exactly one Clarity loader, found ${loaders.length}; no changes made.`);

let updated;
if (action === 'remove') {
  updated = html.replace(CLARITY_LOADER_PATTERN, '\n');
} else {
  if (!ID_PATTERN.test(projectId)) {
    fail('Project ID must be 4-64 characters using only letters, digits, underscore, or hyphen.');
  }
  updated = html.replace(CLARITY_LOADER_PATTERN, (block) => {
    if (!INVOCATION_ID_PATTERN.test(block)) fail('Clarity loader invocation is ambiguous; no changes made.');
    return block.replace(INVOCATION_ID_PATTERN, `$1${projectId}$2`);
  });
}

if (updated === html) fail('Clarity configuration did not change; no file was written.');
writeAtomically(updated);

const after = status(readHtml());
if (action === 'remove' && after.present) fail('Clarity removal verification failed.');
if (action === 'replace' && (after.loaderCount !== 1 || after.projectIds[0] !== projectId)) {
  fail('Clarity Project ID replacement verification failed.');
}

process.stdout.write(`${JSON.stringify({ ...after, action, previousProjectId: loaders[0].projectId }, null, 2)}\n`);
