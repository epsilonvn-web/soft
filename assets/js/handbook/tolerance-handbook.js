import { installHandbookI18n } from './handbook-search.js';
/** Epsilon Blue Soft — Sổ tay Dung sai. */
import { mountHandbook } from './handbook-search.js';

export function mount(root, ctx = {}) {
  // The host's language picker does not translate #tool-workspace.
  // Observe this handbook only; keep search state intact on VI/EN changes.
  const disposeI18n = installHandbookI18n(root);
  let result;
  try {
    result = mountHandbook(root, ctx, {
    key: "tolerance",
    title: "Sổ tay Dung sai",
    description: "Tra cứu ký hiệu dung sai, kiểu lắp và thông tin liên quan.",
    placeholder: "VD: H7, h6, lắp ghép, dung sai…",
    databaseUrl: new URL('../../data/handbook/tolerance-handbook.json', import.meta.url)
    });
  } catch (error) {
    disposeI18n();
    throw error;
  }
  const finish = (cleanup) => () => {
    disposeI18n();
    if (typeof cleanup === 'function') cleanup();
  };
  return result && typeof result.then === 'function'
    ? result.then(finish, error => { disposeI18n(); throw error; })
    : finish(result);
}
