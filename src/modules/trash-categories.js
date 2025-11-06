export const TRASH_CATEGORIES = [
  {
    key: 'bottles',
    baseSize: 0.7,
    binKey: 'bottles',
    variants: { type: 'sequence', prefix: 'bottles', start: 1, end: 10 },
  },
  {
    key: 'cans',
    baseSize: 0.6,
    binKey: 'bottles',
    variants: { type: 'sequence', prefix: 'cans', start: 1, end: 10 },
  },
  {
    key: 'newspapers',
    baseSize: 0.9,
    binKey: 'paper',
    variants: { type: 'sequence', prefix: 'news', start: 1, end: 10 },
  },
  {
    key: 'plastic_bags',
    baseSize: 1.0,
    binKey: 'trash',
    variants: { type: 'sequence', prefix: 'bag', start: 1, end: 10 },
  },
  {
    key: 'coffee_cups',
    baseSize: 0.7,
    binKey: 'trash',
    variants: { type: 'sequence', prefix: 'coffee', start: 1, end: 10 },
  },
  {
    key: 'food_wrappers',
    baseSize: 0.8,
    binKey: 'trash',
    variants: { type: 'sequence', prefix: 'candy', start: 1, end: 10 },
  },
  {
    key: 'fruit_peels',
    baseSize: 0.5,
    binKey: 'compost',
    variants: { type: 'list', names: ['banana', 'lemon', 'orange'] },
  },
];

export function getTrashTextureCandidates(cat) {
  const dir = `assets/trash/${cat.key}/`;
  const candidates = [];
  const { variants } = cat;
  if (!variants || variants.type === 'legacy') {
    for (let i = 1; i <= 10; i++) {
      candidates.push(`${dir}${cat.key}${i}`);
    }
    return candidates;
  }
  if (variants.type === 'sequence') {
    const start = variants.start ?? 1;
    const end = variants.end ?? Math.max(start, 10);
    for (let i = start; i <= end; i++) {
      candidates.push(`${dir}${variants.prefix}${i}`);
    }
    return candidates;
  }
  if (variants.type === 'list') {
    for (const name of variants.names) {
      candidates.push(`${dir}${name}`);
    }
    return candidates;
  }
  return candidates;
}
