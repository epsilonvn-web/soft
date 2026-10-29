/** Epsilon Blue Soft — Sổ tay Ổ đỡ. */
import { mountHandbook } from './handbook-search.js';

export function mount(root, ctx = {}) {
  return mountHandbook(root, ctx, {
    key: "bearing",
    title: "Sổ tay Ổ đỡ",
    description: "Tra cứu mã ổ, loại ổ, kích thước và thông tin liên quan.",
    placeholder: "VD: 6205, ổ bi, ổ lăn…",
    databaseUrl: new URL('../../data/handbook/bearing-handbook.json', import.meta.url)
  });
}
