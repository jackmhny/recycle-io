#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const logDir = path.join(projectRoot, 'logs');
const logPath = path.join(logDir, 'missing-textures.log');
const manifestPath = path.join(projectRoot, 'src', 'modules', 'trash-manifest.js');
const TRASH_DIR = path.join(projectRoot, 'assets', 'trash');

const CATEGORY_META = {
  bottles: { baseSize: 0.7, binKey: 'bottles' },
  cans: { baseSize: 0.6, binKey: 'bottles' },
  newspapers: { baseSize: 0.9, binKey: 'paper' },
  plastic_bags: { baseSize: 1.0, binKey: 'trash' },
  coffee_cups: { baseSize: 0.7, binKey: 'trash' },
  food_wrappers: { baseSize: 0.8, binKey: 'trash' },
  fruit_peels: { baseSize: 0.5, binKey: 'compost' },
};

async function listTexturesFor(category) {
  const dir = path.join(TRASH_DIR, category);
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const assets = entries
      .filter((entry) => entry.isFile() && /\.(png|webp)$/i.test(entry.name))
      .map((entry) => path.posix.join('assets', 'trash', category, entry.name));
    assets.sort((a, b) => a.localeCompare(b));
    return assets;
  } catch (err) {
    return [];
  }
}

async function buildManifest() {
  const manifest = [];
  for (const [key, meta] of Object.entries(CATEGORY_META)) {
    const textures = await listTexturesFor(key);
    manifest.push({
      key,
      baseSize: meta.baseSize,
      binKey: meta.binKey,
      textures,
    });
  }
  return manifest;
}

function serializeManifest(data) {
  const lines = [];
  lines.push('export const TRASH_CATEGORIES = [');
  for (const cat of data) {
    lines.push('  {');
    lines.push(`    key: '${cat.key}',`);
    lines.push(`    baseSize: ${cat.baseSize},`);
    lines.push(`    binKey: '${cat.binKey}',`);
    lines.push('    textures: [');
    for (const tex of cat.textures) {
      lines.push(`      '${tex}',`);
    }
    lines.push('    ],');
    lines.push('  },');
  }
  lines.push('];');
  lines.push('');
  lines.push('export default TRASH_CATEGORIES;');
  lines.push('');
  return lines.join('\n');
}

async function main() {
  await fs.mkdir(logDir, { recursive: true });

  const lines = [];
  lines.push(`# Missing texture check - ${new Date().toISOString()}`);
  lines.push('');

  let missingCount = 0;

  const manifest = await buildManifest();

  for (const cat of manifest) {
    if (!cat.textures.length) {
      missingCount += 1;
      lines.push(`Category: ${cat.key}`);
      lines.push('  missing -> no textures listed');
      lines.push('');
      continue;
    }
  }

  if (missingCount === 0) {
    lines.push('All categories have at least one matching texture.');
    lines.push('');
  }

  await fs.writeFile(logPath, lines.join('\n'), 'utf8');
  await fs.writeFile(manifestPath, serializeManifest(manifest), 'utf8');
  console.log(`Wrote ${path.relative(projectRoot, logPath)}`);
  console.log(`Wrote ${path.relative(projectRoot, manifestPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
