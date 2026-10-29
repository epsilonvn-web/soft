/** Epsilon Blue Soft — Sổ tay Dung sai. */
import { mountHandbook } from './handbook-search.js';

export function mount(root, ctx = {}) {
  return mountHandbook(root, ctx, {
    key: "tolerance",
    title: "Sổ tay Dung sai",
    description: "Tra cứu ký hiệu dung sai, kiểu lắp và thông tin liên quan.",
    placeholder: "VD: H7, h6, lắp ghép, dung sai…",
    databaseUrl: new URL('../../data/handbook/tolerance-handbook.json', import.meta.url)
  });
}
