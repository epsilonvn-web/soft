/** Epsilon Blue Soft — Sổ tay Bu lông. */
import { mountHandbook } from './handbook-search.js';

export function mount(root, ctx = {}) {
  return mountHandbook(root, ctx, {
    key: "bolt",
    title: "Sổ tay Bu lông",
    description: "Tra cứu ký hiệu, cấp bền, kích thước và thông tin bu lông.",
    placeholder: "VD: M16, cấp bền, bu lông lục giác…",
    databaseUrl: new URL('../../data/handbook/bolt-handbook.json', import.meta.url)
  });
}
