/**
 * Epsilon Blue Soft — Sổ tay Dung sai
 * Database tương ứng: assets/data/handbook/tolerance-handbook.json
 * Bản khung: chưa có dữ liệu, tra cứu hoặc thuật toán.
 */
export function mount(root, ctx) {
  root.innerHTML = `<section class="tool-box" style="min-height:235px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:12px;padding:32px 20px">
    <span style="width:64px;height:64px;display:grid;place-items:center;border-radius:18px;background:#f0eaff;color:#642bdb">${ctx.icon('ruler',32)}</span>
    <h2 class="tool-box-heading" style="margin:0;font-size:25px">Sổ tay Dung sai</h2>
    <p style="margin:0;color:#52648e;font-size:16px">Nội dung đang được phát triển.</p>
  </section>`;
}
