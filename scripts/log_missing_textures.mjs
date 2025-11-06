#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { TRASH_CATEGORIES, getTrashTextureCandidates } from '../src/modules/trash-categories.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const logDir = path.join(projectRoot, 'logs');
const logPath = path.join(logDir, 'missing-textures.log');

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await fs.mkdir(logDir, { recursive: true });

  const lines = [];
  lines.push(`# Missing texture check - ${new Date().toISOString()}`);
  lines.push('');

  let missingCount = 0;

  for (const cat of TRASH_CATEGORIES) {
    const candidates = getTrashTextureCandidates(cat);
    const attempted = [];
    let found = false;
    for (const base of candidates) {
      const relWebp = `${base}.webp`;
      const relPng = `${base}.png`;
      const webpPath = path.join(projectRoot, relWebp);
      const pngPath = path.join(projectRoot, relPng);
      attempted.push(relWebp);
      attempted.push(relPng);
      const webpExists = await fileExists(webpPath);
      const pngExists = await fileExists(pngPath);
      if (webpExists || pngExists) {
        found = true;
        break;
      }
    }
    if (!found) {
      missingCount += 1;
      lines.push(`Category: ${cat.key}`);
      for (const rel of attempted) {
        lines.push(`  missing -> ${rel}`);
      }
      lines.push('');
    }
  }

  if (missingCount === 0) {
    lines.push('All categories have at least one matching texture.');
    lines.push('');
  }

  await fs.writeFile(logPath, lines.join('\n'), 'utf8');
  console.log(`Wrote ${path.relative(projectRoot, logPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
