/**
 * EPSILON SOFT - flat distribution (2026-10-23)
 *  - All shared UI/engineering helpers live in app.js.
 *  - Layout CSS is injected from this app.js; no assets/css/ is needed.
 *  - Each tool remains its own assets/js/tools/*.js; Cơ khí tools (dir:'mechanical') live in assets/js/mechanical/*.js.
 *  - The code below preserves the approved UI and tested engineering algorithms.
 */
const EPSILON_STYLES = ":root{color-scheme:light;--purple:#5a20db;--purple2:#7c31ff;--deep:#0a1b62;--navy:#07185e;--blue:#0637e9;--yellow:#ffdc08;--green:#09b37e;--muted:#51648e;--line:#dce5fa;--paper:#fff;--page:#f8faff;--shadow:0 8px 24px rgba(43,58,129,.075);font-family:Inter,\"Segoe UI\",Arial,sans-serif;font-size:16px;-webkit-font-smoothing:antialiased}\n*,*::before,*::after{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;color:var(--navy);background:radial-gradient(ellipse at 80% 10%,#f4f1ff,transparent 55%),var(--page);min-width:320px;font-size:16px;line-height:1.48}button,input,textarea,select{font:inherit}button{cursor:pointer}button:disabled{opacity:.55;cursor:not-allowed}a{text-decoration:none;color:inherit}img{max-width:100%;height:auto}svg{flex-shrink:0}[hidden]{display:none!important}:focus-visible{outline:3px solid #ffb900;outline-offset:3px}.shell{max-width:1620px;width:calc(100% - 48px);margin-inline:auto}.skip-link{position:absolute;top:-60px;left:12px;background:white;padding:12px;z-index:1000}.skip-link:focus{top:8px}\n.site-header{background:linear-gradient(103deg,#4c16dc 0%,#5322c8 48%,#5e19cf 100%);color:white;box-shadow:0 3px 14px #29039f1a}.header-inner{display:flex;align-items:center;min-height:76px;gap:18px}.brand{display:flex;align-items:center;flex-shrink:0;white-space:nowrap;gap:8px}.brand-mark{width:59px;height:59px;object-fit:contain;filter:none}.brand-wordmark{font-weight:900;font-size:35px;letter-spacing:-1.7px;line-height:1;display:flex;align-items:baseline}.brand-wordmark strong{font-size:inherit;color:var(--yellow);font-weight:900;letter-spacing:-1.6px}.brand-divider{height:32px;width:1px;background:#ffffff80;margin-left:14px}.header-tagline{font-weight:700;font-size:17px;white-space:nowrap;letter-spacing:.4px}.main-nav{display:flex;gap:12px;margin-left:auto;align-items:center}.nav-link{display:inline-flex;align-items:center;gap:10px;border-radius:12px;padding:11px 17px;color:white;background:#3b0fa472;font-size:16px;font-weight:700;white-space:nowrap;transition:background .18s,transform .18s}.nav-link .svg-icon{width:20px;height:20px}.nav-link:hover{background:#9156fa}.nav-link.is-active{background:#fff;color:#521bd6;box-shadow:0 4px 12px #270e7d22}.mobile-menu{display:none}.icon-button{display:flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:12px;background:#ffffff1d;color:white;border:1px solid #ffffff55}\nmain{min-height:calc(100vh - 250px)}.page-home{padding-top:18px}.hero{display:grid;grid-template-columns:minmax(0,1.22fr) minmax(280px,1fr) minmax(275px,.78fr);min-height:264px;border:1px solid #d9e1f9;border-radius:18px;overflow:hidden;background:linear-gradient(112deg,#f3f6ff 0%,#ecf4ff 42%,#c2b4ff 76%,#855afa 100%);position:relative}.hero-copy{padding:26px 8px 26px 34px;position:relative;z-index:2}.eyebrow{font-size:17px;letter-spacing:1.8px;font-weight:900;color:#1432bd;margin:0 0 8px}.hero-title{font-size:clamp(42px,3.55vw,58px);letter-spacing:-2.6px;line-height:1.01;font-weight:900;color:#041bb0;margin:0}.hero-title strong{color:var(--yellow)}.hero-subtitle{font-size:clamp(19px,1.35vw,24px);font-weight:800;margin:9px 0 8px;white-space:nowrap;color:#0d22a4}.hero-description{font-size:16px;color:#364d84;margin:0}.hero-perks{display:flex;flex-wrap:wrap;gap:10px 24px;margin-top:22px;font-weight:750}.hero-perks span{display:inline-flex;gap:10px;align-items:center;white-space:nowrap}.check-dot{border-radius:100%;display:inline-flex;align-items:center;justify-content:center;background:#10b981;width:24px;height:24px;color:white}.hero-art{position:relative;min-height:255px;align-self:stretch;background:linear-gradient(120deg,#e0faff12,transparent 80%);overflow:hidden}.hero-art img{position:absolute;left:50%;top:50%;width:110%;max-width:none;height:100%;object-fit:cover;transform:translate(-50%,-50%);-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 10%,#000 93%,transparent 100%);mask-image:linear-gradient(90deg,transparent 0,#000 10%,#000 93%,transparent 100%)}.hero-cta{background:linear-gradient(128deg,#092ec4 0%,#2f39ee 95%);color:white;padding:21px 22px;display:flex;flex-direction:column;justify-content:space-between;position:relative}.hero-cta::before{content:\"\";position:absolute;inset:0;opacity:.22;background:radial-gradient(circle at 100% 30%,#8f9cff,transparent 55%);pointer-events:none}.hero-cta h2{position:relative;margin:0 0 10px;font-size:23px;line-height:1.2;letter-spacing:-.4px;color:white}.hero-cta p{position:relative;display:flex;align-items:flex-start;gap:8px;margin:5px 0;font-size:16px}.hero-cta p svg{color:#89fdd3}.button{display:inline-flex;justify-content:center;align-items:center;gap:10px;min-height:49px;border:0;border-radius:12px;padding:10px 20px;font-weight:800;font-size:16px;transition:transform .16s,filter .16s}.button:hover:not(:disabled){filter:brightness(1.045);transform:translateY(-1px)}.button-yellow{background:var(--yellow);color:#07167f;position:relative;margin-top:9px;box-shadow:0 8px 20px #121e904a}.button-purple{background:linear-gradient(120deg,#722cff,#4928ef);color:white}.button-outline{background:white;color:#5326dc;border:1px solid #9f86fd}.button-soft{background:#f0edff;color:#5127cf}.button-sm{min-height:40px;padding:6px 13px;font-size:16px}.button-plain{background:white;color:#1d37a4;border:1px solid var(--line)}\n.directory{scroll-margin-top:20px;margin-top:21px}.section-toolbar{display:flex;align-items:center;gap:14px;justify-content:space-between;margin-bottom:12px}.section-heading{margin:0;font-size:18px;font-weight:900;letter-spacing:.3px;white-space:nowrap}.section-heading::before{content:\"\";display:inline-block;height:16px;width:4px;background:#7034ee;margin-right:10px;border-radius:4px;vertical-align:-2px}.toolbar-right{display:flex;gap:12px;align-items:center}.search-box{width:320px;background:white;border:1px solid #d2def8;box-shadow:0 4px 12px #293e890b;border-radius:22px;display:flex;align-items:center;gap:8px;padding:0 13px;min-height:43px;color:#7790b6}.search-box:focus-within{border-color:#8f6cfa;box-shadow:0 0 0 4px #8f6cfa24}.search-box input{border:0;background:transparent;width:100%;outline:none;color:var(--navy);font-size:16px;min-width:0}.search-box input::placeholder{color:#8c9cba}.view-toggle{display:flex;gap:2px;border:1px solid #dae2fb;padding:3px;background:white;border-radius:12px}.toggle-button{border:0;background:transparent;color:#6d86ad;padding:5px;border-radius:8px;display:grid;place-items:center}.toggle-button.active{background:#6d2de3;color:white}.columns{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;align-items:stretch}.group-panel{border:1px solid #dbe5f9;border-radius:19px;padding:13px;background:#fff;box-shadow:var(--shadow);min-width:0;display:flex;flex-direction:column;min-height:365px}.group-panel.mytools{background:linear-gradient(145deg,#f3eaff,#f9f7ff);border-color:#dfd4ff}.group-panel.category-calc{background:linear-gradient(145deg,#eaf6ff,#f4f9ff);border-color:#d1e6ff}.group-panel.category-engineering{background:linear-gradient(155deg,#fff6eb,#fffbf4);border-color:#ffe8d3}.group-panel.category-utility{background:linear-gradient(145deg,#e6fbf4,#f6fffc);border-color:#d1f0e8}.group-heading{display:flex;align-items:center;gap:13px;padding:1px 0 12px}.category-emblem{width:50px;height:50px;display:grid;place-items:center;color:white;background:linear-gradient(138deg,#9661ff,#6022df);border-radius:13px;box-shadow:0 5px 12px #5e28d22b;flex-shrink:0}.category-calc .category-emblem{background:linear-gradient(138deg,#64caff,#167ae6)}.category-engineering .category-emblem{background:linear-gradient(138deg,#ffc15b,#ff711e)}.category-utility .category-emblem{background:linear-gradient(138deg,#8ee89b,#05ab83)}.group-heading-text{min-width:0}.group-heading-text h3{margin:0;font-size:19px;line-height:1.17;color:#182aa8;font-weight:900}.group-heading-text p{margin:4px 0 0;font-size:16px;color:#566d99;line-height:1.25}.group-count{margin-left:auto;border:4px solid white;background:#dfe9fd;min-width:39px;height:39px;display:grid;place-items:center;font-weight:900;border-radius:100%;color:#1a32b5;font-size:17px;flex-shrink:0}.group-items{display:grid;gap:7px}.tool-card{background:#fff;border:1px solid #e1e8f5;border-radius:13px;padding:8px 10px;display:flex;align-items:center;gap:10px;min-height:69px;box-shadow:0 2px 6px #091e4a07;transition:transform .17s,border-color .17s,box-shadow .17s;position:relative}.tool-card.is-ready:hover{transform:translateY(-2px);border-color:#b8c8ff;box-shadow:0 6px 15px #30166d1a}.tool-link{display:flex;min-width:0;flex:1;align-items:center;gap:10px}.tool-tile{height:45px;width:45px;border-radius:13px;display:grid;place-items:center;flex-shrink:0;color:#1166df;background:linear-gradient(140deg,#edf6ff,#a7dafa)}.tone-blue{color:#0054e6;background:linear-gradient(145deg,#d7eeff,#9bd4ff)}.tone-mint{color:#009f78;background:linear-gradient(145deg,#e2fff4,#b0e9db)}.tone-orange{color:#f36d00;background:linear-gradient(145deg,#fff0db,#ffce9b)}.tone-violet{color:#7631ec;background:linear-gradient(145deg,#f1eaff,#dbc0ff)}.tone-red{color:#e8294a;background:linear-gradient(145deg,#ffebee,#ffc9d0)}.tone-teal{color:#009c9a;background:linear-gradient(145deg,#e2fff7,#a4e9d8)}.tool-names{min-width:0;display:flex;flex-direction:column;gap:1px}.tool-names b{font-size:16px;line-height:1.2;font-weight:800;display:block}.tool-names small{font-size:16px;color:#607297;line-height:1.25;display:block}.star-btn{width:33px;height:42px;display:grid;place-items:center;border:0;color:#98a9c8;background:transparent;padding:0;flex-shrink:0}.star-btn:hover,.star-btn[aria-pressed=\"true\"]{color:#f5a900}.star-btn[aria-pressed=\"true\"] svg{fill:#ffe951;stroke:#a86e03}.star-btn svg{width:24px;height:24px}.tool-card.is-planned{opacity:.72;background:#fdfdff}.tool-card.is-planned .tool-link{cursor:default}.soon-label{font-size:16px;color:#7643dd;background:#eee8ff;border-radius:8px;padding:2px 8px;align-self:flex-start}.mytools-empty{border:1px dashed #b7bafa;border-radius:14px;text-align:center;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:235px;padding:20px;background:#ffffff51}.empty-icon{color:#4829ca;background:#eeeaff;border:1px solid #d1c8ff;border-radius:13px;padding:12px;display:grid;place-items:center}.mytools-empty strong{font-size:17px}.mytools-empty p{margin:0;font-size:16px;color:#5c6d9e}.mytools-hint{background:#ffffff80;border:1px solid #e0ddff;border-radius:12px;margin-top:12px;padding:11px;display:flex;gap:9px;align-items:center;color:#3854a3;font-size:16px}.mytools-hint svg{color:#e8aa00}.empty-search{text-align:center;padding:28px;background:white;border:1px dashed #bdc9e8;border-radius:13px;color:#3c5396;margin-top:14px}.columns.list-view{display:block}.list-view .group-panel{min-height:0;margin-bottom:16px}.list-view .group-items{grid-template-columns:repeat(2,minmax(0,1fr))}.list-view .mytools-empty{min-height:95px}\n.portable-strip{position:relative;margin:15px 0 24px;min-height:132px;border-radius:19px;color:white;padding:22px 25px;display:flex;gap:28px;align-items:center;overflow:hidden;background:linear-gradient(113deg,#6120e7,#2145f2 46%,#761bf0);box-shadow:0 8px 20px #4435df22}.portable-strip::before{content:\"\";position:absolute;inset:0;background:radial-gradient(ellipse at 60% -20%,#56e7ff88,transparent 53%),repeating-linear-gradient(130deg,transparent 0 120px,#ffffff08 122px 129px);pointer-events:none}.portable-stripe{position:relative;display:flex;align-items:center;gap:15px;flex:0 0 27%}.win-badge{display:grid;place-items:center;border-radius:16px;width:79px;height:79px;transform:rotate(-3deg);background:linear-gradient(130deg,#083ad6,#14baf3);box-shadow:0 0 0 2px #ffcc19,0 5px 14px #0003;flex-shrink:0}.win-badge .svg-icon{width:48px;height:48px}.portable-stripe h3{font-size:28px;line-height:1.2;margin:0;font-weight:900}.portable-stripe p{margin:0;font-size:16px}.portable-strip small.status{display:inline-block;font-size:16px;font-weight:850;color:#102bb9;background:#ffdf0a;border-radius:999px;padding:2px 9px;margin-top:5px}.portable-text{position:relative;flex:1;max-width:550px}.portable-text h3{font-size:20px;line-height:1.25;margin:0 0 8px;color:white}.portable-text p{margin:0;font-size:16px;line-height:1.4}.portable-laptop{height:130px;width:205px;object-fit:cover;object-position:center;align-self:stretch;mix-blend-mode:screen;opacity:.93;position:relative}.portable-actions{position:relative;display:grid;gap:6px;min-width:185px}.portable-actions .button{width:100%}.portable-actions span{font-size:16px;text-align:center}.portable-details{margin:0 0 24px;padding:20px 24px;background:#fff;border:1px solid var(--line);border-radius:16px;scroll-margin-top:16px}.portable-details h3{font-size:21px;margin:0 0 8px}.portable-details p{margin:8px 0}.portable-details .button{margin-top:8px}.callout{border:1px solid #d8e2ff;border-radius:14px;padding:15px 18px;background:#f0f5ff;font-size:16px;line-height:1.6}.callout.warning{background:#fffaed;border-color:#f5dfaa;color:#684b10}.callout.success{background:#eefcf5;border-color:#b4ebd3;color:#145e44}.callout strong{font-weight:850}\n.site-footer{border-top:1px solid var(--line);padding-top:22px;padding-bottom:26px;color:#67799b}.footer-main{display:flex;align-items:flex-start;justify-content:space-between;gap:20px}.footer-brand{display:flex;align-items:center;gap:9px;font-weight:900;font-size:19px;color:#1d32b3}.footer-brand img{width:38px;height:38px}.footer-brand img.footer-logo{width:220px;height:auto}.footer-main p{font-size:16px;margin:6px 0}.footer-links{display:flex;gap:20px;font-size:16px;font-weight:700}.footer-links a:hover{color:#6b2cda}.footer-bottom{font-size:16px;border-top:1px solid #e5ebfa;margin-top:18px;padding-top:13px}.toast-region{position:fixed;z-index:9999;right:22px;bottom:22px;pointer-events:none;max-width:calc(100vw - 44px)}.toast{padding:14px 18px;background:#3817ad;color:white;border:1px solid #ffffff44;border-radius:13px;box-shadow:0 15px 38px #19125155;min-width:230px;font-size:16px;animation:slidein .2s ease}.toast.error{background:#a02349}.toast.success{background:#087b65}@keyframes slidein{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}\n/* Tools */\n.tool-page{padding:20px 10px 30px}.breadcrumbs{display:flex;align-items:center;flex-wrap:wrap;gap:10px;color:#485a8b;font-size:16px;margin-bottom:16px}.breadcrumbs a{color:#3434c5;font-weight:700}.breadcrumbs a:hover{text-decoration:underline}.tool-heading{display:flex;align-items:center;gap:18px;margin-bottom:16px;flex-wrap:wrap}.tool-heading-icon{height:72px;width:72px;border-radius:19px;display:grid;place-items:center;flex-shrink:0}.tool-heading-icon .svg-icon{width:40px;height:40px}.tool-heading h1{font-size:clamp(29px,2.4vw,42px);line-height:1.12;letter-spacing:-1.15px;margin:0 0 5px;color:#0d178e}.tool-heading p{margin:0;color:#607198;font-size:19px}.tool-heading .button{margin-left:auto}.tool-surface{display:grid;grid-template-columns:1fr;gap:15px}.tool-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:15px;min-width:0}.tool-box{background:#fff;border:1px solid #d9e5fb;border-radius:16px;padding:16px;box-shadow:0 3px 12px #2b5a9c0a;min-width:0}.tool-box-heading{font-size:20px;color:#0c268f;font-weight:900;margin:0 0 13px;display:flex;align-items:center;gap:9px}.tool-box-heading .svg-icon{color:#4b55e9}.box-lead{font-size:16px;color:var(--muted);margin:-8px 0 15px}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.form-grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}.form-field{display:flex;flex-direction:column;gap:5px;min-width:0;font-weight:750;color:#122766;font-size:16px}.form-field>span:first-child{font-size:16px}.form-field select,.form-field>input,.form-field textarea{background:white;color:#13266d;min-width:0;width:100%;min-height:48px;border:1px solid #c7d5fa;border-radius:10px;padding:10px 12px;outline:0}.form-field select:focus,.form-field>input:focus,.form-field textarea:focus,.input-wrap:focus-within{border-color:#8255f8;box-shadow:0 0 0 3px #8556ee27}.input-wrap{display:flex;align-items:center;min-height:47px;border:1px solid #c7d5fa;border-radius:10px;overflow:hidden;background:white}.input-wrap input{border:0;min-width:0;flex:1;width:100%;height:45px;padding:7px 11px;outline:0;color:#13266d}.input-wrap small{color:#563bd3;background:#f2f1ff;font-size:16px;font-weight:700;padding:9px;min-width:45px;text-align:center;white-space:nowrap}.form-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:15px}.results-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.results-grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}.result-tile{border:1px solid #dae4ff;border-radius:14px;padding:16px;background:linear-gradient(125deg,#f1faff,#e1f3ff);min-width:0}.result-tile.green{background:linear-gradient(125deg,#ecfff7,#dcf9e9);border-color:#bcebd9}.result-tile.purple{background:linear-gradient(125deg,#fbf3ff,#efe5ff);border-color:#dfcfff}.result-tile.yellow{background:linear-gradient(125deg,#fff9df,#fff3b8);border-color:#ffdf7f}.result-tile strong{display:block;font-size:16px;color:#264caa;font-weight:850;margin-bottom:5px}.result-tile output{display:block;font-size:clamp(23px,2.2vw,32px);font-weight:900;color:#03279b;line-height:1.08;overflow-wrap:anywhere}.result-tile output small{font-size:16px;color:#33579c}.result-tile.yellow output{color:#4d18b0}.preview-canvas{display:grid;place-items:center;min-height:285px;border:1px solid #e1e5fc;border-radius:14px;background:linear-gradient(145deg,#f7f8ff,#fcfaff);padding:12px;overflow:hidden}.preview-canvas svg{width:100%;max-height:320px}.shape-note{text-align:center;margin:10px 0 0;color:#65749a}.tool-error{color:#aa2645;font-weight:750;margin-top:12px;min-height:22px}.tool-hint{font-size:16px;line-height:1.55;color:#65749a;margin:13px 0 0}.tool-hint strong{color:#1a2f8f}.separator{height:1px;background:#e3e8f9;margin:14px 0}.tool-detail-card{background:linear-gradient(120deg,#f7f9ff,#f0edff);border-radius:14px;padding:15px;color:#3f4b87}.tool-detail-card p{margin:7px 0}.related-tools{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.related-tools a{display:grid;grid-template-columns:44px minmax(0,1fr) 16px;align-items:center;column-gap:10px;min-height:64px;min-width:0;background:#fff;border:1px solid #dfe8fa;border-radius:11px;padding:9px 12px;font-size:16px;font-weight:750}.related-tools a:hover{border-color:#9b8cf3}.related-tools a>.tool-tile{width:44px;height:44px;display:grid;place-items:center;flex:none}.related-tools a>.tool-tile>.svg-icon{display:block;margin:0;justify-self:center;align-self:center}.related-tools a>.related-tool-name{min-width:0;line-height:1.3;overflow-wrap:break-word}.related-tools a>.svg-icon:last-child{width:16px;height:16px;margin:0;justify-self:end;align-self:center;flex:none}.demo-table{border-collapse:collapse;width:100%;background:#fff}.demo-table th,.demo-table td{text-align:left;border-bottom:1px solid #e5edfc;padding:10px;vertical-align:middle;font-size:16px}.demo-table th{font-weight:850;color:#2a369d;background:#f3f5ff}.data-table-scroll{overflow:auto;max-height:470px;border:1px solid #e1e8fa;border-radius:10px}.badge-pale{font-size:16px;font-weight:750;color:#6030c6;border-radius:999px;background:#ede8ff;padding:5px 12px;display:inline-flex;gap:6px;align-items:center}.symbol-math{font-size:23px;color:#6138c7;font-weight:800}.key-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}.calc-key{border-radius:10px;min-height:58px;background:#f5f7ff;border:1px solid #dce4fb;color:#162873;font-size:21px;font-weight:750}.calc-key:hover{background:#e7edff}.calc-key.operator{color:#662adc;background:#f1ecff}.calc-key.equals{background:#6725e4;color:white}.calc-display{background:#f3f6fe;border:1px solid #c9d7fa;padding:18px;border-radius:14px;margin:12px 0 20px;font-size:32px;min-height:90px;width:100%;text-align:right;color:#10217f;font-weight:800}.calc-history{max-height:300px;overflow-y:auto}.history-item{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #e1e7f5;padding:9px;font-size:16px}.calendar-toolbar{display:flex;gap:10px;align-items:center;justify-content:space-between}.cal-month{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px;margin-top:12px}.cal-dow{text-align:center;font-weight:850;color:#485eb5;font-size:16px;padding:6px}.cal-cell{border:1px solid #e1e9f7;border-radius:9px;min-height:64px;text-align:left;padding:6px;display:flex;flex-direction:column;align-items:flex-start;background:#fff;font-weight:800;color:#263c8b}.cal-cell:hover{border-color:#8657f8}.cal-cell.is-selected{border:2px solid #6521dd;background:#f3ecff}.cal-cell.is-other{opacity:.35}.cal-cell.is-today .day-solar{background:#0a44de;color:white}.day-solar{border-radius:5px;padding:0 5px}.day-lunar{font-size:16px;color:#9b59bb;margin-top:auto}.note-area{width:100%;min-height:270px;resize:vertical;border:1px solid #ccd8f8;border-radius:12px;padding:15px;font-size:17px;line-height:1.6}.qr-output{background:#fff;border:1px solid #d9e3f8;border-radius:13px;min-height:280px;padding:15px;display:grid;place-items:center;overflow:auto}.qr-output canvas{max-width:100%;height:auto}.stack{display:grid;gap:15px}.mini-kpi{font-size:16px;color:#536d9b}.intro-card{border-radius:17px;padding:24px;border:1px solid #dbe4fb;background:white;margin:20px 0}.intro-card h1{font-size:34px;color:#142dab;margin:0 0 10px}.intro-card p{font-size:17px}.help-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.help-grid .tool-box{min-height:155px}.status-pill{background:#ffedbd;color:#6e5000;font-weight:850;border-radius:999px;padding:5px 10px;font-size:16px}.spin{display:inline-block;border:3px solid #ffffff60;border-top-color:currentColor;border-radius:50%;width:18px;height:18px;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}\n@media(max-width:1360px){.header-tagline{display:none}.brand-divider{display:none}.nav-link{padding:10px 12px}.hero{grid-template-columns:1.15fr .85fr}.hero-art{min-height:242px}.hero-cta{grid-column:1/-1;display:none}.group-heading-text h3{font-size:17px}.group-heading-text p{font-size:16px}.tool-card{gap:7px;padding:8px}.tool-tile{height:42px;width:42px}.tool-names b{font-size:16px}.tool-names small{font-size:16px}.portable-laptop{display:none}}\n@media(max-width:1070px){.brand-wordmark{font-size:29px}.main-nav{gap:5px}.nav-link{font-size:16px;padding:9px 10px}.columns{grid-template-columns:repeat(2,minmax(0,1fr))}.hero{grid-template-columns:1fr 1fr}.hero-copy{padding:25px}.hero-title{font-size:46px}.hero-subtitle{white-space:normal}.hero-art{max-height:270px}.portable-text{max-width:none}.portable-stripe{flex-basis:40%}.tool-grid-2{grid-template-columns:1fr}.tool-box{padding:17px}}\n@media(max-width:750px){.shell{width:calc(100% - 28px)}.header-inner{min-height:67px;gap:5px}.brand-mark{height:48px;width:48px}.brand-wordmark{font-size:26px;letter-spacing:-1.2px}.mobile-menu{display:flex;margin-left:auto}.main-nav{display:none;position:absolute;top:65px;right:14px;left:14px;z-index:50;flex-direction:column;align-items:stretch;background:#5121ce;border-radius:13px;padding:10px;box-shadow:0 15px 25px #1f158946}.main-nav.open{display:flex}.nav-link{padding:14px 15px}.hero{display:block}.hero-copy{padding:23px}.hero-title{font-size:clamp(39px,8.7vw,54px)}.hero-subtitle{font-size:20px;white-space:normal}.hero-art{height:200px;min-height:200px}.hero-art img{height:240px;object-fit:cover}.hero-cta{display:none}.section-toolbar{align-items:stretch;flex-direction:column;gap:10px}.toolbar-right{width:100%}.search-box{flex:1;width:auto;max-width:none}.columns{grid-template-columns:1fr;gap:12px}.group-panel{min-height:unset}.mytools-empty{min-height:160px}.group-heading-text h3{font-size:20px}.group-heading-text p{font-size:16px}.group-items{gap:9px}.tool-card{min-height:74px;padding:10px 12px}.tool-tile{width:49px;height:49px}.tool-names b{font-size:17px}.tool-names small{font-size:16px}.list-view .group-items{grid-template-columns:1fr}.portable-strip{flex-wrap:wrap;gap:15px;padding:18px}.portable-stripe{flex-basis:100%}.portable-text{flex-basis:100%}.portable-actions{width:100%}.footer-main{flex-direction:column}.footer-links{flex-wrap:wrap;gap:10px 20px}.tool-page{padding-inline:0}.tool-heading-icon{width:57px;height:57px}.tool-heading h1{font-size:29px}.tool-heading p{font-size:16px}.tool-heading .button{margin-left:0}.form-grid,.form-grid.three{grid-template-columns:1fr}.results-grid,.results-grid.three,.related-tools,.help-grid{grid-template-columns:1fr 1fr}.result-tile output{font-size:24px}.tool-heading{gap:13px}.tool-box-heading{font-size:19px}}\n@media(max-width:420px){.brand-wordmark{font-size:22px}.brand-mark{width:42px;height:42px}.hero-title{font-size:38px}.hero-subtitle{font-size:19px}.hero-copy{padding:20px 15px}.hero-perks{gap:9px}.hero-perks span{white-space:normal}.results-grid,.results-grid.three,.related-tools,.help-grid{grid-template-columns:1fr}.tool-heading h1{font-size:27px}.cal-cell{min-height:59px;padding:4px}.day-lunar{font-size:16px}.tool-page{padding-top:14px}}\n@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}\n\n/* Startup fallback, replaced by app.js after successful module import. */\n.startup-panel{max-width:820px;margin:clamp(32px,8vh,100px) auto;background:#fff;border:1px solid #dfd7ff;border-radius:20px;box-shadow:0 14px 36px rgba(51,34,122,.09);padding:30px;color:#182b79;font-size:16px;line-height:1.65}.startup-panel h1{font-size:25px;color:#5221c9;margin:0 0 16px}.startup-panel p{font-size:16px}.startup-panel code{color:#3e19b5;background:#f2efff;padding:2px 5px;border-radius:5px;overflow-wrap:anywhere}\n\n/* Epsilon Blue Soft PDF Studio - shared document workspace. All UI text >=16px. */\n.pdf-studio{--pdf-purple:#6429e3;--pdf-blue:#1733a5;--pdf-border:#d9dffd;--pdf-ink:#132565;color:var(--pdf-ink);font-size:16px;display:grid;gap:14px}\n.pdf-studio *{box-sizing:border-box}\n.pdf-studio button,.pdf-studio input,.pdf-studio select,.pdf-studio textarea{font:inherit}\n.pdf-intro{display:flex;align-items:center;justify-content:space-between;gap:24px;border-radius:18px;background:linear-gradient(115deg,#f3eeff 0%,#ecf4ff 54%,#fff9e3 100%);border:1px solid #e3d9ff;padding:20px 24px}\n.pdf-intro h2{font-size:clamp(23px,2vw,30px);margin:0 0 8px;font-weight:900;color:#171781}\n.pdf-intro p{font-size:16px;line-height:1.5;margin:0}\n.pdf-eyebrow{font-size:16px!important;letter-spacing:.06em;font-weight:850;color:#7633dc;margin-bottom:7px!important}\n.pdf-privacy{min-width:245px;background:#fff8;border:1px solid #ddd4ff;padding:12px;border-radius:13px;font-weight:800;display:flex;align-items:center;gap:8px;flex-wrap:wrap}\n.pdf-privacy small{display:block;flex-basis:100%;color:#5a6e9f;font-size:16px;font-weight:450}\n.pdf-topbar{display:flex;gap:14px;align-items:center;justify-content:space-between;padding:13px 16px;background:white;border:1px solid var(--pdf-border);border-radius:16px;flex-wrap:wrap}\n.pdf-fileline{display:flex;align-items:center;gap:10px;min-width:0;flex:1}\n.pdf-fileline b{font-size:18px;display:block;max-width:380px;overflow-wrap:anywhere}\n.pdf-fileline small{color:#6275a2;font-size:16px;display:block}\n.pdf-fileicon{background:#f0e9ff;border-radius:12px;padding:9px;color:#7533e8;display:grid;place-items:center}\n.pdf-topactions{display:flex;gap:8px;flex-wrap:wrap}\n.pdf-topactions .button{padding:10px 13px;font-size:16px;min-height:42px}\n.pdf-studio .button:disabled{opacity:.45;cursor:not-allowed}\n.pdf-dropzone{display:grid;justify-items:center;gap:13px;padding:55px 20px;border:2px dashed #b9a4ff;border-radius:20px;background:linear-gradient(135deg,#fbfaff,#f4f6ff);text-align:center;transition:background .2s,border-color .2s}\n.pdf-dropzone.dragging{border-color:#6f2be3;background:#e9dffe}\n.pdf-dropzone h3{font-size:26px;margin:0;color:#21259a}\n.pdf-dropzone p{max-width:570px;margin:0;color:#5571a4;font-size:17px;line-height:1.65}\n.pdf-dropzone small{font-size:16px;color:#667ba3}\n.pdf-drop-icon{width:84px;height:84px;color:#662bdb;background:linear-gradient(135deg,#eadbff,#c6e6ff);display:grid;place-items:center;border-radius:23px}\n.pdf-drop-actions{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}\n.pdf-tabs{display:flex;flex-wrap:wrap;gap:7px;align-items:center;border:1px solid #d5dcf8;border-radius:16px;background:#f5f5ff;padding:8px}\n.pdf-tab{display:flex;align-items:center;gap:8px;border:1px solid transparent;border-radius:11px;padding:12px 15px;background:transparent;color:#344a91;font-size:16px;font-weight:850;cursor:pointer}\n.pdf-tab:hover{background:#e8e8fc}\n.pdf-tab.is-active{color:#fff;background:linear-gradient(115deg,#5825d9,#6b34ee);box-shadow:0 6px 14px #5121bc31}\n.pdf-studio .tool-box{padding:19px}\n.pdf-operations{border:1px solid #d6dffe;border-radius:15px;background:white}\n.pdf-operations [data-panel][hidden]{display:none!important}\n.pdf-panel-head{display:flex;justify-content:space-between;align-items:flex-start;gap:15px;flex-wrap:wrap;margin-bottom:13px}\n.pdf-panel-head h3{font-size:21px;display:flex;gap:9px;align-items:center;color:#19278c;margin:0}\n.pdf-panel-head p{font-size:16px;margin:0;color:#5a6eaa;flex:1;min-width:260px;line-height:1.5}\n.pdf-action-row{display:flex;flex-wrap:wrap;gap:8px}\n.pdf-action-row .button{font-size:16px;min-height:42px;padding:9px 13px}\n.pdf-inline-form,.pdf-edit-settings,.pdf-compress{display:flex;align-items:flex-end;flex-wrap:wrap;gap:10px;margin-top:15px;padding:13px;background:#f6f8ff;border:1px solid #e1e6ff;border-radius:12px}\n.pdf-inline-form label,.pdf-edit-settings label,.pdf-compress label{display:flex;flex-direction:column;gap:6px;font-size:16px;font-weight:800;color:#182a88;flex:1;min-width:145px}\n.pdf-inline-form input,.pdf-edit-settings input,.pdf-edit-settings select,.pdf-compress select{width:100%;height:43px;background:white;padding:7px 11px;border:1px solid #cbd5f9;border-radius:9px;font-size:16px;color:#243d84}\n.pdf-edit-settings input[type=\"color\"]{padding:3px;max-width:90px;cursor:pointer}\n.pdf-panel-tip{color:#647aa9;font-size:16px;margin:10px 0 0;line-height:1.5}\n.pdf-danger-tip{font-size:16px;line-height:1.55;background:#fff8e4;color:#8c5711;border:1px solid #f3d99a;border-radius:10px;margin:14px 0 0;padding:12px}\n.pdf-editor-grid{display:grid;grid-template-columns:minmax(205px,260px) minmax(0,1fr);gap:14px;align-items:stretch}\n.pdf-page-sidebar,.pdf-viewer{background:#fff;border:1px solid #dce4fa;border-radius:16px;min-height:420px;overflow:hidden}\n.pdf-page-sidebar{padding:12px}\n.pdf-sidebar-title{display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:18px;font-weight:900;color:#1b2f93}\n.pdf-sidebar-title span{background:#f3ecff;color:#6028d7;border-radius:30px;padding:5px 10px;font-size:16px}\n.pdf-page-hint{font-size:16px;color:#6378a5;line-height:1.4;margin:10px 0}\n.pdf-thumbnails{height:min(73vh,730px);overflow-y:auto;display:grid;grid-template-columns:1fr 1fr;gap:8px;align-content:start;padding:5px;scrollbar-color:#a8b6e5 transparent}\n.pdf-thumb{position:relative;min-width:0;background:#f7f9ff;border:2px solid #e4eafc;border-radius:10px;padding:7px;cursor:grab}\n.pdf-thumb:hover{border-color:#a688ef}.pdf-thumb.active{border-color:#6930df;background:#efe9ff}\n.pdf-thumb-check{position:absolute;top:5px;right:5px;width:20px;height:20px;accent-color:#622cdc;z-index:2;cursor:pointer}\n.pdf-thumb-button{padding:0;border:0;background:transparent;display:flex;flex-direction:column;gap:5px;align-items:center;cursor:pointer;width:100%;min-height:111px;font-size:16px;color:#273c8b;font-weight:800}\n.pdf-thumb-button canvas{width:auto;max-width:100%;max-height:104px;height:auto;background:white;box-shadow:0 3px 9px #20326b1c;border:1px solid #e0e5f5}\n.pdf-viewer{display:flex;flex-direction:column;background:#f5f7ff}\n.pdf-viewer-toolbar{display:flex;justify-content:space-between;align-items:center;gap:15px;padding:10px 17px;background:#fff;border-bottom:1px solid #dde5fa;font-weight:900;color:#223995;min-height:49px}\n.pdf-viewer-toolbar>div{display:flex;gap:8px}\n.pdf-icon-btn{display:grid;place-items:center;border:1px solid #cdd7f5;border-radius:9px;background:#f8faff;color:#5a2dd0;width:36px;height:32px;cursor:pointer}\n.pdf-icon-btn:first-child svg{transform:rotate(180deg)}\n.pdf-preview-area{background:radial-gradient(circle at 50% 30%,#f0edff 0%,#e7eeff 80%);min-height:520px;padding:18px;display:flex;justify-content:center;align-items:flex-start;overflow:auto;position:relative}\n#pdf-canvas{display:block;background:white;box-shadow:0 5px 28px #1c316131;max-width:100%;height:auto;cursor:crosshair}\n.pdf-preview-message{color:#5c6f99;font-size:16px;position:absolute;top:25%;padding:15px;border-radius:12px;background:#fff;max-width:90%;text-align:center}\n.pdf-preview-message[hidden]{display:none}\n.pdf-preview-caption{font-size:16px;color:#6076a8;padding:10px;margin:0;text-align:center;background:#fff}\n.pdf-signbox{display:flex;align-items:flex-start;gap:13px;flex-wrap:wrap;margin-top:15px;padding:13px;background:#fbfaff;border-radius:12px;border:1px solid #ded6ff}\n.pdf-signbox>div{max-width:240px}\n.pdf-signbox strong{display:block;font-size:17px;color:#222890}\n.pdf-signbox p{font-size:16px;color:#6680ac;line-height:1.4;margin:4px 0}\n.pdf-signbox canvas{background:white;width:min(480px,100%);max-width:100%;height:150px;border:1px dashed #9ea7f2;border-radius:11px;touch-action:none;cursor:crosshair}\n.pdf-advanced{display:grid;gap:10px;grid-template-columns:repeat(3,minmax(0,1fr))}\n.pdf-advanced article{background:#f5f6ff;border:1px solid #e3dfff;border-radius:11px;padding:15px}\n.pdf-advanced article b{display:block;font-size:18px;color:#30238d;margin-bottom:10px}\n.pdf-advanced article p{color:#576ca0;font-size:16px;line-height:1.6;margin:0}\n.pdf-busy{position:fixed;z-index:200;bottom:25px;right:25px;max-width:min(440px,90vw);border-radius:13px;background:#5624cb;color:white;display:flex;align-items:center;gap:10px;padding:14px 18px;font-size:16px;font-weight:800;box-shadow:0 14px 40px #3d258257}\n.pdf-busy[hidden],.pdf-message[hidden]{display:none!important}\n.pdf-message{background:#fff1ed;border:1px solid #f0a09d;color:#922d2d;font-size:16px;padding:12px 16px;border-radius:12px;line-height:1.5;overflow-wrap:anywhere}\n.pdf-legal{color:#6176a4;font-size:16px;line-height:1.55;margin:6px 0 0}\n@media(max-width:1050px){.pdf-intro{flex-direction:column;align-items:flex-start}.pdf-privacy{width:100%}.pdf-editor-grid{grid-template-columns:210px minmax(0,1fr)}.pdf-advanced{grid-template-columns:1fr 1fr}}\n@media(max-width:740px){.pdf-editor-grid{grid-template-columns:1fr}.pdf-page-sidebar{min-height:0}.pdf-thumbnails{height:auto;max-height:240px;grid-template-columns:repeat(4,minmax(0,1fr))}.pdf-thumb-check{width:18px;height:18px}.pdf-thumb-button{min-height:90px}.pdf-dropzone{padding:28px 13px}.pdf-topactions{width:100%;justify-content:flex-start}.pdf-tab{flex:1;justify-content:center;padding:10px}.pdf-panel-head{display:block}.pdf-panel-head p{margin-top:10px}.pdf-action-row .button{flex:1}.pdf-preview-area{min-height:340px}.pdf-advanced{grid-template-columns:1fr}}\n@media(max-width:430px){.pdf-thumbnails{grid-template-columns:repeat(3,minmax(0,1fr))}.pdf-tabs{gap:4px}.pdf-tab{font-size:16px}.pdf-intro{padding:17px}.pdf-intro h2{font-size:24px}}\n";
const themeSheet = document.createElement('style');
themeSheet.id = 'epsilon-soft-theme';
themeSheet.textContent = EPSILON_STYLES + "\n/* ES TOOLKIT desktop-density: size/spacing parity with the approved Portable app.\n * Does not scale text below 16px, does not touch home cards, math or tool logic.\n * Compact only for laptop/desktop browser windows; mobile remains unchanged. */\n@media (min-width: 1024px) and (max-height: 900px) {\n  .tool-page{padding:8px 4px 18px}\n  .tool-page .breadcrumbs{margin-bottom:8px;gap:8px;line-height:1.25}\n  .tool-page .tool-heading{gap:11px;margin-bottom:9px;flex-wrap:nowrap}\n  .tool-page .tool-heading-icon{width:50px;height:50px;border-radius:13px}\n  .tool-page .tool-heading-icon .svg-icon{width:29px;height:29px}\n  .tool-page .tool-heading h1{font-size:28px;line-height:1.12;letter-spacing:-.55px;margin-bottom:2px}\n  .tool-page .tool-heading p{font-size:16px;line-height:1.26}\n  .tool-page .tool-heading .button{min-height:42px;padding:7px 12px;margin-left:auto}\n  .tool-page .tool-surface{gap:10px}\n  .tool-page .tool-grid-2{gap:10px}\n  .tool-page .tool-box{padding:12px;border-radius:14px}\n  .tool-page .tool-box-heading{font-size:19px;margin-bottom:9px}\n  .tool-page .form-grid{gap:10px}\n  .tool-page .form-field select,.tool-page .form-field>input,.tool-page .form-field textarea{min-height:43px;padding:7px 10px}\n  .tool-page .input-wrap{min-height:43px}\n}\n";
document.head.appendChild(themeSheet);
// Dynamic layout styling, bundled in app.js.
themeSheet.textContent += "\n/* Epsilon Blue Soft navigation: web-first sidebar. The base theme remains unchanged. */\nbody.es-has-sidebar{background:radial-gradient(ellipse at 85% 12%,#f1ecff,transparent 48%),#f8faff}\n.es-app-layout.shell{max-width:1620px;width:calc(100% - 42px);display:grid;grid-template-columns:232px minmax(0,1fr);gap:17px;align-items:start;margin:0 auto;padding-top:15px;transition:grid-template-columns .17s ease}\n.es-app-layout.es-is-collapsed{grid-template-columns:65px minmax(0,1fr)}\n.es-app-layout .es-main-pane{min-width:0;width:100%;margin:0;max-width:none;min-height:calc(100vh - 235px)}\n.es-sidebar{background:linear-gradient(153deg,#f7f2ff 0%,#fff 47%,#f6f9ff 100%);border:1px solid #ddd9f7;box-shadow:0 7px 27px #29126c0d;border-radius:17px;position:sticky;top:13px;height:calc(100dvh - 26px);min-height:400px;max-height:940px;display:flex;flex-direction:column;gap:6px;padding:12px 10px;z-index:45;min-width:0}\n.es-sidebar-top{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:0 4px 10px}\n.es-sidebar-title{font-size:16px;font-weight:900;letter-spacing:.55px;color:#5131b5;white-space:nowrap}\n.es-side-toggle{display:grid;place-items:center;background:#f0eaff;border:1px solid #d8cbff;color:#5e27d8;border-radius:10px;min-height:39px;min-width:39px;padding:6px;flex-shrink:0}\n.es-side-toggle:hover{background:#e8dfff}\n.es-side-nav{display:flex;flex-direction:column;gap:5px;min-height:0;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#ddd5f5 transparent;padding:2px 2px 8px}\n.es-side-link{min-height:50px;border:1px solid transparent;border-radius:12px;padding:7px 8px;display:flex;align-items:center;gap:10px;color:#283a88;background:transparent;position:relative;font-size:16px;font-weight:750;text-align:left}\n.es-side-link:hover{background:white;border-color:#e6e2f6}\n.es-side-link[aria-current=\"page\"]{background:#eee8ff;color:#5124c2;border-color:#dacdff;box-shadow:0 2px 9px #5a26ba12}\n.es-side-link[aria-current=\"page\"]:before{content:\"\";position:absolute;left:0;top:11px;bottom:11px;width:3px;border-radius:4px;background:#7434ec}\n.es-side-icon{height:38px;width:38px;flex:0 0 38px;display:grid;place-items:center;border-radius:11px;background:#eee5ff;color:#6b30e0}\n.es-side-link[data-side=\"all\"] .es-side-icon{background:#e3ecff;color:#2562dc}\n.es-side-link[data-side=\"calc\"] .es-side-icon{background:#dff3ff;color:#0081ea}\n.es-side-link[data-side=\"engineering\"] .es-side-icon{background:#fff0dd;color:#ed781f}\n.es-side-link[data-side=\"utility\"] .es-side-icon{background:#dcf8ee;color:#039d7c}\n.es-side-link[data-side=\"mytools\"] .es-side-icon{background:linear-gradient(135deg,#985dff,#6924e3);color:#fff}\n.es-side-link[data-side=\"ecosystem\"] .es-side-icon{background:linear-gradient(145deg,#e6e1ff,#d9e9ff);color:#6044db}\n.es-side-name{flex:1;min-width:0;line-height:1.25;overflow-wrap:anywhere}\n.es-side-count{display:grid;place-items:center;min-width:29px;min-height:29px;padding:1px 5px;font-size:16px;font-weight:850;border-radius:50%;background:#e7ecff;color:#344da3;flex-shrink:0}\n.es-side-divider{height:1px;background:#e4e4f4;margin:8px 5px}\n.es-sidebar-bottom{display:grid;gap:4px;border-top:1px solid #e0e4f6;padding:10px 2px 0;margin-top:auto}\n.es-sidebar-bottom .es-side-link{min-height:47px}\n.es-is-collapsed .es-sidebar{padding-inline:7px}\n.es-is-collapsed .es-sidebar-top{padding:0 0 10px;justify-content:center}\n.es-is-collapsed .es-sidebar-title,.es-is-collapsed .es-side-name,.es-is-collapsed .es-side-count{display:none}\n.es-is-collapsed .es-side-link{justify-content:center;padding:5px 2px;min-height:49px}\n.es-is-collapsed .es-side-icon{height:40px;width:40px;flex-basis:40px}\n.es-is-collapsed .es-side-nav{padding-inline:0}\n.es-is-collapsed .es-sidebar-bottom{padding:10px 0 0}\n.es-is-collapsed .es-side-link:hover:after,.es-is-collapsed .es-side-link:focus-visible:after{content:attr(data-label);position:absolute;z-index:100;left:calc(100% + 12px);top:50%;transform:translateY(-50%);background:#25145c;color:#fff;white-space:nowrap;min-width:max-content;padding:9px 12px;border-radius:9px;box-shadow:0 7px 18px #240b6540;font-size:16px;font-weight:650;pointer-events:none}\n.es-app-layout .page-home{padding-top:0}\n.es-feature{height:157px;min-height:157px;display:grid;grid-template-columns:minmax(0,1fr) 34%;overflow:hidden;border:1px solid #d6def6;border-radius:17px;background:linear-gradient(110deg,#f3f7ff 0%,#e8f3ff 55%,#c4bcff 100%);position:relative;margin:0 0 16px}\n.es-feature-copy{padding:16px 12px 12px 22px;position:relative;z-index:2;min-width:0}\n.es-feature-eyebrow{font-size:16px;color:#1835b6;font-weight:850;letter-spacing:.75px;margin:0 0 4px}\n.es-feature h1{font-size:34px;line-height:1.08;margin:0 0 4px;color:#071faa;font-weight:950;letter-spacing:-1px}\n.es-feature h1 strong{color:#ffcc00}\n.es-feature .es-feature-tag{margin:0;color:#172e84;font-size:16px;line-height:1.27;font-weight:800}\n.es-feature .es-feature-meta{margin:5px 0 0;color:#4b6092;font-size:16px;line-height:1.3}\n.es-feature-art{position:relative;overflow:hidden;background:linear-gradient(120deg,#d4eaff,#8065ed)}\n.es-feature-art img{height:100%;width:100%;object-fit:cover;object-position:center}\n.es-feature-link{display:inline-flex;align-items:center;gap:7px;margin-top:6px;color:#5123bd;font-size:16px;font-weight:850;text-decoration:underline;text-underline-offset:3px}\n.es-directory{margin:0 0 15px;scroll-margin-top:12px}\n.es-directory-header{display:flex;align-items:center;gap:12px;justify-content:space-between;margin:0 0 12px;flex-wrap:wrap}\n.es-directory-title-row{display:flex;align-items:center;gap:10px;min-width:0}\n.es-directory-title-row .es-directory-emblem{width:45px;height:45px;display:grid;place-items:center;border-radius:13px;background:linear-gradient(140deg,#9260ff,#5925d9);color:white;flex:0 0 45px}\n.es-directory-title{margin:0;color:#172d99;font-size:21px;line-height:1.22;font-weight:900}\n.es-directory-sub{margin:2px 0 0;font-size:16px;color:#61749a;line-height:1.23}\n.es-directory-total{font-size:16px;font-weight:850;color:#5128ca;background:#efeaff;border-radius:11px;padding:6px 10px;flex-shrink:0}\n.es-catalog-toolbar{display:flex;align-items:center;gap:8px;margin-left:auto}\n.es-catalog-toolbar .search-box{width:min(280px,31vw);min-height:43px}\n.es-catalog-toolbar .view-toggle{flex-shrink:0}\n.es-directory-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px;align-items:stretch}\n.es-directory-grid.es-view-list{grid-template-columns:repeat(2,minmax(0,1fr))}\n.es-directory-grid .tool-card{min-width:0;min-height:82px;padding:9px 9px;border-radius:13px}\n.es-directory-grid .tool-link{gap:9px}\n.es-directory-grid .tool-tile{height:42px;width:42px;border-radius:11px;flex-shrink:0}\n.es-directory-grid .tool-names b{font-size:16px;line-height:1.2}\n.es-directory-grid .tool-names small{font-size:16px;line-height:1.22}\n.es-directory-grid .star-btn{width:27px;min-width:27px;height:36px}\n.es-directory-grid .mytools-empty{grid-column:1/-1;min-height:188px;padding:26px 18px}\n.es-directory-grid .es-no-matches{grid-column:1/-1;border:1px dashed #d6c9ff;background:#faf8ff;color:#586a98;border-radius:13px;padding:32px;text-align:center}\n.es-mini-promo{border:1px solid #ded9ff;background:linear-gradient(105deg,#f7f1ff,#f3f8ff);border-radius:14px;padding:11px 16px;display:flex;align-items:center;gap:12px;margin-bottom:17px;color:#4e3997}\n.es-mini-promo .svg-icon{color:#7936e9}\n.es-mini-promo strong{color:#261d92}\n.es-mini-promo a{color:#5729c7;font-weight:800;white-space:nowrap;margin-left:auto}\n.es-static-page{padding:3px 0 20px;display:grid;gap:14px}\n.es-static-intro{display:flex;align-items:center;gap:14px;padding:19px 22px;border:1px solid #dedffa;border-radius:16px;background:linear-gradient(112deg,#f3f1ff,#f1f7ff)}\n.es-static-intro-icon{display:grid;place-items:center;flex-shrink:0;width:55px;height:55px;border-radius:14px;background:linear-gradient(135deg,#8650ee,#4838cb);color:white}\n.es-static-intro h1{margin:0;color:#18299c;font-weight:900;font-size:28px}\n.es-static-intro p{margin:3px 0 0;color:#566b9d;font-size:16px}\n.es-system-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}\n.es-system-card{border:1px solid #dde3f8;border-radius:16px;background:#fff;display:flex;flex-direction:column;gap:12px;padding:19px;min-width:0;box-shadow:0 4px 17px #1b23820b}\n.es-system-head{display:flex;align-items:center;gap:12px}\n.es-system-logo{height:56px;width:56px;border-radius:15px;display:grid;place-items:center;background:linear-gradient(125deg,#e3ecff,#e8dfff);color:#5225d7;flex:0 0 56px;overflow:hidden}\n.es-system-logo img{height:100%;width:100%;object-fit:contain}\n.es-system-card h2{font-size:21px;line-height:1.2;color:#142a99;margin:0}\n.es-system-card p{color:#566b95;font-size:16px;line-height:1.5;margin:0}\n.es-system-link{align-self:flex-start;display:inline-flex;align-items:center;gap:7px;background:#f1ecff;border:1px solid #e2d5ff;color:#5127ca;padding:9px 13px;border-radius:10px;font-size:16px;font-weight:800}\n.es-system-link:hover{background:#e5dcff}\n.es-system-pending{font-size:16px;color:#697ca1}\n.es-portable-guide{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}\n.es-portable-guide .tool-box{min-height:0}\n.es-portable-guide h2{font-size:19px}\n.es-portable-guide p,.es-portable-guide li{font-size:16px;line-height:1.55}\n.es-portable-guide ul{padding-left:21px;margin:8px 0}\n.es-tool-actions{display:flex;gap:8px;align-items:center;margin-left:auto;flex-wrap:wrap;justify-content:flex-end}\n.es-tool-actions .button{min-height:43px;padding:8px 13px;margin-left:0!important}\n.es-tool-actions .es-portable-button{background:#edf2ff;color:#194ab2;border:1px solid #cddaff}\n.es-tool-actions .es-portable-button:hover{background:#e5ebff}\n.es-tool-actions .es-portable-button.is-loading{opacity:.75}\n.es-modal-layer{position:fixed;inset:0;background:#0c123677;display:grid;place-items:center;padding:20px;z-index:2100}\n.es-modal{width:min(470px,100%);background:#fff;border:1px solid #d8caff;box-shadow:0 24px 70px #15104b55;border-radius:19px;padding:23px;display:grid;gap:14px}\n.es-modal-icon{display:grid;place-items:center;height:48px;width:48px;border-radius:13px;background:#e9e1ff;color:#6331de}\n.es-modal h2{font-size:21px;margin:0;color:#1c268f}\n.es-modal p{font-size:16px;margin:0;color:#50628b;line-height:1.55}\n.es-modal-actions{display:flex;justify-content:flex-end}\n.es-mobile-backdrop{display:none}\n.site-header .main-nav [data-nav=\"explore\"]{display:none}\n.site-header .mobile-menu{display:none!important}\n@media(min-width:1450px){.es-directory-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}\n@media(max-width:1220px) and (min-width:951px){.es-app-layout.shell{grid-template-columns:206px minmax(0,1fr);gap:12px}.es-app-layout.es-is-collapsed{grid-template-columns:65px minmax(0,1fr)}.es-directory-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}\n@media(max-width:1080px){\n .es-app-layout.shell,.es-app-layout.es-is-collapsed{display:block;width:calc(100% - 28px);padding-top:12px}\n .es-app-layout .es-main-pane{width:100%}\n .es-sidebar{position:fixed;top:0;left:0;bottom:0;height:100dvh;min-height:0;max-height:none;width:min(325px,calc(100vw - 52px));padding:15px 12px;border-radius:0 18px 18px 0;transform:translateX(-105%);transition:transform .2s;box-shadow:0 0 0 1px #ddd9f7,10px 0 40px #0e0c3540;z-index:1300}\n .es-sidebar.es-mobile-open{transform:translateX(0)}\n .es-is-collapsed .es-sidebar{padding:15px 12px}\n .es-is-collapsed .es-sidebar-title,.es-is-collapsed .es-side-name,.es-is-collapsed .es-side-count{display:block}\n .es-is-collapsed .es-sidebar-top{justify-content:space-between;padding:0 4px 10px}\n .es-is-collapsed .es-side-link{justify-content:flex-start;padding:7px 8px}\n .es-is-collapsed .es-sidebar-bottom{padding:10px 2px 0}\n .es-mobile-backdrop.es-show{position:fixed;inset:0;z-index:1250;background:#100b3e88;display:block}\n .site-header .main-nav{display:none!important}\n .site-header .mobile-menu{display:grid!important;margin-left:auto;place-items:center;order:10}\n .es-directory-grid{grid-template-columns:repeat(3,minmax(0,1fr))}\n .es-feature{grid-template-columns:minmax(0,1fr) 40%}\n .es-system-grid{grid-template-columns:repeat(2,minmax(0,1fr))}\n}\n@media(max-width:690px){\n .es-directory-grid,.es-directory-grid.es-view-list{grid-template-columns:repeat(2,minmax(0,1fr))}\n .es-feature{height:auto;min-height:145px;grid-template-columns:1fr}\n .es-feature-copy{padding:14px 17px}\n .es-feature h1{font-size:31px}\n .es-feature-art{display:none}\n .es-directory-header{align-items:stretch}\n .es-catalog-toolbar{width:100%;margin-left:0}\n .es-catalog-toolbar .search-box{flex:1;width:auto;min-width:0}\n .es-system-grid,.es-portable-guide{grid-template-columns:1fr}\n .es-mini-promo{flex-wrap:wrap}\n .es-mini-promo a{margin-left:0}\n .tool-heading .es-tool-actions{margin-left:0;width:100%;justify-content:flex-start}\n}\n@media(max-width:480px){\n .es-directory-grid,.es-directory-grid.es-view-list{grid-template-columns:1fr}\n .es-feature-eyebrow,.es-feature .es-feature-tag,.es-feature .es-feature-meta{font-size:16px}\n .es-feature-link{font-size:16px}\n .es-directory-title{font-size:19px}\n .es-directory-sub{font-size:16px}\n .es-static-intro{padding:15px}\n .es-static-intro h1{font-size:24px}\n .es-tool-actions .button{font-size:16px}\n}\n@media(prefers-reduced-motion:reduce){.es-app-layout.shell,.es-sidebar{transition:none}}\n";
themeSheet.textContent += "\n/* Tab Hướng dẫn sử dụng cạnh tên tool (tool khai báo guide:true và export GUIDE) */\n.es-tool-title{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.es-tool-title h1{margin:0}\n.es-guide-btn{display:inline-flex;align-items:center;gap:6px;border:1px solid #cdb8fb;background:#fff;color:#5a20db;border-radius:10px;padding:6px 14px;font:inherit;font-size:15.5px;font-weight:800;cursor:pointer}\n.es-guide-btn:hover{background:#f4efff}.es-guide-btn[aria-expanded=\"true\"]{background:#5a20db;color:#fff;border-color:#5a20db}\n.es-tool-guide{margin:0 0 14px;font-size:15px;line-height:1.55;color:#24305a}.es-tool-guide[hidden]{display:none}\n.es-tool-guide h3{margin:10px 0 4px;font-size:16.5px;color:#4d21b8}.es-tool-guide h3:first-child{margin-top:0}.es-tool-guide ol,.es-tool-guide ul{margin:2px 0 6px;padding-left:22px}.es-tool-guide li{margin:3px 0}\n";

// Homepage dashboard: hero, tool catalog, and decorative footer artwork.
// No changes to the 16 tool modules, app state, mathematical engines, or the normal collapsed tool sidebar.
themeSheet.textContent += `
/* Sidebar stays visible on homepage and category screens, as in the user's current screenshot. */
body.es-catalog-mode .es-app-layout.shell{display:grid;grid-template-columns:232px minmax(0,1fr);gap:17px;max-width:1620px;width:calc(100% - 42px);padding-top:12px;margin:0 auto}
body.es-catalog-mode .es-sidebar{display:flex}
body.es-catalog-mode .es-app-layout.es-is-collapsed{grid-template-columns:65px minmax(0,1fr)}
body.es-catalog-mode .es-app-layout .es-main-pane{min-width:0;width:100%;margin:0;max-width:none}
body.es-catalog-mode .site-header .main-nav [data-nav="explore"]{display:none}
body.es-catalog-mode .site-header .mobile-menu{display:none!important}
/* All three dashboard regions remain visible inside a laptop viewport. Only tool cards scroll. */
.es-dashboard-layout{height:clamp(575px,calc(100dvh - 145px),830px);display:grid;grid-template-rows:clamp(210px,28vh,258px) minmax(0,1fr) clamp(120px,16.5vh,150px);gap:12px;min-width:0;min-height:0}
.es-dashboard-layout .hero{height:100%;min-height:0;margin:0;grid-template-columns:minmax(0,1.29fr) minmax(0,.98fr) minmax(235px,.9fr);border-radius:17px}
.es-dashboard-layout .hero-copy{padding:16px 6px 13px 22px;min-width:0;display:flex;flex-direction:column;justify-content:center}
.es-dashboard-layout .eyebrow{font-size:16px;letter-spacing:1px;line-height:1.2;margin:0 0 5px}
.es-dashboard-layout .hero-title{font-size:clamp(36px,2.95vw,47px);line-height:1;letter-spacing:-1.8px;white-space:nowrap}
.es-dashboard-layout .hero-subtitle{font-size:clamp(16px,1.3vw,19px);line-height:1.25;margin:7px 0 5px;white-space:normal}
.es-dashboard-layout .hero-description{font-size:16px;line-height:1.25}
.es-dashboard-layout .hero-perks{margin-top:10px;gap:5px 11px;font-size:16px;line-height:1.2}
.es-dashboard-layout .hero-perks span{gap:6px;white-space:normal}
.es-dashboard-layout .check-dot{width:20px;height:20px;flex:0 0 20px}
.es-dashboard-layout .hero-art{min-height:0;height:100%}
.es-dashboard-layout .hero-art img{width:114%;height:100%;object-fit:cover}
.es-dashboard-layout .hero-cta{display:flex;grid-column:auto;padding:15px 15px 13px;min-width:0;gap:3px;justify-content:space-between}
.es-dashboard-layout .hero-cta h2{font-size:19px;line-height:1.18;margin:0 0 8px}
.es-dashboard-layout .hero-cta p{font-size:16px;line-height:1.23;margin:4px 0;gap:7px}
.es-dashboard-layout .hero-cta p svg{width:17px;height:17px}
.es-dashboard-layout .hero-cta .button{min-height:40px;padding:8px 12px;font-size:16px;margin-top:6px;white-space:nowrap}
/* Toolbar does NOT scroll; rows scroll below it without moving either banner. */
.es-dashboard-layout .es-directory{display:flex;flex-direction:column;min-height:0;min-width:0;margin:0;overflow:hidden}
.es-dashboard-layout .es-directory-header{flex:0 0 auto;min-height:49px;margin:0 0 7px;gap:8px}
.es-dashboard-layout .es-directory-title-row{gap:9px}
.es-dashboard-layout .es-directory-title-row .es-directory-emblem{height:40px;width:40px;flex-basis:40px;border-radius:11px}
.es-dashboard-layout .es-directory-title{font-size:19px;line-height:1.15}
.es-dashboard-layout .es-directory-sub{font-size:16px;line-height:1.2;margin-top:2px}
.es-dashboard-layout .es-directory-total{font-size:16px;padding:4px 7px}
.es-dashboard-layout .es-catalog-toolbar{gap:7px}
.es-dashboard-layout .es-catalog-toolbar .search-box{min-height:39px;width:min(260px,26vw)}
.es-dashboard-layout .es-directory-grid{grid-auto-rows:max-content;flex:1 1 auto;min-height:0;min-width:0;overflow-y:auto;overscroll-behavior-y:contain;scrollbar-gutter:stable;scrollbar-width:thin;scrollbar-color:#ab95df #edf1ff;align-content:start;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;padding:1px 6px 5px 0}
.es-dashboard-layout .es-directory-grid::-webkit-scrollbar{width:9px}
.es-dashboard-layout .es-directory-grid::-webkit-scrollbar-track{background:#edf1ff;border-radius:9px}
.es-dashboard-layout .es-directory-grid::-webkit-scrollbar-thumb{background:#af9be4;border:2px solid #edf1ff;border-radius:9px}
.es-dashboard-layout .es-directory-grid.es-view-list{grid-template-columns:repeat(2,minmax(0,1fr))}
.es-dashboard-layout .es-directory-grid .tool-card{min-height:77px;height:auto;padding:7px 8px;align-self:stretch}
.es-dashboard-layout .es-directory-grid .tool-tile{height:39px;width:39px;flex-basis:39px}
.es-dashboard-layout .es-directory-grid .tool-tile .svg-icon{width:23px;height:23px}
.es-dashboard-layout .es-directory-grid .tool-names b{font-size:16px}
.es-dashboard-layout .es-directory-grid .tool-names small{font-size:16px;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
.es-dashboard-layout .es-directory-grid .mytools-empty{min-height:160px}
/* Decorative artwork stays in the lower fixed region. */
.es-dashboard-layout .portable-strip{height:100%;min-height:0;margin:0;display:grid;grid-template-columns:minmax(172px,.85fr) minmax(230px,1.25fr) minmax(110px,.58fr) minmax(170px,.72fr);align-items:center;gap:12px;padding:12px 17px;border-radius:17px;overflow:hidden}
.es-dashboard-layout .portable-stripe{flex:none;min-width:0;gap:9px}
.es-dashboard-layout .win-badge{width:65px;height:65px;flex:0 0 65px}
.es-dashboard-layout .win-badge svg{width:36px;height:36px}
.es-dashboard-layout .portable-stripe h3{font-size:22px;margin:0}
.es-dashboard-layout .portable-stripe p{font-size:16px;margin:0}
.es-dashboard-layout .portable-strip .status{font-size:16px;white-space:nowrap}
.es-dashboard-layout .portable-text{min-width:0;max-width:none}
.es-dashboard-layout .portable-text h3{font-size:17px;line-height:1.25;margin:0 0 6px}
.es-dashboard-layout .portable-text p{font-size:16px;line-height:1.3;margin:0}
.es-dashboard-layout .portable-laptop{display:block;max-width:100%;height:100%;max-height:124px;width:100%;object-fit:contain;opacity:.97;mix-blend-mode:screen}
.es-dashboard-layout .portable-actions{min-width:0;width:100%;gap:4px}
.es-dashboard-layout .portable-actions .button{min-height:40px;padding:7px 11px;white-space:nowrap;font-size:16px}
.es-dashboard-layout .portable-actions span{font-size:16px;line-height:1.2}
/* There is no unnecessary scrolling for small categories; the overflow scrollbar appears only when cards exceed the available height. */
@media(min-width:951px) and (max-width:1220px){
 body.es-catalog-mode .es-app-layout.shell{grid-template-columns:206px minmax(0,1fr);gap:12px}
 body.es-catalog-mode .es-app-layout.es-is-collapsed{grid-template-columns:65px minmax(0,1fr)}
 .es-dashboard-layout .hero{grid-template-columns:minmax(0,1.3fr) minmax(0,1fr)}
 .es-dashboard-layout .hero-cta{display:none}
 .es-dashboard-layout .hero-perks{display:flex}
 .es-dashboard-layout .es-directory-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
 .es-dashboard-layout .portable-strip{grid-template-columns:minmax(155px,.95fr) minmax(220px,1.3fr) minmax(160px,.75fr)}
 .es-dashboard-layout .portable-laptop{display:none}
 .es-dashboard-layout .portable-actions .button{white-space:normal}
}
@media(min-width:951px) and (max-height:790px){
 .es-dashboard-layout{grid-template-rows:clamp(205px,28vh,218px) minmax(0,1fr) clamp(119px,17vh,135px);gap:9px}
 .es-dashboard-layout .hero-copy{padding-block:10px}
 .es-dashboard-layout .hero-description{display:none}
 .es-dashboard-layout .hero-perks{margin-top:6px}
 .es-dashboard-layout .hero-cta{padding:11px 13px 10px}
 .es-dashboard-layout .hero-cta h2{font-size:18px;margin-bottom:4px}
 .es-dashboard-layout .hero-cta p{margin:2px 0}
 .es-dashboard-layout .hero-cta .button{min-height:37px;padding:7px}
 .es-dashboard-layout .portable-strip{padding:9px 14px}
 .es-dashboard-layout .portable-laptop{max-height:110px}
}
@media(max-width:1080px){
 body.es-catalog-mode .es-app-layout.shell,body.es-catalog-mode .es-app-layout.es-is-collapsed{display:block;width:calc(100% - 28px);padding-top:12px}
 body.es-catalog-mode .es-sidebar{display:flex}
 body.es-catalog-mode .site-header .main-nav{display:none!important}
 body.es-catalog-mode .site-header .mobile-menu{display:grid!important;margin-left:auto}
 .es-dashboard-layout{height:auto;min-height:0;display:flex;flex-direction:column;gap:14px}
 .es-dashboard-layout .hero{min-height:180px;height:auto;grid-template-columns:minmax(0,1.2fr) minmax(0,.9fr)}
 .es-dashboard-layout .hero-copy{padding:17px}
 .es-dashboard-layout .hero-title{font-size:36px}
 .es-dashboard-layout .hero-cta{display:none}
 .es-dashboard-layout .hero-art{min-height:180px}
 .es-dashboard-layout .es-directory{display:block;overflow:visible}
 .es-dashboard-layout .es-directory-grid{overflow:visible;max-height:none;scrollbar-gutter:auto;grid-template-columns:repeat(3,minmax(0,1fr));padding-right:0}
 .es-dashboard-layout .portable-strip{height:auto;min-height:143px;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr) minmax(0,.7fr);padding:15px}
 .es-dashboard-layout .portable-laptop{display:none}
}
@media(max-width:690px){
 .es-dashboard-layout .hero{display:block}
 .es-dashboard-layout .hero-art{display:none}
 .es-dashboard-layout .hero-title{font-size:34px}
 .es-dashboard-layout .hero-copy{padding:20px}
 .es-dashboard-layout .hero-perks{gap:9px}
 .es-dashboard-layout .es-directory-header{flex-wrap:wrap}
 .es-dashboard-layout .es-catalog-toolbar{width:100%;margin-left:0}
 .es-dashboard-layout .es-catalog-toolbar .search-box{flex:1 1 auto;width:auto}
 .es-dashboard-layout .es-directory-grid,.es-dashboard-layout .es-directory-grid.es-view-list{grid-template-columns:repeat(2,minmax(0,1fr))}
 .es-dashboard-layout .portable-strip{grid-template-columns:1fr;gap:11px}
 .es-dashboard-layout .portable-stripe{gap:13px}
 .es-dashboard-layout .portable-actions{max-width:350px}
}
@media(max-width:480px){
 .es-dashboard-layout .es-directory-grid,.es-dashboard-layout .es-directory-grid.es-view-list{grid-template-columns:1fr}
 .es-dashboard-layout .hero-subtitle{font-size:18px}
}
`;


// Approved responsive and bilingual controls, visual-only styles.
themeSheet.textContent += '\n/* Approved 2026-10-24 improvements: responsive width, viewport-fit, text-brand Hub and language picker. */\n@media(min-width:1081px){\n .shell,.header-inner.shell,.site-footer.shell{max-width:1880px;width:calc(100% - 36px)}\n .es-app-layout.shell,body.es-catalog-mode .es-app-layout.shell{max-width:1880px;width:calc(100% - 36px);grid-template-columns:clamp(280px,18vw,304px) minmax(0,1fr);gap:14px}\n .es-app-layout.es-is-collapsed,body.es-catalog-mode .es-app-layout.es-is-collapsed{grid-template-columns:65px minmax(0,1fr)}\n .es-sidebar{height:calc(100dvh - 105px);min-height:0;max-height:none;top:12px}\n .es-dashboard-layout{height:calc(100dvh - 102px);min-height:515px;max-height:none;grid-template-rows:clamp(184px,22.5vh,214px) minmax(0,1fr) clamp(122px,16.8vh,151px);gap:10px}\n .es-dashboard-layout .es-directory{min-height:0;overflow:hidden}\n .es-dashboard-layout .es-directory-grid{min-height:0;overflow-y:auto;overscroll-behavior:contain}\n .es-dashboard-layout .hero{min-width:0}\n .es-dashboard-layout .hero-cta{min-width:0}\n}\n@media(min-width:1081px) and (max-width:1180px){\n .es-dashboard-layout .hero{grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr)}\n .es-dashboard-layout .hero-cta{display:none}\n .es-dashboard-layout .es-directory-grid{grid-template-columns:repeat(3,minmax(0,1fr))}\n .es-dashboard-layout .portable-strip{grid-template-columns:minmax(155px,.95fr) minmax(210px,1.25fr) minmax(154px,.75fr)}\n .es-dashboard-layout .portable-laptop{display:none}\n}\n@media(min-width:1081px) and (max-height:790px){\n .es-dashboard-layout{grid-template-rows:clamp(176px,22vh,198px) minmax(0,1fr) clamp(118px,16.3vh,132px);gap:9px}\n}\n@media(max-width:1080px){\n .shell,.header-inner.shell,.site-footer.shell{max-width:none;width:calc(100% - 28px)}\n .es-app-layout.shell,body.es-catalog-mode .es-app-layout.shell,body.es-catalog-mode .es-app-layout.es-is-collapsed{display:block;width:calc(100% - 28px);max-width:none}\n .es-sidebar{height:100dvh;min-height:0;max-height:none;top:0}\n .es-dashboard-layout{height:auto;min-height:0}\n .es-language-picker{order:9;margin-left:auto}\n .site-header .mobile-menu{order:10;margin-left:0}\n}\n.es-language-picker{display:flex;align-items:center;gap:2px;padding:3px;border:1px solid #ffffff69;background:#250c9a4d;border-radius:11px;flex-shrink:0}\n.es-language-btn{border:0;border-radius:8px;min-width:38px;min-height:34px;padding:4px 7px;background:transparent;color:#fff;font-size:16px;font-weight:850;line-height:1.2;letter-spacing:.2px}\n.es-language-btn[aria-pressed="true"]{background:#fff;color:#4d21c7;box-shadow:0 2px 7px #2907603a}\n.es-language-btn:hover:not([aria-pressed="true"]){background:#ffffff28}\n.es-language-btn:focus-visible{outline:3px solid #ffdc08;outline-offset:2px}\n.es-hub-intro .es-hub-logo{height:61px;width:61px;flex:0 0 61px;border-radius:13px;background:transparent;overflow:hidden;box-shadow:none;padding:0}\n.es-hub-intro .es-hub-logo img{width:100%;height:100%;object-fit:contain}\n.es-hub-intro h1.es-hub-wordmark{display:flex;align-items:baseline;gap:0;margin:0;color:#071faf;font-family:Inter,"Segoe UI",Arial,sans-serif;font-size:clamp(30px,2.9vw,43px);font-weight:950;letter-spacing:-1.7px;line-height:1.05;white-space:nowrap}\n.es-hub-intro h1.es-hub-wordmark strong{color:#ffd300;font:inherit;letter-spacing:-1.5px}\n .es-restored-landing .hero-subtitle{white-space:normal}\n .es-restored-landing .hero-copy{min-width:0}\n@media(max-width:390px){.brand-wordmark{font-size:20px}.brand-mark{width:38px;height:38px}.header-inner{gap:4px}.es-language-btn{min-width:32px;padding:4px}}\n';

// Brand banner shells: artworks are text-free; all copy, buttons and badges are app-rendered.
// The approved illustration is integrated into a single seamless background, rather than three disconnected panels.
themeSheet.textContent += `
/* Epsilon Blue Soft banner shell v2: decorative image assets ONLY, editable app text. */
.es-dashboard-layout .hero,.es-restored-landing .hero{
 background-color:#eff6ff;
 background-image:url('./assets/images/main-banner.png');
 background-repeat:no-repeat;
 background-position:center center;
 background-size:cover;
 isolation:isolate;
}
.es-dashboard-layout .hero .hero-art,.es-restored-landing .hero .hero-art{
 background:transparent!important;
 overflow:visible;
 min-width:0;
}
.es-dashboard-layout .hero .hero-copy,.es-restored-landing .hero .hero-copy{z-index:2}
.es-dashboard-layout .hero .hero-cta,.es-restored-landing .hero .hero-cta{
 background:linear-gradient(132deg,rgba(6,42,196,.98),rgba(37,39,237,.97))!important;
 border-radius:18px 0 0 18px;
 box-shadow:-8px 0 19px rgba(37,43,173,.09);
 z-index:2;
}
.es-dashboard-layout .hero .hero-cta::before,.es-restored-landing .hero .hero-cta::before{
 background:radial-gradient(ellipse at 95% 3%,rgba(118,182,255,.38),transparent 68%);opacity:1;
}
.es-dashboard-layout .hero .button-yellow,.es-restored-landing .hero .button-yellow{
 border-radius:999px;
 box-shadow:0 4px 15px rgba(11,27,99,.22);
}
.es-dashboard-layout .portable-strip,.es-restored-landing .portable-strip{
 background-color:#4e1fe9;
 background-image:url('./assets/images/footer.png');
 background-repeat:no-repeat;
 background-position:center center;
 background-size:cover;
 isolation:isolate;
}
.es-dashboard-layout .portable-strip::before,.es-restored-landing .portable-strip::before{display:none}
.es-dashboard-layout .portable-strip .button-yellow,.es-restored-landing .portable-strip .button-yellow{
 border-radius:999px;box-shadow:0 5px 15px rgba(6,18,89,.25);
}
.es-dashboard-layout .portable-strip .portable-laptop,.es-restored-landing .portable-strip .portable-laptop{
 object-fit:contain;mix-blend-mode:screen;filter:drop-shadow(0 9px 14px rgba(5,10,73,.40));
}
/* HUB wordmark deliberately follows the existing EPSILON SOFT CSS typography and palette. */
.es-hub-intro h1.es-hub-wordmark{
 color:#0619a9;font-family:Inter,"Segoe UI",Arial,sans-serif;font-weight:900;
 letter-spacing:-1.7px;gap:0;
}
.es-hub-intro h1.es-hub-wordmark strong{color:#ffdc08;letter-spacing:-1.6px;font-weight:900}
.es-hub-intro h1.es-hub-wordmark{gap:6px}
@media(max-width:530px){.es-hub-intro>div{min-width:0}.es-hub-intro h1.es-hub-wordmark{font-size:clamp(19px,5.4vw,26px);flex-wrap:wrap;white-space:normal;letter-spacing:-.6px;gap:2px 6px}}
.es-hub-intro .es-hub-logo img{object-fit:contain}
/* Keep both text and the blue action card inside the approved banner at every laptop height. */
@media(min-width:1081px){
 .es-dashboard-layout{grid-template-rows:clamp(190px,23.4vh,214px) minmax(0,1fr) clamp(124px,16.8vh,151px)}
 .es-dashboard-layout .hero-subtitle{font-size:16px;letter-spacing:-.16px;line-height:1.2}
 .es-dashboard-layout .hero-description{font-size:16px;line-height:1.2}
 .es-dashboard-layout .hero-perks{margin-top:6px;gap:5px 10px;font-size:16px}
 .es-dashboard-layout .hero-cta h2{font-size:18px}
 .es-restored-landing .hero{height:clamp(190px,23.4vh,214px);min-height:0;grid-template-columns:minmax(0,1.24fr) minmax(0,.94fr) minmax(245px,.82fr)}
 .es-restored-landing .hero-copy{padding:11px 8px 10px 20px;display:flex;flex-direction:column;justify-content:center}
 .es-restored-landing .hero .hero-art{min-height:0;height:100%}
 .es-restored-landing .hero .hero-cta{display:flex;grid-column:auto;padding:12px 13px}
 .es-restored-landing .hero .hero-title{font-size:clamp(32px,2.55vw,42px)}
 .es-restored-landing .hero .hero-subtitle{font-size:16px;line-height:1.18;margin:4px 0}
 .es-restored-landing .hero .hero-description{font-size:16px;line-height:1.18}
 .es-restored-landing .hero .hero-perks{margin-top:6px;gap:5px 10px;font-size:16px}
 .es-restored-landing .hero .check-dot{width:19px;height:19px;flex-basis:19px}
 .es-restored-landing .hero .hero-cta h2{font-size:18px}
 .es-restored-landing .hero .hero-cta p{font-size:16px;line-height:1.22;margin:2px 0}
 .es-restored-landing .hero .hero-cta .button{min-height:37px;margin-top:4px;padding:7px 10px}
}
@media(min-width:1081px) and (max-height:790px){
 .es-restored-landing .hero-description{display:none}
 .es-restored-landing .hero .hero-copy{padding-block:7px}
 .es-restored-landing .hero .hero-perks{margin-top:4px}
 .es-restored-landing .hero .hero-cta{padding:8px 10px}
 .es-restored-landing .hero .hero-cta h2{font-size:17px;margin-bottom:3px}
 .es-restored-landing .hero .hero-cta p{margin:1px 0}
 .es-restored-landing .hero .hero-cta .button{min-height:35px;padding:6px 7px}
}
@media(min-width:1081px) and (max-width:1380px){
 .es-restored-landing .hero{grid-template-columns:minmax(0,1.24fr) minmax(0,.94fr) minmax(255px,.82fr)}
}
/* On narrower viewports the illustration stays decorative and copy never overlaps it. */
@media(min-width:1081px) and (max-width:1380px){
 .es-dashboard-layout .hero .hero-copy{padding-left:16px;padding-right:2px;padding-top:9px;padding-bottom:9px}
 .es-dashboard-layout .hero .hero-title{font-size:clamp(31px,2.45vw,38px)}
 .es-dashboard-layout .hero .hero-subtitle{font-size:16px}
 .es-dashboard-layout .hero .hero-description{font-size:16px;line-height:1.16}
 .es-dashboard-layout .hero .hero-perks{gap:4px 8px}
}
@media(max-width:1080px){
 .es-dashboard-layout .hero,.es-restored-landing .hero{background-position:52% center}
}
@media(max-width:690px){
 .es-dashboard-layout .hero,.es-restored-landing .hero{
  background-image:url('./assets/images/main-banner.png');
  background-position:66% center;
  background-size:cover;
 }
}
`;

// 2026-10-24: Approved Epsilon Blue Soft header: purple is dominant; a restrained royal-blue transition.
// Inactive navigation uses soft purple; the current route is white like the approved Home tab.
// Main dashboard, tool cards, banner artwork and tool modules are unchanged.
themeSheet.textContent += `
.site-header{
  background:linear-gradient(103deg,#5103df 0%,#5f1af0 30%,#522ced 58%,#3740eb 76%,#105bf0 100%);
  box-shadow:0 3px 14px rgba(44,23,149,.22);
}
.site-header .header-inner{gap:13px}
.site-header .main-nav{gap:8px}
.site-header .main-nav .nav-link{
  color:#fff;
  background:rgba(156,118,253,.33);
  border:1px solid rgba(240,225,255,.14);
  border-radius:11px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.07);
  transition:background .18s ease,box-shadow .18s ease,color .18s ease;
}
.site-header .main-nav .nav-link:hover:not(.is-active){
  background:rgba(192,158,255,.47);
  box-shadow:0 4px 12px rgba(34,12,120,.11);
}
.site-header .main-nav .nav-link.is-active{
  background:#fff;
  color:#5522cd;
  border-color:#fff;
  box-shadow:0 4px 14px rgba(22,14,101,.18);
}
.site-header .main-nav .nav-link:focus-visible{outline:3px solid #ffdc08;outline-offset:3px}
/* Match the approved four header tabs; Epsilon Blue Hub is still available in the sidebar. */
.site-header .main-nav a[data-nav="explore"]{display:inline-flex!important}
.site-header .main-nav .es-hub-nav{display:none!important}
@media(min-width:1081px) and (max-width:1550px){
 .site-header .brand-wordmark{font-size:clamp(27px,2.15vw,33px)}
 .site-header .brand-mark{width:clamp(48px,3.7vw,57px);height:clamp(48px,3.7vw,57px)}
 .site-header .header-inner{gap:10px}
 .site-header .brand-divider{margin-left:6px}
 .site-header .header-tagline{font-size:clamp(16px,1.06vw,17px)}
 .site-header .main-nav{gap:6px}
 .site-header .main-nav .nav-link{gap:7px;padding:10px 12px;font-size:16px}
}
@media(min-width:1081px) and (max-width:1370px){
 .site-header .brand-divider,.site-header .header-tagline{display:none}
}
@media(min-width:1081px) and (max-width:1175px){
 .site-header .main-nav .nav-link{padding:9px 9px;font-size:16px;gap:5px}
 .site-header .main-nav .nav-link .svg-icon{width:18px;height:18px}
 .site-header .header-inner{gap:8px}
}
@media(max-width:1080px){
 /* Existing mobile menu and language picker remain unchanged. */
 .site-header .main-nav{display:none!important}
}
`;

// 2026-10-24 mobile-only layout repair (visuals and spacing; no module logic changes).
// Keeps both decorative artwork and live HTML text; prevents blank hero-art space on info routes.
themeSheet.textContent += `
@media (max-width:690px) {
  .es-dashboard-layout .hero,.es-restored-landing .hero {
    display:flex!important;flex-direction:column!important;
    height:auto!important;min-height:0!important;
    background-image:linear-gradient(125deg,#f5f8ff 0%,#eff2ff 100%)!important;
    overflow:hidden;
  }
  .es-dashboard-layout .hero .hero-copy,.es-restored-landing .hero .hero-copy {
    padding:17px 17px 13px!important;display:block;flex:0 0 auto;
  }
  .es-dashboard-layout .hero .hero-art,.es-restored-landing .hero .hero-art {
    display:block!important;flex:0 0 154px;
    height:154px!important;min-height:154px!important;
    background:#e8eeff url('./assets/images/hero-laptop.webp') center center/cover no-repeat!important;
    overflow:hidden;
  }
  .es-dashboard-layout .hero .hero-cta,.es-restored-landing .hero .hero-cta {
    display:grid!important;grid-template-columns:minmax(0,1fr)!important;
    gap:8px;align-items:center;padding:12px 16px!important;
    border-radius:0!important;box-shadow:none!important;
  }
  .es-dashboard-layout .hero .hero-cta h2,.es-restored-landing .hero .hero-cta h2 {
    font-size:17px;line-height:1.22;margin:0;text-align:center;
  }
  .es-dashboard-layout .hero .hero-cta p,.es-restored-landing .hero .hero-cta p {display:none}
  .es-dashboard-layout .hero .hero-cta .button,.es-restored-landing .hero .hero-cta .button {
    min-height:40px!important;margin:0!important;padding:8px 12px!important;
    font-size:16px!important;white-space:normal;text-align:center;
  }
  .es-hub-intro {gap:10px;padding:14px 12px;align-items:center;min-width:0}
  .es-hub-intro .es-hub-logo {width:45px;height:45px;flex:0 0 45px;border-radius:9px}
  .es-hub-intro h1.es-hub-wordmark {font-size:clamp(23px,6vw,30px);letter-spacing:-1.1px}
  .es-hub-intro h1.es-hub-wordmark strong {letter-spacing:-1.1px}
  .es-hub-intro>div {min-width:0}
}
@media (max-width:360px) {
  .site-header .header-inner {gap:4px}
  .site-header .brand {gap:5px}
  .site-header .brand-mark {width:34px;height:34px}
  .site-header .brand-wordmark {font-size:19px;letter-spacing:-.95px}
  .site-header .brand-wordmark strong {letter-spacing:-.95px}
  .site-header .es-language-picker {padding:2px;gap:0}
  .site-header .es-language-btn {min-width:30px;min-height:32px;padding:3px}
  .site-header .mobile-menu {width:38px;min-width:38px;height:40px;min-height:40px;flex-shrink:0}
}
`;

// EPSILON SOFT decorative footer: ONLY TWO IMAGES, no text, badge, link or button.
// Asset locations: assets/images/footer.png + assets/images/es-laptop.png.
// Layer separation preserves an angled laptop that projects above the footer's top edge.
themeSheet.textContent += `
.es-dashboard-layout .portable-strip,
.es-restored-landing .portable-strip {
  position:relative;
  display:block;
  padding:0;
  border:0;
  background:none;
  border-radius:17px;
  overflow:visible;
  isolation:isolate;
  z-index:2;
}
.es-dashboard-layout .portable-strip { height:100%; min-height:0; margin:0; }
.es-restored-landing .portable-strip { height:140px; min-height:0; margin:20px 0 24px; }
.es-dashboard-layout .portable-strip::before,
.es-restored-landing .portable-strip::before { display:none; }
/* First image: the complete decorative base, no masks or artificial white space. */
.es-dashboard-layout .portable-strip > img.es-footer-background,
.es-restored-landing .portable-strip > img.es-footer-background {
  position:absolute;
  inset:0;
  display:block;
  width:100%;
  height:100%;
  max-width:none;
  object-fit:fill;
  border-radius:inherit;
  z-index:0;
  pointer-events:none;
}
/* Second image: original transparent laptop, lifted and subtly rotated in perspective. */
.es-dashboard-layout .portable-strip > img.portable-laptop,
.es-restored-landing .portable-strip > img.portable-laptop {
  position:absolute;
  z-index:1;
  display:block;
  box-sizing:border-box;
  width:auto;
  height:calc(100% + 8px);
  min-height:0;
  max-height:none;
  min-width:0;
  max-width:none;
  right:clamp(58px,16.2%,255px);
  bottom:-6px;
  opacity:1;
  object-fit:contain;
  mix-blend-mode:normal;
  transform-origin:50% 82%;
  transform:rotate(2.2deg);
  filter:drop-shadow(0 7px 9px rgba(7,14,63,.22));
  pointer-events:none;
}
@media(max-width:1080px){
  .es-dashboard-layout .portable-strip { height:clamp(120px,14vw,148px); min-height:0; padding:0; }
  .es-dashboard-layout .portable-strip > img.portable-laptop,
  .es-restored-landing .portable-strip > img.portable-laptop { right:clamp(15px,12%,130px); }
}
@media(max-width:690px){
  .es-dashboard-layout .portable-strip,
  .es-restored-landing .portable-strip { height:120px; min-height:0; padding:0; }
  .es-dashboard-layout .portable-strip > img.portable-laptop,
  .es-restored-landing .portable-strip > img.portable-laptop {
    height:calc(100% + 10px);
    right:-2px;
    bottom:-4px;
    transform:rotate(2.2deg);
  }
}
`;

// Two approved hero actions (Cai APP + About/Contact), independent from the two-image footer.
themeSheet.textContent += `
/* Hero action panel: slightly narrower than the previous blue card; no desktop-only controls. */
@media(min-width:1420px){
 .es-dashboard-layout .hero{grid-template-columns:minmax(0,1.30fr) minmax(0,1.03fr) minmax(230px,.8fr)}
 .es-restored-landing .hero{grid-template-columns:minmax(0,1.30fr) minmax(0,1.03fr) minmax(230px,.8fr)}
 .es-dashboard-layout{grid-template-rows:clamp(252px,31vh,284px) minmax(0,1fr) clamp(122px,16.8vh,151px)}
 .es-restored-landing .hero{height:auto;min-height:252px}
}
.es-dashboard-layout .hero .hero-cta,.es-restored-landing .hero .hero-cta{
 display:flex;flex-direction:column;justify-content:space-between;gap:7px;
 padding:13px 15px!important;min-width:0;
}
.es-hero-info{position:relative;z-index:1;min-height:0}
.es-dashboard-layout .hero .hero-cta .es-hero-info h2,.es-restored-landing .hero .hero-cta .es-hero-info h2{font-size:19px;line-height:1.14;margin:0 0 7px}
.es-dashboard-layout .hero .hero-cta .es-hero-info p,.es-restored-landing .hero .hero-cta .es-hero-info p{font-size:16px;line-height:1.2;margin:4px 0;align-items:flex-start;gap:7px}
.es-dashboard-layout .hero .hero-cta .es-hero-info p svg,.es-restored-landing .hero .hero-cta .es-hero-info p svg{height:17px;width:17px;flex:0 0 17px}
.es-hero-actions{display:grid;grid-template-columns:minmax(0,1fr);gap:7px;flex:0 0 auto;position:relative;z-index:1;width:100%;margin-top:auto}
.es-dashboard-layout .hero .hero-cta .es-hero-actions .button,.es-restored-landing .hero .hero-cta .es-hero-actions .button{
 display:flex;align-items:center;justify-content:center;gap:9px;
 margin:0!important;min-height:39px;padding:7px 10px!important;
 border-radius:999px;font-size:16px;line-height:1.2;font-weight:800;white-space:normal;
 text-align:center;box-shadow:0 4px 12px rgba(4,22,91,.22);
}
.es-hero-actions .button svg{width:19px;height:19px;flex:0 0 19px}
.es-dashboard-layout .hero .es-hero-install,.es-restored-landing .hero .es-hero-install{background:#ffda08!important;color:#081a78!important;border:1px solid #ffe879!important}
.es-dashboard-layout .hero .es-hero-about,.es-restored-landing .hero .es-hero-about{background:#fff!important;color:#203bb6!important;border:1px solid #e0e8ff!important}
.es-hero-actions .button:focus-visible{outline:3px solid #ffe25d;outline-offset:3px}
/* Under 1181px: keep both actions visible; the panel becomes a full-width compact row. */
@media (min-width:691px) and (max-width:1419px){
 .es-dashboard-layout{height:auto!important;min-height:0!important;display:flex!important;flex-direction:column!important;gap:12px}
 .es-dashboard-layout .hero,.es-restored-landing .hero{
  display:grid!important;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr)!important;
  min-height:0!important;height:auto!important;overflow:hidden;
 }
 .es-dashboard-layout .hero .hero-cta,.es-restored-landing .hero .hero-cta{
  display:flex!important;grid-column:1/-1;flex-direction:row;align-items:center;justify-content:space-between;
  padding:12px 16px!important;gap:18px;border-radius:0 0 16px 16px!important;
 }
 .es-dashboard-layout .hero .hero-cta .es-hero-info,.es-restored-landing .hero .hero-cta .es-hero-info{flex:1;min-width:0}
 .es-dashboard-layout .hero .hero-cta .es-hero-actions,.es-restored-landing .hero .hero-cta .es-hero-actions{flex:0 0 min(42%,320px);margin:0}
 .es-dashboard-layout .es-directory{min-height:350px}
 .es-dashboard-layout .hero .hero-copy{padding:15px 18px}
 .es-restored-landing .hero .hero-copy{padding:15px 18px}
}
@media (max-width:690px){
 .es-dashboard-layout .hero .hero-cta,.es-restored-landing .hero .hero-cta{display:flex!important;flex-direction:column;gap:9px;padding:12px 16px!important}
 .es-dashboard-layout .hero .hero-cta .es-hero-info h2,.es-restored-landing .hero .hero-cta .es-hero-info h2{font-size:17px;text-align:center;margin:0}
 .es-hero-info p{display:none!important}
 .es-hero-actions{gap:8px}
 .es-dashboard-layout .hero .hero-cta .es-hero-actions .button,.es-restored-landing .hero .hero-cta .es-hero-actions .button{min-height:43px!important;padding:10px!important}
}
/* Informational modal and PWA installation help. All links are fixed safe destinations. */
.es-hero-dialog-layer[hidden]{display:none!important}
.es-hero-dialog-layer{position:fixed;inset:0;z-index:2600;display:grid;place-items:center;padding:14px;background:rgba(10,17,62,.64);backdrop-filter:blur(4px)}
.es-hero-dialog{width:min(760px,100%);max-height:calc(100dvh - 28px);overflow-y:auto;overscroll-behavior:contain;border-radius:21px;border:1px solid #d8dfff;background:#fff;box-shadow:0 25px 75px #0713487a;padding:22px;color:#152c86}
.es-hero-dialog-head{display:flex;align-items:center;gap:12px;margin-bottom:15px}
.es-hero-dialog-emblem{display:grid;place-items:center;flex:0 0 47px;width:47px;height:47px;background:linear-gradient(140deg,#e6e5ff,#d4edff);color:#5224cc;border-radius:13px}
.es-hero-dialog-logo{padding:0;background:transparent!important;border:0;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px #102ca221}
.es-hero-dialog-logo img{display:block;width:100%;height:100%;object-fit:contain}
.es-hero-dialog-title{flex:1;min-width:0;font-size:23px;line-height:1.18;margin:0;color:#11249d;font-weight:850}
.es-hero-dialog-close{display:grid;place-items:center;flex:0 0 39px;width:39px;height:39px;border:1px solid #dfE5ff;border-radius:11px;background:#f4f6ff;color:#3444ae}
.es-hero-dialog-close:hover{background:#eceaff}
.es-hero-intro{margin:0 0 14px;color:#4b5e89;font-size:16px;line-height:1.5}
.es-hero-about-products{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:15px 0}
.es-hero-product{min-width:0;display:flex;flex-direction:column;gap:6px;padding:15px;border-radius:15px;background:linear-gradient(125deg,#f8f9ff,#eef3ff);border:1px solid #e1e7ff}
.es-hero-product strong{display:flex;align-items:center;gap:8px;color:#132aa5;font-size:17px}
.es-hero-product strong .svg-icon{color:#6934de}
.es-hero-product p{margin:0;font-size:16px;line-height:1.45;color:#51648e}
.es-hero-hub-link{display:inline-flex;align-items:center;gap:9px;padding:11px 15px;border-radius:12px;color:#fff!important;background:linear-gradient(110deg,#6624e6,#2943e5);font-size:16px;font-weight:800;max-width:100%}
.es-hero-hub-link:hover{filter:brightness(1.07)}
.es-hero-contact-title{margin:20px 0 9px;color:#11249d;font-size:19px}
.es-hero-contact-links{display:flex;align-items:stretch;gap:9px;flex-wrap:wrap}
.es-hero-contact-links a,.es-hero-contact-links button{display:inline-flex;align-items:center;gap:9px;min-width:0;flex:1 1 205px;overflow-wrap:anywhere;padding:12px 13px;border:1px solid #d8e3ff;background:#f8faff;color:#1c3baa;border-radius:12px;font-size:16px;font-weight:750}
.es-hero-contact-links a:first-child{flex:1.35 1 250px}
.es-hero-contact-links a:hover,.es-hero-contact-links button:hover{background:#eaf0ff}
.es-hero-contact-links a svg,.es-hero-contact-links button svg{color:#6032d7;flex-shrink:0}
.es-hero-contact-links button{appearance:none;text-align:left;cursor:copy;white-space:nowrap}
.es-hero-contact-copy svg:last-child{margin-left:auto;color:#4961b5;opacity:.85}
.es-hero-contact-copy:focus-visible{outline:3px solid #ffcd27;outline-offset:3px}
@media (min-width:1181px) and (max-width:1550px){.es-dashboard-layout .hero .hero-cta .es-hero-info p,.es-restored-landing .hero .hero-cta .es-hero-info p{font-size:16px}}
.es-hero-install-devices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:16px 0}
.es-hero-install-device{background:#f7f9ff;border:1px solid #dee7ff;border-radius:13px;padding:14px}
.es-hero-install-device h3{margin:0 0 7px;color:#102b9b;display:flex;align-items:center;gap:7px;font-size:17px}
.es-hero-install-device p{font-size:16px;line-height:1.48;color:#50628c;margin:0}
.es-hero-install-note{margin:13px 0 0;font-size:16px;color:#637199;line-height:1.45}
@media(max-width:640px){
 .es-hero-dialog{padding:16px;border-radius:16px}
 .es-hero-dialog-title{font-size:20px}
 .es-hero-about-products,.es-hero-install-devices{grid-template-columns:1fr}
 .es-hero-contact-links a,.es-hero-contact-links button{flex-basis:100%}
}
`;

themeSheet.textContent += `
/* Sidebar quick-navigation: the main category link and the disclosure button are independent. */
.es-side-section{min-width:0}
.es-side-parent{position:relative;display:flex;align-items:center;min-width:0;min-height:51px;border:1px solid transparent;border-radius:12px;transition:background .15s,border-color .15s}
.es-side-parent:hover{background:#fff;border-color:#e6e2f6}
.es-side-parent.is-active{background:#eee8ff;border-color:#dacdff;box-shadow:0 2px 9px #5a26ba12;color:#5124c2}
.es-side-parent.is-active:before{content:"";position:absolute;left:0;top:11px;bottom:11px;width:3px;border-radius:4px;background:#7434ec}
.es-side-parent>.es-side-link{flex:1;min-width:0;min-height:49px;border:none!important;box-shadow:none!important;background:transparent!important;padding:5px 0 5px 8px;gap:9px;outline-offset:1px}
.es-side-parent>.es-side-link:before{display:none!important}
.es-side-parent>.es-side-link .es-side-name{min-width:0;font-size:16px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.es-side-parent>.es-side-link .es-side-icon{flex:0 0 38px}
.es-side-parent .es-side-expand{width:28px;height:32px;flex:0 0 28px;margin:0 1px;display:grid;place-items:center;border:none;border-radius:9px;background:transparent;color:#6e59bd;transition:color .18s,background .18s}
.es-side-parent .es-side-expand .svg-icon{transition:transform .19s ease;stroke-width:2.6}
.es-side-parent .es-side-expand[aria-expanded="true"]{background:#e6ddff;color:#5b23db}
.es-side-parent .es-side-expand[aria-expanded="true"] .svg-icon{transform:rotate(180deg)}
.es-side-parent .es-side-expand:hover{background:#e9e1ff;color:#5b23db}
.es-side-parent>.es-side-count{display:grid;place-items:center;margin:0 7px 0 2px;flex:0 0 29px;min-width:29px;min-height:29px;padding:2px;font-size:16px;line-height:1;background:#e7ecff;color:#344da3;text-decoration:none}
.es-side-parent>.es-side-count:hover{background:#d9e1ff}
.es-side-parent [data-side="ecosystem"] .es-side-icon{height:44px;width:44px;flex-basis:44px;background:linear-gradient(145deg,#f0ecff,#e9e6ff);border:1px solid #ddd5ff;border-radius:12px;box-shadow:0 2px 9px #4222c31c;overflow:hidden}
.es-side-parent [data-side="ecosystem"] .es-side-icon img{display:block;width:42px;height:42px;object-fit:contain}
.es-side-children{display:grid;gap:3px;padding:4px 1px 6px 10px;margin:2px 0 7px 25px;border-left:2px solid #ded7ff;animation:es-side-reveal .16s ease-out}
.es-side-children[hidden]{display:none!important}
.es-side-child{display:flex;align-items:flex-start;gap:8px;padding:9px 7px;min-height:36px;border-radius:9px;color:#3c5092;background:transparent;line-height:1.25;font-size:16px;font-weight:650;min-width:0}
.es-side-child .svg-icon{width:17px;height:17px;flex-shrink:0;margin-top:1px;opacity:.9}
.es-side-child span:last-child{min-width:0;overflow-wrap:anywhere}
.es-side-child:hover,.es-side-child:focus-visible{background:#f0ecff;color:#5224c7}
.es-side-child[aria-current="page"]{background:#e9e4ff;color:#4d19c1;font-weight:850}
.es-side-empty{margin:5px 4px 5px 7px;font-size:16px;color:#6c7a9a;line-height:1.45}
@keyframes es-side-reveal{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:translateY(0)}}
@media(min-width:1081px){
 .es-is-collapsed .es-side-parent .es-side-link{justify-content:center;padding:5px 2px}
 .es-is-collapsed .es-side-parent .es-side-expand,.es-is-collapsed .es-side-parent .es-side-count,.es-is-collapsed .es-side-children{display:none!important}
 .es-is-collapsed .es-side-parent>.es-side-link .es-side-icon{height:40px;width:40px;flex-basis:40px}
 .es-is-collapsed .es-side-parent [data-side="ecosystem"] .es-side-icon img{width:39px;height:39px}
}
@media(max-width:1080px){
 .es-is-collapsed .es-side-parent>.es-side-link{justify-content:flex-start;padding:5px 0 5px 8px}
 .es-side-children{margin-left:27px}
}
@media(prefers-reduced-motion:reduce){.es-side-children{animation:none}.es-side-parent .es-side-expand .svg-icon{transition:none}}
`;

// Responsive image/layout repair (2026-10-24): no changes to asset names or business logic.
// At 1081-1419px the main dashboard switches to flex; a percentage height on an
// absolutely-positioned two-image footer resolves to zero. Give it an explicit height.
themeSheet.textContent += `
@media (min-width:1081px) and (max-width:1419px) {
  .es-dashboard-layout .portable-strip.es-footer-banner {
    height:clamp(132px,11.8vw,154px)!important;
    min-height:132px!important;
    flex:0 0 auto;
    width:100%;
  }
  /* No artificial 350px block beneath a single row of favourite tools. */
  .es-dashboard-layout .es-directory {
    min-height:0!important;
    flex:0 1 auto;
  }
  .es-dashboard-layout .es-directory-grid {
    flex:0 1 auto;
    min-height:0;
    max-height:min(430px,47dvh);
    overflow-y:auto;
  }
}
@media (min-width:691px) and (max-width:1080px) {
  .es-dashboard-layout .es-directory {min-height:0!important}
}
/* 1260-1419px: enough room for the proper three-column banner.
   Keep the illustration between copy and CTA instead of moving the CTA on top
   of the whole illustration.  Smaller tablet widths retain the stacked layout. */
@media (min-width:1260px) and (max-width:1419px) {
  .es-dashboard-layout .hero,.es-restored-landing .hero {
    display:grid!important;
    height:clamp(254px,31vh,282px)!important;
    min-height:0!important;
    grid-template-columns:minmax(0,1.24fr) minmax(0,.84fr) minmax(278px,.90fr)!important;
    align-items:stretch;
  }
  .es-dashboard-layout .hero .hero-copy,
  .es-restored-landing .hero .hero-copy {
    grid-column:1;
    grid-row:1;
    padding:12px 5px 12px 18px;
    min-width:0;
  }
  .es-dashboard-layout .hero .hero-art,
  .es-restored-landing .hero .hero-art {
    display:block!important;
    grid-column:2;
    grid-row:1;
    height:auto;
    min-height:0;
  }
  .es-dashboard-layout .hero .hero-cta,
  .es-restored-landing .hero .hero-cta {
    grid-column:3!important;
    grid-row:1!important;
    align-items:stretch!important;
    flex-direction:column!important;
    justify-content:space-between!important;
    gap:5px!important;
    border-radius:16px 0 0 16px!important;
    padding:11px 12px!important;
    min-width:0;
  }
  .es-dashboard-layout .hero .hero-cta .es-hero-info,
  .es-restored-landing .hero .hero-cta .es-hero-info {flex:0 1 auto!important;min-width:0}
  .es-dashboard-layout .hero .hero-cta .es-hero-actions,
  .es-restored-landing .hero .hero-cta .es-hero-actions {
    flex:0 0 auto!important;
    width:100%;
    margin-top:auto;
  }
  .es-dashboard-layout .hero .hero-cta .es-hero-info p,
  .es-restored-landing .hero .hero-cta .es-hero-info p {
    line-height:1.14;
    font-size:16px;
    margin:3px 0;
  }
  .es-dashboard-layout .hero .hero-perks {gap:6px 9px}
}
`;


// Mobile-only category rail: pinned My tools + horizontally swipeable app folders.
// Desktop sidebar, tool modules, data and footer remain unchanged.
themeSheet.textContent += `
.es-mobile-rail{display:none}
@media(orientation:portrait){
 .site-header .mobile-menu,body.es-catalog-mode .site-header .mobile-menu{display:none!important}
 .es-sidebar,body.es-catalog-mode .es-sidebar,.es-mobile-backdrop{display:none!important}
 .es-app-layout.shell,body.es-catalog-mode .es-app-layout.shell,
 body.es-catalog-mode .es-app-layout.es-is-collapsed{padding-top:7px}
 .es-mobile-rail{
   display:block;position:sticky;top:0;z-index:110;
   margin:0 0 11px;padding:7px 6px;
   border:1px solid #d9defb;border-radius:17px;
   background:linear-gradient(125deg,rgba(250,247,255,.97),rgba(246,249,255,.98));
   box-shadow:0 4px 16px rgba(43,34,140,.10);
   backdrop-filter:blur(13px);-webkit-backdrop-filter:blur(13px);
 }
 .es-mobile-rail-main{display:flex;align-items:stretch;gap:6px;min-width:0}
 .es-mobile-rail-fixed{flex:0 0 100px;min-width:100px;z-index:2;position:relative}
 .es-mobile-rail-scroll{
   flex:1 1 auto;min-width:0;display:flex;align-items:stretch;gap:5px;
   overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;
   scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch;
   scrollbar-width:none;padding:0 1px 2px 0;
 }
 .es-mobile-rail-scroll::-webkit-scrollbar{display:none}
 .es-mobile-folder{
   min-width:0;position:relative;flex:0 0 92px;height:77px;
   background:#fff;border:1px solid #e2e7f8;border-radius:12px;
   box-shadow:0 1px 3px rgba(28,42,114,.035);scroll-snap-align:start;
   transition:background .15s,border-color .15s;
 }
 .es-mobile-rail-fixed .es-mobile-folder{
   width:100%;height:77px;border-color:#d4c6ff;
   background:linear-gradient(150deg,#efe6ff,#f7f3ff)
 }
 .es-mobile-folder.is-active{background:#eae5ff;border-color:#9f7bfc;box-shadow:inset 0 0 0 1px #b9a0ff}
 .es-mobile-folder-link{
   display:flex;flex-direction:column;align-items:center;justify-content:center;
   width:100%;height:100%;gap:4px;
   padding:6px 3px 4px;color:#1a2986;
   text-align:center;min-width:0;
 }
 .es-mobile-folder-icon{
   display:grid;place-items:center;width:32px;height:32px;flex:0 0 32px;
   border-radius:10px;background:#e8efff;color:#405deb;
 }
 .es-mobile-folder[data-mobile-section="mytools"] .es-mobile-folder-icon{background:linear-gradient(145deg,#955aff,#6529da);color:#fff}
 .es-mobile-folder[data-mobile-section="calc"] .es-mobile-folder-icon{background:#dceeff;color:#0968d3}
 .es-mobile-folder[data-mobile-section="engineering"] .es-mobile-folder-icon{background:#fff0de;color:#ed7216}
 .es-mobile-folder[data-mobile-section="utility"] .es-mobile-folder-icon{background:#dbf8ec;color:#069c7d}
 .es-mobile-folder[data-mobile-section="ecosystem"] .es-mobile-folder-icon{background:transparent}
 .es-mobile-folder-icon img{width:32px;height:32px;object-fit:contain}
 .es-mobile-folder-icon .svg-icon{width:22px;height:22px}
 .es-mobile-folder-label{
   width:100%;display:-webkit-box;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:2;
   white-space:normal;overflow-wrap:anywhere;font-weight:750;font-size:16px;line-height:1.15;
 }
 .es-mobile-folder-count{
   position:absolute;left:7px;top:5px;background:#fff;color:#6024d6;
   font-size:16px;line-height:1.2;min-width:16px;padding:2px 3px;border-radius:8px;
   box-shadow:0 1px 4px #4726c31b;font-weight:850;
 }
 .es-mobile-folder-expand{
   position:absolute;right:2px;top:4px;display:grid;place-items:center;
   width:26px;height:27px;padding:0;color:#6731cb;
   background:transparent;border:0;border-radius:9px;
 }
 .es-mobile-folder-expand:hover,.es-mobile-folder-expand[aria-expanded="true"]{background:#e8dcff}
 .es-mobile-folder-expand[aria-expanded="true"] .svg-icon{transform:rotate(180deg)}
 .es-mobile-folder-expand .svg-icon{width:17px;height:17px;transition:transform .15s}
 .es-mobile-rail-drawer{
   margin:8px 1px 1px;border-radius:12px;border:1px solid #d9dff8;
   background:#fff;box-shadow:0 3px 12px rgba(31,36,120,.07);
   padding:9px;
 }
 .es-mobile-rail-drawer[hidden]{display:none!important}
 .es-mobile-rail-drawer-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 1px 9px;
   font-size:16px;font-weight:850;color:#241a94}
 .es-mobile-rail-drawer-head .svg-icon{width:17px;height:17px;vertical-align:-3px;margin-right:5px}
 .es-mobile-rail-drawer-close{display:grid;place-items:center;width:30px;height:30px;flex:0 0 30px;
   border:0;border-radius:9px;background:#f3f0ff;color:#6239d2}
 .es-mobile-rail-drawer-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;
   max-height:min(35dvh,250px);overflow-y:auto;overscroll-behavior:contain}
 .es-mobile-rail-drawer-grid .es-side-child{min-width:0;min-height:42px;padding:7px 8px;display:flex;
   align-items:center;gap:7px;border:1px solid #e5eafd;border-radius:10px;background:#fafbff;
   font-size:16px;font-weight:650;color:#253889;line-height:1.25}
 .es-mobile-rail-drawer-grid .es-side-child .svg-icon{width:18px;height:18px;flex:0 0 18px;color:#5b3cde}
 .es-mobile-rail-drawer-grid .es-side-child span{min-width:0;overflow-wrap:anywhere}
 .es-mobile-rail-drawer-grid .es-side-child[aria-current="page"]{background:#ece7ff;border-color:#c6b3ff}
 .es-mobile-rail-drawer-grid .es-side-empty{grid-column:1/-1;margin:4px 2px 6px;font-size:16px;color:#53668e}
}
@media(max-width:360px){
 .es-mobile-rail{padding:6px 5px}
 .es-mobile-rail-main{gap:5px}
 .es-mobile-rail-fixed{flex-basis:91px;min-width:91px}
 .es-mobile-folder{flex-basis:88px;height:73px}
 .es-mobile-rail-fixed .es-mobile-folder{height:73px}
 .es-mobile-folder-label{font-size:16px}
 .es-mobile-rail-scroll{gap:4px}
}
@media(prefers-reduced-motion:reduce){.es-mobile-folder-expand .svg-icon{transition:none}}
`;


// Epsilon Blue Hub: category -> JSON-driven products. No extra image assets.
themeSheet.textContent += `
.es-hub-intro .es-hub-group-icon{background:linear-gradient(140deg,#f1e6ff,#e7d8ff);color:#5d2bd2;border-radius:13px;width:52px;height:52px;flex:0 0 52px}
.es-hub-intro #es-hub-group-heading{font-size:clamp(24px,3vw,32px);line-height:1.2;color:#18299c}
.es-hub-families{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;align-items:stretch}
.es-hub-families.is-single{grid-template-columns:minmax(0,1fr);max-width:820px;margin-inline:auto}
.es-hub-family-card{position:relative;display:flex;flex-direction:column;gap:16px;min-width:0;min-height:230px;padding:23px 25px;border-radius:20px;border:1px solid #d9def9;background:linear-gradient(125deg,#fff 18%,#f2f4ff 100%);box-shadow:0 9px 25px rgba(29,32,116,.055);color:#142994;overflow:hidden;transition:transform .16s,box-shadow .16s,border-color .16s}
.es-hub-family-card:hover{border-color:#bcaaf9;box-shadow:0 14px 32px rgba(47,35,139,.12);transform:translateY(-2px)}
.es-hub-family-card[data-family="edu"]{background:linear-gradient(135deg,#ffffff,#f5edff 90%)}
.es-hub-family-main{display:flex;align-items:center;gap:14px;min-width:0}
.es-hub-family-icon{width:64px;height:64px;flex:0 0 64px;display:grid;place-items:center;border-radius:17px;background:#e9dcff;color:#6429d0}
.es-hub-family-icon svg{width:34px;height:34px}
.es-hub-family-heading{min-width:0}
.es-hub-family-heading h2{font-size:24px;font-weight:900;letter-spacing:-.6px;margin:0;line-height:1.18;display:flex;align-items:baseline;gap:6px;flex-wrap:wrap}
.es-hub-family-heading h2 .es-hub-family-brand{color:#142994}
.es-hub-family-heading h2 .es-hub-family-branch{color:var(--yellow)}
.es-hub-family-count{display:inline-flex;margin-top:5px;font-size:16px;font-weight:800;color:#704ec0}
.es-hub-family-card>p{font-size:16px;line-height:1.5;color:#586995;margin:0;flex:1}
.es-hub-family-action{display:flex;align-items:center;gap:9px;align-self:flex-start;border-radius:11px;background:#5b27d6;color:#fff;padding:10px 15px;min-height:43px;font-weight:800;font-size:16px}
.es-hub-family-action svg{width:18px;height:18px}
.es-hub-products{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px;align-items:stretch}
.es-hub-section-title{display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:10px;color:#142d9b}
.es-hub-section-title h2{font-size:21px;font-weight:900;line-height:1.2;margin:0}
.es-hub-section-total{background:#eee8ff;border-radius:99px;color:#5a2bc4;font-weight:800;font-size:16px;padding:4px 10px}
.es-hub-breadcrumb{display:flex;align-items:center;gap:8px;font-size:16px;color:#586c9d;font-weight:700;margin:0 0 9px}
.es-hub-breadcrumb a{color:#562acc;text-decoration:underline;text-underline-offset:3px}
.es-hub-breadcrumb svg{height:16px;width:16px}
.es-hub-group-intro{margin-bottom:18px;color:#586c9d;font-size:16px;line-height:1.5}
.es-hub-product-card{--hub-accent:#6334dc;display:flex;flex-direction:column;gap:8px;position:relative;overflow:hidden;min-width:0;min-height:0;padding:13px 15px 12px;border:1px solid #dce5fb;border-radius:15px;background:linear-gradient(145deg,#fff 25%,#faf8ff);box-shadow:0 4px 15px rgba(32,38,112,.055);transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}
.es-hub-product-card[data-hub-tone="1"]{--hub-accent:#bd3ba2;background:linear-gradient(140deg,#fff 28%,#fff2fa);border-color:#f5d9e9}
.es-hub-product-card[data-hub-tone="2"]{--hub-accent:#6736de;background:linear-gradient(140deg,#fff 28%,#f4efff);border-color:#e3d7ff}
.es-hub-product-card[data-hub-tone="3"]{--hub-accent:#2768dd;background:linear-gradient(140deg,#fff 28%,#edf7ff);border-color:#d8e9ff}
.es-hub-product-card[data-hub-tone="4"]{--hub-accent:#079a80;background:linear-gradient(140deg,#fff 28%,#effff6);border-color:#d4f2e3}
.es-hub-product-card[data-hub-tone="5"]{--hub-accent:#b87819;background:linear-gradient(140deg,#fff 28%,#fffaec);border-color:#f4e6c5}
.es-hub-product-card[data-hub-tone="6"]{--hub-accent:#1b70c4;background:linear-gradient(140deg,#fff 28%,#eff7ff);border-color:#d9e9fa}
.es-hub-product-top{display:flex;align-items:center;gap:9px;min-width:0}
.es-hub-product-symbol{width:40px;height:40px;flex:0 0 40px;display:grid;place-items:center;background:rgba(255,255,255,.83);border:1px solid rgba(111,95,206,.12);border-radius:12px;color:var(--hub-accent);box-shadow:0 3px 9px rgba(56,42,118,.045);overflow:hidden}
.es-hub-product-symbol svg{width:23px;height:23px}
.es-hub-product-symbol img{width:100%;height:100%;object-fit:contain}
.es-hub-product-top h3{font-size:19px;font-weight:900;margin:0;line-height:1.22;overflow-wrap:anywhere;color:#162d91}
.es-hub-product-card p{font-size:16px;line-height:1.36;color:#536690;margin:0;flex:0 0 auto;overflow-wrap:anywhere}
.es-hub-product-card .es-system-link{font-size:16px;min-height:39px;padding:7px 12px;border-radius:10px;margin-top:2px;align-self:flex-start;gap:7px;background:#efeaff;border:1px solid #ddd1ff;color:#5424c9;font-weight:800;box-shadow:0 2px 7px rgba(81,42,160,.065);transition:background .16s,color .16s,transform .16s,border-color .16s}
.es-hub-product-card .es-system-pending{display:inline-flex;align-items:center;align-self:flex-start;margin:3px 0 0;padding:7px 0;color:#61718f;font-size:16px;font-weight:700}

/* Compact Epsilon Blue Hub cards: elegant accent, readable 16px actions, no forced blank space. */
.es-hub-intro{padding:14px 18px;gap:12px}
.es-hub-product-card::before{content:"";position:absolute;left:0;top:13px;bottom:13px;width:3px;background:var(--hub-accent);opacity:.8;border-radius:0 5px 5px 0;pointer-events:none}
.es-hub-product-card:hover{transform:translateY(-2px);box-shadow:0 9px 22px rgba(42,37,122,.12);border-color:#c6b6f8}
.es-hub-product-card:focus-within{outline:2px solid #8c6af0;outline-offset:2px}
.es-hub-product-card .es-system-link:hover{background:#602bdb;border-color:#602bdb;color:#fff;transform:translateY(-1px)}
.es-hub-product-card .es-system-link:focus-visible{outline:3px solid #f1ba00;outline-offset:3px}
.es-hub-product-card .es-system-link svg{width:17px;height:17px;flex:0 0 17px}
.es-hub-empty{grid-column:1/-1;border:1px dashed #d2d7f8;border-radius:16px;background:#f8faff;padding:26px 20px;color:#586b96;font-size:16px}
@media(max-width:1100px){.es-hub-products{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:720px){
 .es-hub-families{grid-template-columns:1fr;gap:13px}
 .es-hub-family-card{min-height:195px;padding:21px;border-radius:18px;gap:14px}
 .es-hub-family-icon{height:65px;width:65px;flex-basis:65px}
 .es-hub-family-heading h2{font-size:22px}
 .es-hub-family-card>p{font-size:16px;line-height:1.45}
 .es-hub-family-action{min-height:46px;padding:11px 17px;font-size:16px}
 .es-hub-products{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
 .es-hub-product-card{min-height:0;padding:12px 11px;border-radius:14px;gap:8px}
 .es-hub-product-top{align-items:center;flex-direction:row;gap:7px}
 .es-hub-product-symbol{height:35px;width:35px;flex-basis:35px;border-radius:10px}
 .es-hub-product-symbol svg{width:21px;height:21px}
 .es-hub-product-top h3{font-size:18px}
 .es-hub-product-card p{font-size:16px;line-height:1.32;margin:0}
 .es-hub-product-card .es-system-link{font-size:16px;padding:7px 9px;min-height:39px;gap:6px;align-self:flex-start;justify-content:center;text-align:center}
 .es-mobile-folder{flex-basis:98px;height:84px}
 .es-mobile-rail-fixed{flex-basis:106px;min-width:106px}
 .es-mobile-rail-fixed .es-mobile-folder{height:84px}
 .es-mobile-folder-icon,.es-mobile-folder-icon img{height:35px;width:35px}
 .es-mobile-folder-icon{flex-basis:35px}
 .es-mobile-folder-label{font-size:16px;line-height:1.18}
}
@media(max-width:360px){
 .es-hub-products{grid-template-columns:1fr}
 .es-hub-product-top{flex-direction:row;align-items:center}
 .es-hub-product-card{min-height:0}
 .es-mobile-rail-fixed{flex-basis:99px;min-width:99px}
 .es-mobile-folder,.es-mobile-rail-fixed .es-mobile-folder{height:80px}
 .es-mobile-folder{flex-basis:94px}
}
@media(prefers-reduced-motion:reduce){.es-hub-family-card,.es-hub-product-card,.es-hub-product-card .es-system-link{transition:none}}
`;

// Mobile information priority (2026-10-24): show usable tools/content before promotional copy.
// The hero text/actions remain real DOM controls below the content. Desktop is unchanged.
themeSheet.textContent += `
@media(orientation:portrait){
  .es-dashboard-layout,.es-restored-landing{
    display:flex!important;flex-direction:column!important;align-items:stretch;
    min-height:0!important;height:auto!important;gap:13px!important;
  }
  .es-dashboard-layout>.es-directory,.es-restored-landing>.es-landing-info{
    min-width:0;min-height:0!important;flex:0 0 auto;
  }
  .es-dashboard-layout>.es-directory{
    margin:1px 0 0!important;overflow:visible!important;
  }
  .es-dashboard-layout .es-directory-grid{
    overflow:visible!important;max-height:none!important;min-height:0!important;
  }
  /* The large visual banner is replaced by a compact information/installation card. */
  .es-dashboard-layout>.hero,.es-restored-landing>.hero{
    display:flex!important;flex-direction:column!important;grid-template-columns:none!important;
    height:auto!important;min-height:0!important;
    border:1px solid #dce2fa!important;border-radius:16px!important;
    overflow:hidden!important;
    background:linear-gradient(117deg,#f4f1ff,#f0f5ff 70%,#e5eaff)!important;
    background-image:none!important;
    box-shadow:0 4px 14px rgba(38,44,111,.05);
    margin:2px 0 0!important;
  }
  .es-dashboard-layout>.hero .hero-art,.es-restored-landing>.hero .hero-art{
    display:none!important;height:0!important;min-height:0!important;flex:0 0 0!important;
    background:none!important;
  }
  .es-dashboard-layout>.hero .hero-copy,.es-restored-landing>.hero .hero-copy{
    display:block!important;flex:0 0 auto!important;
    padding:15px 16px 12px!important;min-width:0;
  }
  .es-dashboard-layout>.hero .eyebrow,.es-restored-landing>.hero .eyebrow{
    display:block!important;margin:0 0 3px!important;
    font-size:16px!important;line-height:1.25!important;letter-spacing:.65px!important;
  }
  .es-dashboard-layout>.hero .hero-title,.es-restored-landing>.hero .hero-title{
    display:block!important;font-size:26px!important;line-height:1.08!important;
    letter-spacing:-.9px!important;margin:0!important;
  }
  .es-dashboard-layout>.hero .hero-subtitle,.es-restored-landing>.hero .hero-subtitle{
    display:block!important;font-size:16px!important;font-weight:700!important;
    line-height:1.4!important;white-space:normal!important;
    margin:5px 0 0!important;
  }
  .es-dashboard-layout>.hero .hero-description,.es-restored-landing>.hero .hero-description{
    display:none!important;
  }
  .es-dashboard-layout>.hero .hero-perks,.es-restored-landing>.hero .hero-perks{
    display:flex!important;flex-wrap:wrap!important;align-items:center;
    gap:7px 12px!important;margin:10px 0 0!important;
  }
  .es-dashboard-layout>.hero .hero-perks span,.es-restored-landing>.hero .hero-perks span{
    display:inline-flex!important;align-items:center;gap:5px!important;
    white-space:normal!important;font-size:16px!important;font-weight:700!important;
    line-height:1.2!important;
  }
  .es-dashboard-layout>.hero .check-dot,.es-restored-landing>.hero .check-dot{
    display:inline-flex!important;align-items:center;justify-content:center;
    width:18px!important;height:18px!important;flex:0 0 18px!important;
  }
  .es-dashboard-layout>.hero .check-dot svg,.es-restored-landing>.hero .check-dot svg{
    width:13px!important;height:13px!important;
  }
  .es-dashboard-layout>.hero .hero-cta,.es-restored-landing>.hero .hero-cta{
    display:block!important;min-width:0!important;flex:0 0 auto!important;
    padding:11px 14px 14px!important;border-top:1px solid #dce3ff;
    border-radius:0!important;background:rgba(229,236,255,.55)!important;
    box-shadow:none!important;
  }
  .es-dashboard-layout>.hero .hero-cta::before,.es-restored-landing>.hero .hero-cta::before{
    display:none!important;
  }
  /* Benefits remain in the compact summary above; avoid a repeated 3-line marketing panel. */
  .es-dashboard-layout>.hero .es-hero-info,.es-restored-landing>.hero .es-hero-info{
    display:none!important;
  }
  .es-dashboard-layout>.hero .es-hero-actions,.es-restored-landing>.hero .es-hero-actions{
    display:grid!important;grid-template-columns:minmax(0,1fr)!important;
    gap:8px!important;width:100%!important;flex:none!important;
    margin:0!important;
  }
  .es-dashboard-layout>.hero .es-hero-actions .button,.es-restored-landing>.hero .es-hero-actions .button{
    min-height:43px!important;margin:0!important;padding:9px 12px!important;
    width:100%!important;font-size:16px!important;
    border-radius:13px!important;box-shadow:0 2px 7px rgba(46,44,111,.08)!important;
  }
  /* Decorative two-image footer stays under the information card. */
  .es-dashboard-layout>.portable-strip,.es-restored-landing>.portable-strip{
    flex:0 0 auto!important;min-width:0;width:100%;margin:8px 0 14px!important;
  }
}
@media(max-width:355px){
  .es-dashboard-layout>.hero .hero-copy,.es-restored-landing>.hero .hero-copy{padding:13px!important}
  .es-dashboard-layout>.hero .hero-perks span,.es-restored-landing>.hero .hero-perks span{font-size:16px!important}
}
`;


// 2026-10-24: Remove the crowded blue promo block from the banner.
// The two action buttons are real controls in a light strip beneath page content.
// Desktop sidebar does not duplicate the Help header link.
themeSheet.textContent += `
/* Wider two-part hero: headline on the left, artwork to the right, no blue CTA panel. */
@media(min-width:721px){
 .es-dashboard-layout>.hero,.es-restored-landing>.hero{
  display:grid!important;
  grid-template-columns:minmax(0,.98fr) minmax(0,1.02fr)!important;
  position:relative;overflow:hidden;
 }
 .es-dashboard-layout>.hero::before,.es-restored-landing>.hero::before{
  content:"";position:absolute;inset:0;pointer-events:none;z-index:1;
  background:linear-gradient(90deg,rgba(241,247,255,.98) 0%,rgba(241,247,255,.91) 22%,rgba(240,246,255,.42) 45%,transparent 69%);
 }
 .es-dashboard-layout>.hero .hero-copy,.es-restored-landing>.hero .hero-copy{z-index:2;min-width:0}
 .es-dashboard-layout>.hero .hero-art,.es-restored-landing>.hero .hero-art{display:block!important;min-width:0}
}
/* Very long marketing copy no longer shares the banner with app actions. */
.es-bottom-actions{
 min-width:0;display:flex;justify-content:center;align-items:center;gap:12px;
 padding:7px 12px;border:1px solid #dde5fb;border-radius:15px;
 background:linear-gradient(110deg,#f8faff,#eef3ff);
 box-shadow:0 3px 12px rgba(38,53,126,.045);
}
.es-bottom-actions .button{
 margin:0!important;min-width:0;min-height:41px;
 border-radius:999px;font-size:16px;font-weight:800;
 padding:8px 20px;gap:9px;line-height:1.2;white-space:nowrap;
 box-shadow:none;flex:0 1 228px;
}
.es-bottom-actions .button svg{width:19px;height:19px;flex:0 0 19px}
.es-bottom-actions .es-action-install{
 background:#ffdb0a;color:#071e8e;border:1px solid #ffe679;
}
.es-bottom-actions .es-action-about{
 background:white;color:#1537b2;border:1px solid #cad8ff;flex-basis:258px;
}
.es-bottom-actions .es-action-about:hover{background:#f7f8ff}
.es-bottom-actions .button:focus-visible{outline:3px solid #ffce13;outline-offset:2px}
@media(min-width:1081px){
 .es-dashboard-layout{
  grid-template-rows:clamp(189px,25.5vh,239px) minmax(0,1fr) 58px clamp(112px,15.5vh,137px)!important;
 }
 .es-dashboard-layout>.es-bottom-actions{height:58px;min-height:0}
}
@media(min-width:721px) and (max-width:1080px){
 .es-dashboard-layout>.es-bottom-actions{flex:0 0 auto;min-height:56px}
}
.es-restored-landing>.es-bottom-actions{margin:15px 0 0}
@media(max-width:720px){
 .es-dashboard-layout>.es-bottom-actions,.es-restored-landing>.es-bottom-actions{
  display:grid;grid-template-columns:minmax(0,1fr);gap:9px;
  margin:0!important;padding:12px;border-radius:15px;
  background:linear-gradient(120deg,#f8faff,#f0f4ff);
 }
 .es-dashboard-layout>.es-bottom-actions .button,.es-restored-landing>.es-bottom-actions .button{
  width:100%;min-height:45px;font-size:16px;max-width:none;flex:none;
 }
 .es-dashboard-layout>.hero,.es-restored-landing>.hero{border-radius:16px!important}
}
`;

// 2026-10-24: laptop-first density. Show the whole catalog using the PAGE scrollbar.
// The decorative banner follows the last card; the two global actions live inside site-footer.
themeSheet.textContent += `
/* No internal catalog scrolling: reveal every card before the footer art. */
.es-dashboard-layout {
 height:auto!important;min-height:0!important;max-height:none!important;
}
.es-dashboard-layout>.es-directory {
 height:auto!important;min-height:0!important;max-height:none!important;
 overflow:visible!important;flex:0 0 auto!important;
}
.es-dashboard-layout .es-directory-grid {
 height:auto!important;min-height:0!important;max-height:none!important;
 flex:0 0 auto!important;overflow:visible!important;overflow-y:visible!important;
 overscroll-behavior-y:auto!important;scrollbar-gutter:auto!important;
 scrollbar-width:none!important;padding-right:0!important;
}
.es-dashboard-layout .es-directory-grid::-webkit-scrollbar{display:none!important}
@media(min-width:1081px){
 .es-dashboard-layout {
  display:grid!important;grid-template-rows:clamp(195px,26vh,251px) auto clamp(125px,10.5vw,150px)!important;
  align-content:start!important;gap:12px!important;
 }
 .es-dashboard-layout>.hero{height:100%!important;min-height:0!important}
 .es-dashboard-layout>.portable-strip{height:100%!important;min-height:0!important;align-self:stretch}
}
/* Footer is the last document region, after ALL cards and two-image footer artwork. */
.site-footer.shell{position:relative;clear:both;margin-top:16px;padding-top:16px;padding-bottom:18px}
.site-footer>.es-footer-actions {
 display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px;
 width:min(550px,100%);margin:10px 0 0 auto;padding:0;
 border:0;border-radius:0;background:transparent;box-shadow:none;
}
.site-footer>.es-footer-actions .button {
 width:100%;min-width:0;min-height:42px;max-width:none;flex:none;
 padding:9px 13px;font-size:16px;border-radius:12px;
 box-shadow:0 2px 6px rgba(24,39,106,.05);white-space:normal;
}
.site-footer>.es-footer-actions .es-action-install{background:#ffdb08;color:#091f8b;border:1px solid #ffe56e}
.site-footer>.es-footer-actions .es-action-about{background:#fff;color:#173ab5;border:1px solid #cad8ff}
.site-footer>.es-footer-actions .button:focus-visible{outline:3px solid #f5bf00;outline-offset:3px}
.site-footer .footer-bottom{margin-top:13px}
@media(max-width:760px){
 .site-footer .footer-main{flex-wrap:wrap;row-gap:8px}
 .site-footer>.es-footer-actions{margin-top:13px;width:100%}
}
@media(max-width:490px){
 .site-footer>.es-footer-actions{grid-template-columns:1fr;gap:9px}
 .site-footer>.es-footer-actions .button{min-height:43px;font-size:16px}
 .site-footer .footer-links{gap:12px;flex-wrap:wrap}
}
`;

themeSheet.textContent += `
/* Epsilon Blue Soft identity and approved portrait/desktop footer layout, 2026-10-24. */
.site-header .brand{gap:0;min-width:0}
.site-header .es-header-lockup{display:block;width:clamp(185px,18vw,270px);height:auto;max-height:55px;object-fit:contain}
.es-hero-logo-title{line-height:1!important;margin:5px 0 7px!important;letter-spacing:0!important}
.es-hero-lockup{display:block;width:clamp(250px,25vw,330px);height:auto;max-width:100%;object-fit:contain}
/* The footer is the only decorative image region at the end of the real document. */
.es-dashboard-layout,.es-restored-landing{height:auto!important;min-height:0!important;max-height:none!important;display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:13px!important}
.es-dashboard-layout>.es-directory{height:auto!important;min-height:0!important;overflow:visible!important;flex:0 0 auto!important}
.es-dashboard-layout .es-directory-grid{overflow:visible!important;max-height:none!important;min-height:0!important}
.site-footer.shell{
 position:relative;isolation:isolate;overflow:visible;clear:both;
 margin-top:20px;padding:22px 22px 18px;border:0;border-radius:18px;
 min-height:210px;color:#f7faff;background-color:#2710b4;
 background-image:url('./assets/images/footer.png');background-size:cover;background-repeat:no-repeat;background-position:center center;
 box-shadow:0 10px 28px rgba(41,29,127,.12);
}
.site-footer>.footer-main,.site-footer>.es-footer-actions,.site-footer>.footer-bottom{position:relative;z-index:2}
.site-footer .footer-main{max-width:100%;gap:14px;flex-wrap:wrap}
.site-footer .footer-brand img.footer-logo{display:block;width:clamp(200px,18vw,245px);height:auto;object-fit:contain}
.site-footer .footer-main p{color:#ebeeff;margin:3px 0;font-size:16px}
.site-footer .footer-links{gap:14px;color:#fff;font-size:16px;flex-wrap:wrap}
.site-footer .footer-links a:hover{color:#ffe65f}
.site-footer>.es-footer-actions{margin:10px 0 0;width:min(540px,100%);grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.site-footer .footer-bottom{margin-top:13px;border-color:#ffffff5c;color:#eff2ff;font-size:16px;padding-top:10px}
@media(max-width:1050px) and (orientation:landscape){
 .site-footer .footer-main{max-width:100%}
 .site-footer>.es-footer-actions{width:min(460px,100%)}
}
/* User-defined mobile: portrait, including tablets. Landscape has no bottom dock. */
body.es-portrait-layout .site-header{position:sticky!important;top:0;z-index:210}
body.es-portrait-layout .site-header .brand-divider,body.es-portrait-layout .site-header .header-tagline{display:none!important}
body.es-portrait-layout .site-header .main-nav,body.es-portrait-layout .site-header .mobile-menu{display:none!important}
body.es-portrait-layout .site-header .es-header-lockup{width:clamp(157px,44vw,235px);max-height:50px}
body.es-portrait-layout .es-sidebar{display:none!important}
body.es-portrait-layout .es-app-layout.shell,body.es-portrait-layout.es-catalog-mode .es-app-layout.shell{display:block!important;width:calc(100% - 18px)!important;max-width:none!important;padding-top:9px!important}
body.es-portrait-layout .es-mobile-rail{
 display:block!important;position:fixed!important;top:auto!important;bottom:0!important;left:0!important;right:0!important;
 z-index:205!important;margin:0!important;padding:6px 7px calc(6px + env(safe-area-inset-bottom))!important;
 border-radius:17px 17px 0 0!important;border:1px solid #dedfff!important;
 background:rgba(252,250,255,.98)!important;box-shadow:0 -5px 24px rgba(38,28,130,.17)!important;
}
body.es-portrait-layout .es-mobile-rail-main{display:block!important;width:100%;min-width:0!important}
body.es-portrait-layout .es-mobile-rail-scroll{display:flex!important;width:100%;flex:0 0 100%!important;min-width:0!important;gap:6px!important;padding:0!important;overflow-x:auto!important;overflow-y:hidden!important}
body.es-portrait-layout .es-mobile-folder{flex:0 0 92px!important;height:75px!important;min-width:92px!important}
body.es-portrait-layout .es-mobile-folder-link{padding:5px 3px!important}
body.es-portrait-layout .es-mobile-folder-label{font-size:16px!important}
body.es-portrait-layout .es-mobile-rail-drawer{margin:0 1px 8px!important;max-height:39dvh!important}
body.es-portrait-layout .es-dashboard-layout>.hero,body.es-portrait-layout .es-restored-landing>.hero{order:2}
body.es-portrait-layout .es-dashboard-layout>.es-directory,body.es-portrait-layout .es-restored-landing>.es-landing-info{order:1}
body.es-portrait-layout .es-hero-lockup{width:clamp(210px,47vw,285px)}
body.es-portrait-layout .site-footer.shell{margin-top:18px!important;min-height:0!important;padding:19px 16px calc(115px + env(safe-area-inset-bottom))!important;border-radius:16px!important}
body.es-portrait-layout .site-footer .footer-main{max-width:none!important;display:flex;flex-direction:column;align-items:flex-start;gap:11px}
body.es-portrait-layout .site-footer>.es-footer-actions{width:100%!important;display:grid;grid-template-columns:1fr!important;max-width:none;margin:12px 0 0}
body.es-portrait-layout .site-footer .footer-logo{width:min(230px,70vw)!important}
body.es-portrait-layout .site-footer .footer-bottom{line-height:1.45}
body:not(.es-portrait-layout) .es-mobile-rail{display:none!important}
@media(max-width:720px) and (orientation:landscape){
 .site-header .mobile-menu{display:flex!important}
 .es-sidebar{display:block!important}
 .es-app-layout.shell{display:grid!important;grid-template-columns:175px minmax(0,1fr)!important;gap:10px!important}
 .es-sidebar{height:auto!important;min-height:0!important;position:relative!important;top:auto!important}
}
`;

// 2026-10-24: Device installation instructions in the Help page.
// These installation instructions apply to the browser-based Web App (PWA).
themeSheet.textContent += `
.es-portable-guide>.es-help-install-card{
 grid-column:1/-1;padding:19px 21px 18px;border:1px solid #d8dfff;
 background:linear-gradient(115deg,#f7faff,#f3f1ff);border-radius:17px;
}
.es-help-install-card .tool-box-heading{margin:0 0 9px;color:#1734a3}
.es-help-install-card .es-help-install-intro{margin:0 0 13px;color:#4b6192}
.es-help-install-devices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px;margin:12px 0}
.es-help-install-device{min-width:0;padding:13px 14px;background:#fff;border:1px solid #dce5fc;border-radius:12px}
.es-help-install-device h3{display:flex;align-items:center;gap:7px;line-height:1.3;font-size:16px;color:#172da0;margin:0 0 8px}
.es-help-install-device h3 svg{color:#6337e5}
.es-help-install-device p{margin:0;color:#495e89;font-size:16px;line-height:1.5}
.es-help-install-bottom{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-top:15px}
.es-help-install-bottom .es-help-install-button{background:#ffdb08;color:#102783;min-height:43px;min-width:155px;border-radius:11px;box-shadow:none;font-size:16px}
.es-help-install-bottom .es-help-install-note{flex:1 1 300px;margin:0;font-size:16px;color:#5b6d95;line-height:1.5}
@media(max-width:960px){.es-help-install-devices{grid-template-columns:1fr}}
@media(max-width:490px){
 .es-portable-guide>.es-help-install-card{padding:16px 14px}
 .es-help-install-bottom{align-items:stretch;gap:9px}
 .es-help-install-bottom .es-help-install-button{width:100%}
}
`;

themeSheet.textContent += `

/* 2026-10-24: Epsilon Blue Soft hero visual 5:1. No duplicate logo inside banner.
   Original photo is 2048x409, left side intentionally holds live HTML text. */
.es-dashboard-layout>.es-main-banner,.es-restored-landing>.es-main-banner{
 background-image:url('./assets/images/main-banner.png')!important;
 background-repeat:no-repeat!important;
 background-position:center center!important;
 background-size:cover!important;
}
@media (orientation:landscape) and (min-width:721px){
 .es-dashboard-layout>.es-main-banner,.es-restored-landing>.es-main-banner{
  aspect-ratio:5 / 1!important;
  height:auto!important;min-height:0!important;max-height:none!important;
  grid-template-columns:minmax(0,43%) minmax(0,57%)!important;
 }
 .es-dashboard-layout>.es-main-banner .hero-art,.es-restored-landing>.es-main-banner .hero-art{
  min-height:0!important;height:100%!important;
 }
 .es-dashboard-layout>.es-main-banner::before,.es-restored-landing>.es-main-banner::before{
  content:"";position:absolute;inset:0;z-index:1;pointer-events:none;
  background:linear-gradient(90deg,rgba(243,249,255,.90) 0%,rgba(240,247,255,.81) 25%,rgba(242,247,255,.35) 43%,rgba(240,246,255,0) 56%)!important;
 }
}
.es-main-banner .es-hero-copy-v3{
 display:flex!important;flex-direction:column;justify-content:center!important;align-items:flex-start;
 gap:0!important;padding:11px 12px 11px 18px!important;max-width:100%;min-width:0;z-index:2;
}
.es-main-banner .es-hero-kicker-v3{
 display:flex;align-items:center;flex-wrap:nowrap;gap:8px;max-width:100%;min-width:0;
 margin-bottom:6px;font-size:16px;font-weight:850;letter-spacing:.38px;line-height:1.1;
}
.es-main-banner .es-hero-kicker-left{
 display:inline-flex;gap:6px;align-items:center;white-space:nowrap;
 color:#2341b2;border:1px solid #b6d5ff;background:rgba(255,255,255,.82);
 border-radius:999px;padding:5px 9px;box-shadow:0 3px 9px #142c660b;
}
.es-main-banner .es-hero-kicker-left svg{color:#512dd4;width:15px;height:15px}
/* Two direct Studio shortcuts replace the changeable tools counter. */
.es-main-banner .es-hero-shortcuts{
 display:inline-flex;align-items:center;gap:6px;min-width:0;flex-wrap:nowrap;
}
.es-main-banner .es-hero-shortcut{
 display:inline-flex;align-items:center;justify-content:center;gap:5px;
 flex:0 0 auto;min-height:27px;padding:4px 9px 4px 6px;
 border-radius:999px;border:1px solid;white-space:nowrap;
 font-size:16px;font-weight:850;letter-spacing:0;line-height:1.1;
 box-shadow:0 3px 10px #152b640f;transition:transform .14s ease,box-shadow .14s ease;
}
.es-main-banner .es-hero-shortcut:hover{transform:translateY(-1px);box-shadow:0 5px 14px #12276c29}
.es-main-banner .es-hero-shortcut:focus-visible{outline:3px solid #ffcf17;outline-offset:2px}
.es-main-banner .es-hero-shortcut-icon{
 width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;
 border-radius:6px;flex:0 0 auto;
}
.es-main-banner .es-hero-shortcut-icon svg{width:14px;height:14px}
.es-main-banner .es-hero-shortcut-pdf{color:#b92346;background:linear-gradient(112deg,#fff 0%,#fff0f3 100%);border-color:#f6b6c7}
.es-main-banner .es-hero-shortcut-pdf .es-hero-shortcut-icon{color:#ed3156;background:#ffdae2}
.es-main-banner .es-hero-shortcut-image{color:#007e78;background:linear-gradient(112deg,#fff 0%,#e8fcf6 100%);border-color:#9cddd2}
.es-main-banner .es-hero-shortcut-image .es-hero-shortcut-icon{color:#009c8c;background:#c8f4e9}
.es-main-banner .es-hero-headline-v3{
 display:flex;flex-direction:column;align-items:flex-start;gap:0;
 margin:0 0 5px;color:#071c88;font-size:clamp(26px,2.2vw,37px);
 letter-spacing:-.75px;line-height:1.065;font-weight:900;
}
.es-main-banner .es-hero-headline-v3>span{display:block;white-space:nowrap}
.es-main-banner .es-hero-headline-v3 strong{
 position:relative;display:inline-block;white-space:nowrap;
 font-weight:900;letter-spacing:-.7px;color:#1738c2;
}
.es-main-banner .es-hero-headline-v3 strong::after{
 content:"";position:absolute;left:0;bottom:-2px;width:40%;height:4px;border-radius:8px;
 background:linear-gradient(90deg,#ffcb00,#ffe65c);transform:skewX(-21deg);
}
.es-main-banner .es-hero-subline-v3{
 margin:5px 0 7px;font-size:16px;font-weight:650;
 color:#364e87;white-space:nowrap;line-height:1.25;
}
.es-main-banner .es-hero-benefits-v3{
 display:flex;gap:6px;flex-wrap:wrap;align-items:center;max-width:100%;
}
.es-main-banner .es-hero-benefits-v3>span{
 display:inline-flex;align-items:center;gap:5px;border:1px solid rgba(184,205,247,.76);
 border-radius:9px;background:rgba(255,255,255,.87);color:#142c8b;
 padding:4px 7px;font-size:16px;font-weight:750;line-height:1.1;white-space:nowrap;
 box-shadow:0 2px 6px rgba(29,47,119,.07);
}
.es-main-banner .es-hero-benefits-v3 svg{width:14px;height:14px;color:#07a97f}
.es-main-banner .es-hero-benefits-v3>span:nth-child(2) svg{color:#6838e6}
@media (orientation:landscape) and (min-width:721px) and (max-width:1180px){
 .es-dashboard-layout>.es-main-banner,.es-restored-landing>.es-main-banner{
  min-height:176px!important;aspect-ratio:auto!important;
 }
 .es-main-banner .es-hero-copy-v3{padding:9px 8px 9px 13px!important}
 .es-main-banner .es-hero-headline-v3{font-size:clamp(23px,2.2vw,28px)}
 .es-main-banner .es-hero-kicker-v3{font-size:16px;gap:4px;margin-bottom:4px;flex-wrap:wrap}
 .es-main-banner .es-hero-shortcuts{gap:4px}
 .es-main-banner .es-hero-shortcut{font-size:16px;min-height:24px;padding:3px 7px 3px 5px;gap:4px}
 .es-main-banner .es-hero-shortcut-icon{width:17px;height:17px}
 .es-main-banner .es-hero-subline-v3{margin:4px 0;font-size:16px}
 .es-main-banner .es-hero-benefits-v3>span{font-size:16px;padding:3px 5px}
}
@media (orientation:portrait){
 /* Preserve the previously approved compact information card AFTER the tools.
    The full photographic banner MUST NOT appear behind text in portrait mode. */
 .es-dashboard-layout>.es-main-banner,.es-restored-landing>.es-main-banner{
  background:linear-gradient(115deg,#f5f2ff,#eef4ff 75%,#e6edff)!important;
  background-image:none!important;
 }
 .es-main-banner .es-hero-copy-v3{padding:13px 14px!important}
 .es-main-banner .es-hero-kicker-v3{font-size:16px;gap:5px;flex-wrap:wrap}
 .es-main-banner .es-hero-shortcuts{gap:5px}
 .es-main-banner .es-hero-shortcut{font-size:16px;min-height:28px}
 .es-main-banner .es-hero-headline-v3{font-size:clamp(22px,5vw,28px)}
 .es-main-banner .es-hero-subline-v3{font-size:16px;white-space:normal}
 .es-main-banner .es-hero-benefits-v3>span{font-size:16px}
}

`;

// 2026-10-25: My tools quick access in the landscape header.
// The bottom swipe rail remains the only mobile/portrait navigation.
themeSheet.textContent += `
/* My tools: click title for category, chevron for pinned-tool dropdown. */
.site-header .main-nav>.nav-link{box-sizing:border-box;height:45px;min-height:45px;padding-top:0;padding-bottom:0}   /* cao đúng bằng khung My tools */
.site-header{position:relative;z-index:230}
.site-header .es-header-mytools{
 position:relative;display:flex;align-items:center;flex:0 0 auto;isolation:isolate;
 border:1px solid rgba(241,229,255,.28);border-radius:11px;
 background:rgba(157,113,250,.32);color:#fff;
}
.site-header .es-header-mytools>.es-header-mytools-link{
 display:inline-flex;align-items:center;gap:6px;min-height:43px;
 padding:8px 4px 8px 10px;white-space:nowrap;border:0;border-radius:10px 0 0 10px;
 box-shadow:none;background:transparent;color:inherit;font-size:16px;font-weight:800;
}
.site-header .es-header-mytools>.es-header-mytools-link.is-active{background:#fff;color:#5421ce}
.site-header .es-header-mytools>.es-header-mytools-link svg{height:19px;width:19px}
.site-header .es-header-mytools-count{
 display:inline-flex;align-items:center;justify-content:center;min-width:21px;height:21px;
 padding:1px 5px;border-radius:999px;background:rgba(255,255,255,.19);color:inherit;
 font-size:16px;font-weight:850;
}
.site-header .es-header-mytools-toggle{
 display:grid;place-items:center;flex:0 0 34px;width:34px;min-height:43px;   /* dễ bấm: 26 → 31 → 34 px */
 padding:0;border:0;border-left:1px solid rgba(255,255,255,.25);
 background:transparent;color:inherit;border-radius:0 10px 10px 0;
}
.site-header .es-header-mytools-toggle:hover,.site-header .es-header-mytools>.es-header-mytools-link:hover{
 background:rgba(255,255,255,.17)
}
.site-header .es-header-mytools-toggle[aria-expanded="true"]{background:rgba(255,255,255,.23)}
.site-header .es-header-mytools-toggle svg{width:20px;height:20px;transition:transform .18s}
.site-header .es-header-mytools-toggle[aria-expanded="true"] svg{transform:rotate(180deg)}
.site-header .es-header-mytools a:focus-visible,.site-header .es-header-mytools button:focus-visible{
 outline:3px solid #ffdb00;outline-offset:2px;
}
.es-header-mytools-menu{
 position:absolute;left:0;top:calc(100% + 9px);z-index:270;
 width:min(320px,calc(100vw - 26px));max-height:min(390px,calc(100dvh - 102px));
 overflow-y:auto;overscroll-behavior:contain;padding:9px;
 border:1px solid #dacdff;border-radius:14px;background:#fff;
 box-shadow:0 16px 44px rgba(18,18,93,.24);color:#17278b;
}
.es-header-mytools-menu[hidden]{display:none!important}
.es-header-mytools-menu-title{display:flex;align-items:center;gap:8px;padding:7px 9px 9px;
 font-size:16px;font-weight:900;color:#4621bf;border-bottom:1px solid #e7e3fa}
.es-header-mytools-items{display:flex;flex-direction:column;gap:3px;padding-top:5px}
.es-header-mytools-item{display:flex;align-items:center;gap:9px;padding:10px 9px;
 min-height:43px;border-radius:9px;color:#172f92;font-weight:750;font-size:16px;line-height:1.2;overflow-wrap:anywhere}
.es-header-mytools-item svg{width:19px;height:19px;color:#6538e5;flex:0 0 19px}
.es-header-mytools-item:hover,.es-header-mytools-item:focus-visible{background:#f1ecff;color:#4d24c8}
.es-header-mytools-empty{padding:12px 9px;color:#596a95;font-size:16px;line-height:1.45}
.es-header-mytools-empty a{display:inline-block;margin-top:8px;font-weight:800;color:#5322cf;text-decoration:underline}
/* Portrait uses the approved bottom navigation, so there is no duplicate button. */
body.es-portrait-layout .es-header-mytools{display:none!important}
/* ALL TOOLS: cùng kiểu My tools; menu rộng hơn, có tiêu đề nhóm. Màn hình dọc: chỉ giữ link, không có mũi tên. */
.es-header-alltools-menu{width:min(360px,calc(100vw - 26px));max-height:min(470px,calc(100dvh - 102px))}
.es-header-alltools-group{display:flex;align-items:center;gap:8px;margin-top:6px;padding:8px 9px 6px;border-top:1px solid #eee9fb;
 font-size:14.5px;font-weight:900;letter-spacing:.03em;color:#6a4bd0;text-transform:uppercase}
.es-header-alltools-group:first-child{margin-top:0;border-top:0}
.es-header-alltools-group svg{width:17px;height:17px}
.es-header-alltools-group small,.es-header-alltools-count{margin-left:auto;font-size:13px;font-weight:800;color:#8a79c8}
.es-header-alltools-group:hover{color:#4d24c8;background:#f6f2ff;border-radius:9px}
body.es-portrait-layout .es-header-alltools{display:flex!important;border:0;background:transparent}
body.es-portrait-layout .site-header .main-nav>.nav-link{height:auto}
body.es-portrait-layout .es-header-alltools .es-header-mytools-toggle,body.es-portrait-layout .es-header-alltools-menu{display:none!important}
/* Preserve every header action near the previous 1080px breakpoint. */
@media (min-width:1081px) and (max-width:1240px){
 .site-header .es-header-lockup{width:clamp(170px,17vw,205px)}
 .site-header .header-inner{gap:7px}
 .site-header .main-nav{gap:5px}
 .site-header .main-nav .nav-link{gap:5px;padding:8px 8px;font-size:16px}
 .site-header .es-header-mytools>.es-header-mytools-link{padding:7px 3px 7px 8px;font-size:16px}
 .site-header .es-language-picker{padding:2px}
 .site-header .es-language-btn{min-width:34px;padding:4px 5px}
}
/* Correct the legacy width-only header breakpoint: horizontal tablet/laptop IS desktop. */
@media (max-width:1080px) and (orientation:landscape){
 body:not(.es-portrait-layout) .site-header .main-nav{
  display:flex!important;align-items:center;justify-content:flex-end;
  flex:1 1 auto;min-width:0;margin-left:auto;gap:4px;
 }
 body:not(.es-portrait-layout) .site-header .mobile-menu{display:none!important}
 body:not(.es-portrait-layout) .site-header .header-inner{
  gap:6px;min-height:65px;max-width:none;width:calc(100% - 20px)
 }
 body:not(.es-portrait-layout) .site-header .brand-divider,
 body:not(.es-portrait-layout) .site-header .header-tagline{display:none!important}
 body:not(.es-portrait-layout) .site-header .es-header-lockup{
  width:clamp(130px,17vw,158px);max-height:42px
 }
 body:not(.es-portrait-layout) .site-header .main-nav .nav-link{
  min-height:39px;padding:7px 7px;gap:5px;font-size:16px;border-radius:9px
 }
 body:not(.es-portrait-layout) .site-header .main-nav .nav-link svg{width:16px;height:16px}
 body:not(.es-portrait-layout) .site-header .es-header-mytools>.es-header-mytools-link{
  min-height:39px;padding:7px 3px 7px 7px;gap:4px;font-size:16px
 }
 body:not(.es-portrait-layout) .site-header .es-header-mytools>.es-header-mytools-link svg{height:16px;width:16px}
 body:not(.es-portrait-layout) .site-header .es-header-mytools-count{min-width:18px;height:18px;font-size:16px;padding:1px 4px}
 body:not(.es-portrait-layout) .site-header .es-header-mytools-toggle{width:29px;flex-basis:29px;min-height:39px}   /* +10 % */
 body:not(.es-portrait-layout) .site-header .main-nav>.nav-link{height:41px;min-height:41px}   /* cao bằng khung My tools (39 + viền) */
 body:not(.es-portrait-layout) .site-header .es-language-picker{order:2;margin-left:0;padding:2px}
 body:not(.es-portrait-layout) .site-header .es-language-btn{min-width:28px;min-height:30px;padding:3px 5px;font-size:16px}
}
/* On extremely narrow landscape viewports, use a two-row full navigation rather than hide links. */
@media (max-width:820px) and (orientation:landscape){
 body:not(.es-portrait-layout) .site-header .header-inner{flex-wrap:wrap;gap:5px;padding-block:6px}
 body:not(.es-portrait-layout) .site-header .brand{order:0}
 body:not(.es-portrait-layout) .site-header .es-language-picker{order:1;margin-left:auto}
 body:not(.es-portrait-layout) .site-header .main-nav{
  order:3;position:static!important;inset:auto!important;z-index:auto!important;
  flex:0 0 100%;width:100%;flex-direction:row!important;align-items:center!important;
  justify-content:space-between;gap:4px;padding:0!important;
  background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;
 }
 body:not(.es-portrait-layout) .site-header .main-nav .nav-link{padding:6px 6px}
}
/* At landscape phone width the old sidebar grid creates an empty 175px column.
   Keep the content full-width; quick access is supplied by header My tools. */
@media (max-width:720px) and (orientation:landscape){
 body:not(.es-portrait-layout) .es-sidebar{display:none!important}
 body:not(.es-portrait-layout) .es-app-layout.shell,
 body:not(.es-portrait-layout).es-catalog-mode .es-app-layout.shell,
 body:not(.es-portrait-layout).es-catalog-mode .es-app-layout.es-is-collapsed{
  display:block!important;grid-template-columns:none!important;
  width:calc(100% - 20px)!important;max-width:none!important;
  padding-top:10px!important
 }
}
@media (prefers-reduced-motion:reduce){.site-header .es-header-mytools-toggle svg{transition:none}}
`;

themeSheet.textContent += "\n/* Approved group navigation and Settings language panel. */\n.site-header .main-nav>a[data-nav=\"office\"],.site-header .main-nav>a[data-nav=\"technical\"],\n.site-header .main-nav>a[data-nav=\"mechanical\"],.site-header .main-nav>a[data-nav=\"home\"],\n.site-header .main-nav>a[data-nav=\"handbook\"]{display:inline-flex!important}\n.site-header .main-nav .nav-link{gap:6px}\n.es-home-group-title{grid-column:1/-1;display:flex;align-items:center;gap:10px;min-height:39px;padding:6px 10px;border:1px solid #e2e7fa;border-radius:11px;background:linear-gradient(105deg,#f7f8ff,#f3f8ff);font-size:17px;font-weight:850;color:#203898}\n.es-home-group-title>a{display:flex;align-items:center;gap:9px;min-width:0}\n.es-home-group-title>a:hover{color:#5b29cc;text-decoration:underline;text-underline-offset:3px}\n.es-home-group-title>small{margin-left:auto;color:#5c70a2;font-size:16px}\n.es-sidebar-bottom .es-side-link{min-height:44px}\n.es-settings-language{display:inline-flex;gap:8px;padding:6px;border:1px solid #d9dffa;border-radius:13px;background:#f3f5ff;margin:12px 0}\n.es-settings-language .es-language-btn{color:#2c3c97;min-width:68px;min-height:44px;border-radius:10px;border:1px solid #d9e1fc;background:#fff;font-size:17px;font-weight:850}\n.es-settings-language .es-language-btn[aria-pressed=\"true\"]{background:#5d2ad9;border-color:#5d2ad9;color:#fff;box-shadow:0 3px 10px #251a9925}\n.es-settings-language .es-language-btn:hover{border-color:#7e5aeb}\n.es-preferences-card{padding:22px}\n.es-preferences-card>p{font-size:16px;color:#455b90;line-height:1.5;margin:5px 0}\n.es-preferences-card>.es-settings-note{color:#69799b}\n@media(max-width:1560px) and (min-width:1081px){.site-header .header-tagline,.site-header .brand-divider{display:none!important}}\n@media(min-width:1081px) and (max-width:1300px){.site-header .main-nav{gap:4px}.site-header .main-nav .nav-link{padding-inline:8px;gap:5px}.site-header .es-header-lockup{width:clamp(180px,17.7vw,240px)}.site-header .es-header-mytools>.es-header-mytools-link{padding-inline:7px}}\n@media (min-width:1081px) and (max-width:1190px){.site-header .header-inner{flex-wrap:wrap;min-height:0;gap:5px;padding-block:7px}.site-header .main-nav{order:3;flex:0 0 100%;width:100%;margin-left:0;justify-content:space-between;gap:5px}}\n@media (max-width:1080px) and (orientation:landscape){body:not(.es-portrait-layout) .site-header .main-nav{flex-wrap:wrap}body:not(.es-portrait-layout) .site-header .main-nav .nav-link{padding:7px 6px}}\n@media (max-width:820px) and (orientation:landscape){body:not(.es-portrait-layout) .site-header .main-nav{justify-content:space-around}}\n";

themeSheet.textContent += `
/* Independent category disclosure and one sidebar scroller. */
.site-header .es-header-category{min-height:45px;align-self:center;position:relative}
.site-header .es-header-category>.es-header-category-link{padding:8px 4px 8px 10px;min-height:43px;font-size:16px;line-height:1.2}
.site-header .es-header-category>.es-header-category-toggle{min-height:43px;width:31px;flex-basis:31px}
.site-header .es-header-category>.es-header-category-menu{width:min(330px,calc(100vw - 26px));top:calc(100% + 9px)}
.site-header .es-header-category:is([data-header-category="mechanical"],[data-header-category="handbook"])>.es-header-category-menu{left:auto;right:0}
.site-header .es-header-category.is-active{background:#fff;color:#5522cd;border-color:#fff;box-shadow:0 4px 14px rgba(22,14,101,.18)}
.site-header .es-header-category.is-active>.es-header-category-link,
.site-header .es-header-category.is-active>.es-header-category-link.is-active{color:inherit;background:transparent;box-shadow:none}
.site-header .es-header-category.is-active>.es-header-category-toggle{border-left-color:#e3dcf7;color:#5522cd}
.site-header .es-header-category>.es-header-category-link:hover{background:rgba(255,255,255,.13)}
.site-header .es-header-category.is-active>.es-header-category-link:hover{background:#f2edff}
.es-sidebar>.es-side-nav{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;}
.es-sidebar .es-side-nav>.es-sidebar-bottom{display:grid;gap:4px;flex:0 0 auto;margin-top:auto;padding:11px 2px 2px;border-top:1px solid #e0e4f6}
.es-sidebar .es-side-nav>.es-sidebar-bottom>.es-side-link{min-height:47px}
@media(max-width:1080px) and (orientation:landscape){
 body:not(.es-portrait-layout) .site-header .es-header-category{min-height:41px}
 body:not(.es-portrait-layout) .site-header .es-header-category>.es-header-category-link{min-height:39px;padding:7px 3px 7px 7px}
 body:not(.es-portrait-layout) .site-header .es-header-category>.es-header-category-toggle{min-height:39px;width:27px;flex-basis:27px}
}
`;

themeSheet.textContent += `
/* 2026-10-28: slightly larger Epsilon brand and a balanced Home action on desktop.
   Logo remains the approved image asset; no navigation or mobile logic changes. */
@media (min-width:1301px){
 .site-header .es-header-lockup{width:clamp(305px,23.5vw,355px);max-height:68px;height:auto}
 .site-header .main-nav>a[data-nav="home"]{min-width:115px;justify-content:center;padding-inline:17px;font-size:17px;gap:8px}
 .site-header .main-nav>a[data-nav="home"] .svg-icon{width:21px;height:21px}
}
@media (min-width:1081px) and (max-width:1300px){
 .site-header .es-header-lockup{width:clamp(230px,21vw,275px);max-height:60px;height:auto}
 .site-header .main-nav>a[data-nav="home"]{min-width:104px;justify-content:center}
}
`;

// 2026-10-28: compact header tabs; icon, text and chevron on one centered line.
// Desktop/landscape navigation only. Preserve existing dropdown behavior.
themeSheet.textContent += `
@media (min-width:1081px){
 .site-header .main-nav{align-items:center}
 .site-header .main-nav>a.nav-link{
  display:inline-flex;align-items:center;justify-content:center;
  height:41px;min-height:41px;padding-top:0;padding-bottom:0;
  line-height:1.1;gap:7px;
 }
 .site-header .es-header-mytools,
 .site-header .es-header-category{
  height:41px;min-height:41px;align-items:center;
 }
 .site-header .es-header-mytools>.es-header-mytools-link,
 .site-header .es-header-category>.es-header-category-link{
  display:inline-flex;align-items:center;
  height:39px;min-height:39px;
  padding-top:0;padding-bottom:0;
  line-height:1.1;gap:6px;
 }
 .site-header .es-header-mytools>.es-header-mytools-toggle,
 .site-header .es-header-category>.es-header-category-toggle{
  height:39px;min-height:39px;
 }
 .site-header .main-nav>a.nav-link>.svg-icon,
 .site-header .es-header-mytools>.es-header-mytools-link>.svg-icon{
  display:block;align-self:center;flex-shrink:0;
  width:18px;height:18px;vertical-align:middle;
 }
 .site-header .es-header-mytools>.es-header-mytools-link>span:not(.es-header-mytools-count){
  display:inline-flex;align-items:center;line-height:1.1;
 }
 .site-header .es-header-mytools-toggle>.svg-icon{display:block;width:18px;height:18px}
 .site-header .main-nav>a.nav-link>[data-icon]{
  display:inline-flex;align-items:center;justify-content:center;
  width:19px;height:19px;flex:0 0 19px;line-height:0;
 }
 .site-header .main-nav>a.nav-link>[data-icon]>.svg-icon{
  display:block;width:19px;height:19px;
 }
 .site-header .main-nav>a[data-nav="home"]{
  min-width:110px;padding-inline:12px;
 }
 .site-header .main-nav>a[data-nav="home"]>.svg-icon{width:19px;height:19px}
}
/* Narrow landscape already uses 41px buttons; align icons without changing their sizing. */
@media (max-width:1080px) and (orientation:landscape){
 body:not(.es-portrait-layout) .site-header .main-nav .nav-link>span[data-icon]{
  display:inline-flex;align-items:center;justify-content:center;line-height:0;
 }
 body:not(.es-portrait-layout) .site-header .main-nav .nav-link>span[data-icon]>.svg-icon{display:block}
}
`;

themeSheet.textContent += `
/* Specialist category indicator: a compact inline lock, never an access-control gate. */
.es-specialist-lock{display:inline-flex;align-items:center;justify-content:center;vertical-align:-1px;flex:0 0 auto;margin-left:3px;line-height:0;color:inherit}
.es-specialist-lock .svg-icon{width:14px;height:14px;stroke-width:2;display:block}
.site-header .es-header-category-link .es-specialist-lock{color:#ffe7b4;margin-left:1px}
.site-header .es-header-category.is-active .es-specialist-lock{color:#a16b20}
.es-side-name .es-specialist-lock{color:#987437;margin-left:5px;vertical-align:-2px}
.es-mobile-folder-label .es-specialist-lock{color:#9d7635;margin-left:4px;vertical-align:-2px}
.es-is-collapsed .es-side-name .es-specialist-lock{display:none}
`;

// Former assets/js/lib/ui.js (bundled, not reimplemented)
/** Small, dependency-free UI toolkit. Icon IDs are fixed and never sourced from user input. */
const path = {
 home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
 grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M3 17v4h18v-4"/>',
 book:'<path d="M12 6c-3-2-6-2-10-2v15c4 0 7 0 10 2 3-2 6-2 10-2V4c-4 0-7 0-10 2zm0 0v15"/>',
 star:'<path d="m12 2.6 3 6 6.6 1-4.8 4.7 1.2 6.7L12 17.8l-6 3.2 1.2-6.7L2.4 9.6l6.6-1z"/>',
 calculator:'<rect x="4" y="2" width="16" height="20" rx="3"/><rect x="7" y="5" width="10" height="4" rx="1"/><path d="M8 13h1m3 0h1m3 0h1M8 17h1m3 0h1m3 0h1"/>',
 area:'<path d="M4 20 20 4v16zM8 16h5v-5"/>',
 box:'<path d="m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5m-9 5v10"/>',
 swap:'<path d="M4 7h16m-5-5 5 5-5 5M20 17H4m5-5-5 5 5 5"/>',
 percent:'<path d="M19 5 5 19"/><circle cx="7" cy="7" r="3"/><circle cx="17" cy="17" r="3"/>',
 nesting:'<rect x="3" y="4" width="18" height="16" rx="2"/><rect x="6" y="7" width="7" height="5" rx=".4"/><rect x="14" y="7" width="4" height="5" rx=".4"/><rect x="6" y="13" width="12" height="4" rx=".4"/>',
 database:'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 4 18 4 18 0V5M3 12c0 4 18 4 18 0"/>',
 beam:'<path d="M2 20h20M5 6h14M7 6v11m10-11v11M4 17h6l-3 3zM14 17h6l-3 3z"/>',
 paint:'<rect x="3" y="4" width="15" height="8" rx="2"/><path d="M18 8h3v5h-9v4m0 0v5"/>',
 pdf:'<path d="M6 2h9l5 5v15H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm9 0v5h5M8 12h8M8 16h8"/>',
 calendar:'<rect x="3" y="5" width="18" height="17" rx="2"/><path d="M7 2v6m10-6v6M3 10h18m-13 5h3m3 0h3m-9 4h3"/>',
 qr:'<path d="M3 3h7v7H3zM5 5h3v3H5zM14 3h7v7h-7zM16 5h3v3h-3zM3 14h7v7H3zM5 16h3v3H5zM14 14h3v3h-3zm5 0h2m-7 6h2m3-2v3m2-3v3"/>',
 barcode:'<path d="M3 4v16m3-16v16m4-16v16m2-16v16m4-16v16m2-16v16m3-16v16"/>',
 notes:'<path d="M5 3h11l4 4v14H5zM16 3v5h4M8 12h9M8 16h9"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
 arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
 windows:'<path d="M3 5 11 4v7H3zm10-1 8-1v8h-8zM3 13h8v7l-8-1zm10 0h8v8l-8-1z"/>',
 check:'<path d="m4 12 5 5L20 6"/>',
 info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v5m0-9v.2"/>',
 menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',
 list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.2M3 12h.2M3 18h.2"/>',
 close:'<path d="M5 5 19 19M19 5 5 19"/>',
 refresh:'<path d="M20 10a8 8 0 1 0 1 4M20 3v7h-7"/>',
 copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H5a2 2 0 0 0-2 2v11h5"/>',
 trash:'<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
 ruler:'<path d="m3 16 13-13 5 5L8 21zM9 10l2 2m2-6 2 2M6 13l2 2"/>',
 weight:'<path d="M6 9h12l2 12H4zm3 0a3 3 0 0 1 6 0"/>',
 chart:'<path d="M3 21h18M6 18V9m6 9V4m6 14v-7"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
 shield:'<path d="m12 2 9 4v6c0 6-4 9-9 10-5-1-9-4-9-10V6z"/>',
 lightbulb:'<path d="M9 18h6M10 21h4M8 14a7 7 0 1 1 8 0l-1 3H9z"/>',
 heart:'<path d="M20 5c-3-3-7-1-8 1-1-2-5-4-8-1-5 5 3 12 8 16 5-4 13-11 8-16z"/>',
 pen:'<path d="M12 20h9M16 3l5 5L8 21l-5 1 1-5zM14 5l5 5"/>',
 file:'<path d="M6 2h9l5 5v15H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm9 0v5h5"/>',
 files:'<rect x="7" y="7" width="14" height="14" rx="2"/><path d="M17 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2"/>',
 rotate:'<path d="M20 6v6h-6M4 18v-6h6M5 10a8 8 0 0 1 13-4l2 6M4 12l2 6a8 8 0 0 0 13-3"/>',
 image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5-11 11"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2c0-5 16-5 16 0v2"/>',
 settings:'<path d="M4 7h16m-10-4v8M4 17h16m-6-4v8"/>',
 scissors:'<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="m8.1 8.1 13 13M14 10l7-7M8 15.9l5-5"/>',
 stamp:'<path d="M4 18h16v4H4zM12 2a4 4 0 0 1 4 4l-1 4 4 5H5l4-5-1-4a4 4 0 0 1 4-4z"/>',
 upload:'<path d="M12 17V3m-5 5 5-5 5 5M3 17v4h18v-4"/>'
};
Object.assign(path, {
 lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
 'chevron-down':'<path d="m6 9 6 6 6-6"/>',
 gear:'<path d="M10.1 2h3.8l.6 2.3c.6.2 1.2.4 1.7.7l2.1-1.2 2.7 2.7-1.2 2.1c.3.5.5 1.1.7 1.7l2.3.6v3.8l-2.3.6c-.2.6-.4 1.2-.7 1.7l1.2 2.1-2.7 2.7-2.1-1.2c-.5.3-1.1.5-1.7.7l-.6 2.3h-3.8l-.6-2.3c-.6-.2-1.2-.4-1.7-.7l-2.1 1.2-2.7-2.7 1.2-2.1c-.3-.5-.5-1.1-.7-1.7L2 13.9v-3.8l2.3-.6c.2-.6.4-1.2.7-1.7L3.8 5.7l2.7-2.7 2.1 1.2c.5-.3 1.1-.5 1.7-.7Z"/><circle cx="12" cy="12" r="3.2"/>',
 'panel-left-open':'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16m6-11 3 3-3 3"/>',
 'panel-left-close':'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16m9-11-3 3 3 3"/>',
 orbit:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/><path d="M4 16c3-9 11-13 17-8M3 9c6 6 11 8 18 7"/>',
 'external-link':'<path d="M13 5h6v6M11 13l8-8M19 13v6H5V5h6"/>',
 mail:'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m3 6 9 7 9-7"/>',
 phone:'<path d="M6 2h4l2 5-3 2c1 3 4 6 7 7l2-3 5 2v4c0 2-2 3-4 3C9 21 3 15 2 6c0-2 2-4 4-4Z"/>',
 'message-circle':'<path d="M20 11.5a8.5 8.5 0 0 1-12.5 7.5L3 21l1.8-4.7A8.5 8.5 0 1 1 20 11.5Z"/>',
 'app-plus':'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M3 8h18M12 11v7m-3.5-3.5h7"/>',
 palette:'<path d="M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 1.2-3.6 2 2 0 0 1 1.2-3.6H18a3 3 0 0 0 3-3 9 9 0 0 0-9-9Z"/><circle cx="7" cy="12" r="1"/><circle cx="9" cy="8" r="1"/><circle cx="14" cy="8" r="1"/>',
 'contact-card':'<rect x="2.5" y="4" width="19" height="16" rx="3"/><circle cx="8" cy="10" r="2"/><path d="M5.5 16c.7-2.5 4.3-2.5 5 0M14 10h5M14 14h4"/>',
 monitor:'<rect x="2" y="3" width="20" height="15" rx="2"/><path d="M8 22h8m-4-4v4"/>',
 smartphone:'<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
 tablet:'<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M11 18h2"/>'
});
function icon(key,size=22){
 return `<svg class="svg-icon" width="${Math.min(40,Math.max(12,size))}" height="${Math.min(40,Math.max(12,size))}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path[key]||path.grid}</svg>`;
}
function hydrateIcons(node=document){node.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=icon(el.dataset.icon,20);});}
function number(value,maxFractionDigits=4){return Number.isFinite(value)?new Intl.NumberFormat('en-US',{maximumFractionDigits:maxFractionDigits}).format(value):'—';}
function numeric(raw,name='Giá trị',{positive=false,nonNegative=false,max=1e15,integer=false}={}){
 const s=String(raw??'').trim().replace(/\s/g,'');
 if(!s)throw new Error(`${name}: vui lòng nhập giá trị.`);
 let cleaned=s;
 // Vietnamese decimal comma accepted; English thousands separators not auto guessed.
 if(s.includes(',')&&!s.includes('.'))cleaned=s.replace(',','.');
 const n=Number(cleaned);
 if(!Number.isFinite(n)||Math.abs(n)>max||(positive&&n<=0)||(nonNegative&&n<0)||(integer&&!Number.isInteger(n))){throw new Error(`${name}: giá trị không hợp lệ.`);}
 return n;
}
function field({name,label,value='',unit='',min=null,max=null,step='any',placeholder=''}){
 const esc=(x)=>String(x).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
 return `<label class="form-field"><span>${esc(label)}</span><span class="input-wrap"><input type="number" inputmode="decimal" name="${esc(name)}" value="${esc(value)}" ${min!==null?`min="${esc(min)}"`:''} ${max!==null?`max="${esc(max)}"`:''} step="${esc(step)}" placeholder="${esc(placeholder)}"><small>${esc(unit)}</small></span></label>`;
}
function setText(parent,selector,text){const el=parent.querySelector(selector);if(el)el.textContent=String(text);}
function downloadBlob(blob,filename){const link=document.createElement('a');const url=URL.createObjectURL(blob);link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function debounce(fn,delay=120){let handle;return (...args)=>{clearTimeout(handle);handle=setTimeout(()=>fn(...args),delay);};}
function normalize(s){return String(s).toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').trim();}



// Epsilon Blue Soft engineering category: existing public tools and future advanced features.
themeSheet.textContent += `
.es-eng-bridge{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:0;margin:0 0 12px;border:1px solid #d9defb;border-radius:15px;background:#fff;overflow:hidden;box-shadow:0 4px 16px #2038880b}
.es-eng-half{display:flex;align-items:center;gap:11px;padding:12px 14px;min-width:0}
.es-eng-basic{background:linear-gradient(115deg,#f7faff,#ecf4ff);border-right:1px solid #d9defb}
.es-eng-pro{background:linear-gradient(112deg,#f1edff,#f9f5ff);gap:10px}
.es-eng-symbol{height:39px;width:39px;flex:0 0 39px;display:grid;place-items:center;border-radius:12px;background:#e2eefe;color:#2365d1}
.es-eng-pro .es-eng-symbol{background:linear-gradient(135deg,#7941f5,#5326db);color:#fff}
.es-eng-copy{min-width:0;flex:1}
.es-eng-label{display:flex;align-items:center;gap:7px;flex-wrap:wrap;font-size:16px;line-height:1.2;font-weight:900;letter-spacing:.25px;color:#1c36a0}
.es-eng-label span{font-size:16px;line-height:1.4;font-weight:850;letter-spacing:.2px;background:#e4f8ed;color:#07845c;border:1px solid #b9ecd5;border-radius:99px;padding:1px 7px}
.es-eng-pro .es-eng-label{color:#5622c7}
.es-eng-pro .es-eng-label span{background:#fff3d7;color:#805309;border-color:#f5dca3}
.es-eng-copy p{margin:4px 0 0;font-size:16px;line-height:1.35;color:#485d91}
.es-eng-cta{border:0;appearance:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;flex:0 0 auto;min-height:37px;padding:8px 11px;border-radius:10px;background:linear-gradient(118deg,#7230e7,#4427d5);color:#fff;font-size:16px;line-height:1.2;font-weight:850;text-align:center;white-space:nowrap;box-shadow:0 4px 10px #4925b326;transition:filter .16s ease}
.es-eng-cta:hover{filter:brightness(1.08)}
.es-eng-cta .svg-icon{width:15px;height:15px}
@media(max-width:1250px){.es-eng-bridge{grid-template-columns:1fr}.es-eng-basic{border-right:0;border-bottom:1px solid #d9defb}}
@media(max-width:630px){.es-eng-half{padding:11px 12px;align-items:flex-start}.es-eng-pro{display:grid;grid-template-columns:39px minmax(0,1fr);align-items:start}.es-eng-pro .es-eng-symbol{grid-column:1;grid-row:1}.es-eng-pro .es-eng-copy{grid-column:2;grid-row:1}.es-eng-cta{grid-column:2;grid-row:2;justify-self:start;margin-left:0;min-height:39px}.es-eng-label{font-size:16px}.es-eng-copy p{font-size:16px}}
@media(orientation:portrait){.es-dashboard-layout>.es-directory.es-directory-engineering{display:flex!important;flex-direction:column}.es-directory-engineering>.es-directory-header{order:0}.es-directory-engineering>.es-directory-grid{order:1}.es-directory-engineering>.es-eng-bridge{order:2;margin:12px 0 0}}
@media(prefers-reduced-motion:reduce){.es-eng-cta{transition:none}}
`;


// Readability baseline (2026-10-25): all app-managed captions / labels / buttons >=16px.
// Preserve heading hierarchy and app behaviour; reflow tight areas instead of tiny text.
themeSheet.textContent += `
/* <small> defaults to 80% in browsers, even when its parent is 16px. */
small{font-size:16px}
/* Desktop header: preserve full readable text and allow compact gaps, not font reduction. */
.site-header .es-language-btn{font-size:16px;min-width:39px}
.site-header .es-header-mytools-count{font-size:16px;min-width:25px;height:25px;padding:2px 5px}
.site-header .es-header-mytools>.es-header-mytools-link{font-size:16px}
.site-header .main-nav .nav-link{font-size:16px}
.es-side-parent>.es-side-link .es-side-name{font-size:16px;white-space:normal;overflow:visible;text-overflow:clip}
@media(min-width:1081px) and (max-width:1240px){
 .site-header .header-inner{gap:6px}
 .site-header .main-nav{gap:4px}
 .site-header .main-nav .nav-link{padding:8px 7px;font-size:16px}
 .site-header .es-header-mytools>.es-header-mytools-link{padding:7px 4px 7px 8px;font-size:16px}
 .site-header .es-language-btn{padding:4px 5px;min-width:36px}
}
/* Very narrow desktop: keep each 16px navigation label on-screen by using two rows. */
@media(min-width:1081px) and (max-width:1130px){
 .site-header .header-inner{flex-wrap:wrap;min-height:0;gap:5px;padding-block:7px}
 .site-header .main-nav{order:3;flex:0 0 100%;width:100%;margin-left:0;justify-content:space-between;gap:5px}
 .site-header .es-language-picker{order:2;margin-left:auto}
}
/* Hero shortcut controls must remain readable, even when moved to a second line. */
.es-main-banner .es-hero-kicker-v3{font-size:16px;flex-wrap:wrap;column-gap:8px;row-gap:5px;line-height:1.22;margin-bottom:6px}
.es-main-banner .es-hero-kicker-left{min-height:32px;padding:5px 9px;gap:6px}
.es-main-banner .es-hero-shortcuts{flex-wrap:wrap;gap:6px}
.es-main-banner .es-hero-shortcut{font-size:16px;min-height:32px;gap:5px;padding:5px 10px 5px 6px;line-height:1.2}
.es-main-banner .es-hero-shortcut-icon{width:21px;height:21px}
.es-main-banner .es-hero-shortcut-icon svg{width:17px;height:17px}
.es-main-banner .es-hero-subline-v3{font-size:16px;line-height:1.25;white-space:normal}
.es-main-banner .es-hero-benefits-v3{gap:3px}
.es-main-banner .es-hero-benefits-v3>span{font-size:16px;line-height:1.17;min-height:26px;padding:3px 4px}
.es-main-banner .es-hero-benefits-v3 svg{width:16px;height:16px}
/* Keep the existing banner artwork and avoid clipping when badges naturally wrap. */
@media(orientation:landscape) and (min-width:721px) and (max-width:1550px){
 .es-dashboard-layout>.es-main-banner,.es-restored-landing>.es-main-banner{min-height:235px!important}
 .es-main-banner .es-hero-copy-v3{padding:10px 10px 10px 16px!important;justify-content:center!important}
}
@media(orientation:landscape) and (min-width:1081px) and (max-width:1400px){
 .es-dashboard-layout>.es-main-banner,.es-restored-landing>.es-main-banner{min-height:245px!important}
}
@media(orientation:landscape) and (min-width:1081px) and (max-width:1330px){
 .es-dashboard-layout>.es-main-banner,.es-restored-landing>.es-main-banner{min-height:272px!important}
}
@media(orientation:landscape) and (min-width:721px) and (max-width:1050px){
 .es-dashboard-layout>.es-main-banner,.es-restored-landing>.es-main-banner{min-height:250px!important}
 .es-main-banner .es-hero-headline-v3>span,.es-main-banner .es-hero-headline-v3 strong{white-space:normal}
 .es-main-banner .es-hero-copy-v3{padding:10px 10px 10px 13px!important}
}
@media(orientation:portrait){
 .es-main-banner .es-hero-copy-v3{padding:14px!important}
 .es-main-banner .es-hero-kicker-v3{font-size:16px;gap:5px;row-gap:7px;margin-bottom:8px}
 .es-main-banner .es-hero-shortcut{font-size:16px;min-height:34px}
 .es-main-banner .es-hero-subline-v3{font-size:16px}
 .es-main-banner .es-hero-benefits-v3>span{font-size:16px}
 /* Category dock is horizontally scrollable: give its two-line labels real room. */
 .es-mobile-rail-fixed{flex-basis:111px;min-width:111px}
 .es-mobile-folder{flex-basis:112px;height:99px}
 .es-mobile-rail-fixed .es-mobile-folder{height:99px}
 .es-mobile-folder-link{padding:7px 5px 5px;gap:5px}
 .es-mobile-folder-label{font-size:16px;line-height:1.14}
 .es-mobile-folder-count{font-size:16px;min-width:24px;min-height:22px;padding:1px 5px}
 .es-mobile-rail-drawer-grid .es-side-child{font-size:16px;min-height:47px}
}
@media(max-width:360px){
 .es-mobile-rail-fixed{flex-basis:104px;min-width:104px}
 .es-mobile-folder{flex-basis:104px;height:100px}
 .es-mobile-rail-fixed .es-mobile-folder{height:100px}
 .es-mobile-folder-label{font-size:16px}
}
`;

// Tool workspaces: portrait mobile gets a compact bottom chevron. Tapping it
// temporarily opens the complete My tools/category rail; tapping the backdrop
// or pressing Escape closes it. The homepage keeps its existing pinned dock.
themeSheet.textContent += `
.es-tool-rail-toggle,.es-tool-rail-backdrop{display:none}
body.es-portrait-layout.es-tool-mode .site-header{
  position:relative!important;
  top:auto!important;
}
body.es-portrait-layout.es-tool-mode .es-mobile-rail{
  display:block!important;
  position:fixed!important;
  top:auto!important;
  bottom:0!important;
  left:0!important;
  right:0!important;
  width:100%!important;
  z-index:265!important;
  margin:0!important;
  padding:7px 7px calc(7px + env(safe-area-inset-bottom))!important;
  border:1px solid #dedfff!important;
  border-radius:17px 17px 0 0!important;
  background:rgba(252,250,255,.99)!important;
  box-shadow:0 -5px 24px rgba(38,28,130,.17)!important;
}
body.es-portrait-layout.es-tool-mode .es-tool-rail-toggle{
  display:grid;place-items:center;
  width:72px;height:39px;min-height:39px;
  margin:0 auto 7px;padding:4px;
  border:1px solid #a99afa;border-radius:13px;
  background:linear-gradient(125deg,rgba(117,59,229,.50),rgba(75,36,209,.50));
  color:#fff;box-shadow:0 4px 14px rgba(66,34,160,.11);
  cursor:pointer;touch-action:manipulation;
}
body.es-portrait-layout.es-tool-mode .es-tool-rail-toggle .svg-icon{width:24px;height:24px}
body.es-portrait-layout.es-tool-mode:not(.es-tool-rail-open) .es-tool-rail-toggle .svg-icon{transform:rotate(180deg)}
body.es-portrait-layout.es-tool-mode .es-tool-rail-toggle:focus-visible{outline:3px solid #ffd508;outline-offset:3px}
body.es-portrait-layout.es-tool-mode:not(.es-tool-rail-open) .es-mobile-rail{
  left:50%!important;right:auto!important;
  bottom:calc(8px + env(safe-area-inset-bottom))!important;
  width:72px!important;
  transform:translateX(-50%);
  padding:0!important;border:0!important;border-radius:13px!important;
  background:transparent!important;box-shadow:none!important;
}
body.es-portrait-layout.es-tool-mode:not(.es-tool-rail-open) .es-tool-rail-toggle{
  margin:0!important;
}
body.es-portrait-layout.es-tool-mode:not(.es-tool-rail-open) .es-tool-rail-panel{display:none!important}
body.es-portrait-layout.es-tool-mode.es-tool-rail-open .es-tool-rail-panel{display:block!important}
/* Give two-line folder labels sufficient height when the menu is expanded. */
body.es-portrait-layout.es-tool-mode.es-tool-rail-open .es-mobile-folder{height:96px!important}
body.es-portrait-layout.es-tool-mode.es-tool-rail-open .es-mobile-folder-link{padding:7px 4px!important}
.es-tool-rail-backdrop{display:none}
body.es-portrait-layout.es-tool-mode.es-tool-rail-open .es-tool-rail-backdrop{
  display:block;position:fixed;inset:0;
  z-index:250;background:rgba(10,17,64,.22);
}
body.es-portrait-layout.es-tool-mode .site-footer.shell{
  padding-bottom:calc(56px + env(safe-area-inset-bottom))!important;
}
@media(prefers-reduced-motion:reduce){
  body.es-portrait-layout.es-tool-mode .es-tool-rail-toggle{transition:none}
}
`;

// Former assets/js/lib/engineering.js (bundled, not reimplemented)
/** Epsilon Blue Soft calculations. Core equations ported with test cases from ES TOOLKIT V1.0 Go source (geometry.go/converter.go). */
const MASS_SHAPES=[
 {name:'Tấm chữ nhật',fields:[['a','Chiều dài a','200'],['b','Chiều rộng b','100'],['t','Chiều dày t','10']],formula:'S = a × b; V = S × t'},
 {name:'Tấm vuông',fields:[['a','Cạnh a','100'],['t','Chiều dày t','10']],formula:'S = a²; V = S × t'},
 {name:'Tấm tròn',fields:[['d','Đường kính D','100'],['t','Chiều dày t','10']],formula:'S = πD²/4; V = S × t'},
 {name:'Tấm tam giác',fields:[['a','Cạnh a','100'],['b','Cạnh b','80'],['c','Cạnh c','70'],['t','Chiều dày t','10']],formula:'S = √[p(p−a)(p−b)(p−c)]'},
 {name:'Tấm lục giác đều',fields:[['f','Khoảng cách hai cạnh đối F','100'],['t','Chiều dày t','10']],formula:'S = √3 × F² / 2'},
 {name:'Trụ tròn đặc',fields:[['d','Đường kính D','60'],['l','Chiều dài L','300']],formula:'S = πD²/4; V = S × L'},
 {name:'Ống tròn',fields:[['d','Đường kính ngoài D','100'],['t','Chiều dày thành t','5'],['l','Chiều dài L','300']],formula:'S = π[D²−(D−2t)²]/4'},
 {name:'Hộp rỗng',fields:[['a','Chiều rộng ngoài a','100'],['b','Chiều cao ngoài b','60'],['t','Chiều dày thành t','4'],['l','Chiều dài L','300'],['r','Bán kính góc ngoài R (có thể 0)','0']],formula:'S = S ngoài − S trong (có thể bo góc)'},
 {name:'Tấm tam giác vuông',fields:[['a','Cạnh góc vuông a','100'],['b','Cạnh góc vuông b','80'],['t','Chiều dày t','10']],formula:'S = a × b / 2'}
];
const AREA_SHAPES=[
 {name:'Hình vuông',fields:[['a','Cạnh a','100'],['r','Bán kính bo góc r (có thể 0)','0']],formula:'S = a² − (4−π)r²'},
 {name:'Hình chữ nhật',fields:[['a','Chiều dài a','150'],['b','Chiều rộng b','80'],['r','Bán kính bo góc r (có thể 0)','0']],formula:'S = ab − (4−π)r²'},
 {name:'Hình tam giác',fields:[['a','Đáy a','120'],['h','Chiều cao h','70']],formula:'S = ah/2'},
 {name:'Hình bình hành',fields:[['a','Đáy a','120'],['h','Chiều cao h','70']],formula:'S = ah'},
 {name:'Hình thang',fields:[['a','Đáy lớn a','150'],['b','Đáy nhỏ b','90'],['h','Chiều cao h','70']],formula:'S = (a+b)h/2'},
 {name:'Hình tròn',fields:[['d','Đường kính D','60']],formula:'S = πD²/4'},
 {name:'Hình bán nguyệt',fields:[['d','Đường kính D','60']],formula:'S = πD²/8'},
 {name:'Hình elip',fields:[['a','Đường kính lớn a','150'],['b','Đường kính nhỏ b','80']],formula:'S = πab/4'},
 {name:'Hình quạt tròn',fields:[['r','Bán kính r','100'],['theta','Góc ở tâm α (độ)','90']],formula:'S = πr²α/360'},
 {name:'Ống thép tròn',fields:[['d','Đường kính ngoài D','100'],['t','Chiều dày t','5']],formula:'S = π[D²−(D−2t)²]/4'},
 {name:'Ống thép hộp',fields:[['a','Chiều rộng ngoài a','100'],['b','Chiều cao ngoài b','60'],['t','Chiều dày thành t','4'],['r','Bán kính góc ngoài R (có thể 0)','0']],formula:'S = S ngoài − S trong'}
];
function requireN(p,key,label=key,optional=false){
 const n=Number(p[key]??(optional?0:NaN));
 if(!Number.isFinite(n)||Math.abs(n)>1e12||n<0||(!optional&&n===0))throw Error(`${label} phải ${optional?'≥ 0':'> 0'} và nằm trong giới hạn cho phép.`);
 return n;
}
function rect(a,b,r=0){
 if(r>Math.min(a,b)/2)throw Error('Bán kính bo góc R không được lớn hơn nửa cạnh nhỏ nhất.');
 return a*b-(4-Math.PI)*r*r;
}
function tube(d,t){if(2*t>=d)throw Error('Chiều dày thành ống phải nhỏ hơn D/2.');return Math.PI*(d*d-(d-2*t)**2)/4;}
function hollowBox(a,b,t,r){
 if(2*t>=Math.min(a,b))throw Error('Chiều dày phải nhỏ hơn nửa cạnh nhỏ nhất.');
 if(r>0&&r<t)throw Error('Bán kính góc R phải ≥ t hoặc bằng 0.');
 return rect(a,b,r)-rect(a-2*t,b-2*t,r===0?0:r-t);
}
function triangle(a,b,c){
 if(a+b<=c||a+c<=b||b+c<=a)throw Error('Ba cạnh không tạo thành tam giác.');
 const s=(a+b+c)/2;return Math.sqrt(s*(s-a)*(s-b)*(s-c));
}
function massCalc(shape,p,density,qty){
 if(!Number.isInteger(shape)||shape<0||shape>=MASS_SHAPES.length)throw Error('Hình dạng không hợp lệ.');
 if(!Number.isFinite(density)||density<=0||density>1000000)throw Error('Khối lượng riêng cần > 0 và ≤ 1.000.000 kg/m³.');
 if(!Number.isSafeInteger(qty)||qty<=0||qty>10000000)throw Error('Số lượng phải là số nguyên 1–10.000.000.');
 const get=(k)=>requireN(p,k);let s;
 switch(shape){
 case 0:s=get('a')*get('b');break;
 case 1:s=get('a')**2;break;
 case 2:case 5:s=Math.PI*get('d')**2/4;break;
 case 3:s=triangle(get('a'),get('b'),get('c'));break;
 case 4:{const f=get('f');s=Math.sqrt(3)*f*f/2;break;}
 case 6:s=tube(get('d'),get('t'));break;
 case 7:s=hollowBox(get('a'),get('b'),get('t'),requireN(p,'r','r',true));break;
 case 8:s=get('a')*get('b')/2;break;
 }
 const length=shape<=4||shape===8?get('t'):get('l');
 const volumeMM3=s*length,unitKG=volumeMM3*density/1e9,totalKG=unitKG*qty;
 if(![s,volumeMM3,unitKG,totalKG].every(v=>Number.isFinite(v)&&v>0))throw Error('Kết quả không hợp lệ hoặc vượt giới hạn.');
 return {areaMM2:s,volumeMM3,unitKG,totalKG};
}
function areaCalc(shape,p){
 if(!Number.isInteger(shape)||shape<0||shape>=AREA_SHAPES.length)throw Error('Hình dạng không hợp lệ.');
 const get=(k)=>requireN(p,k),optional=(k)=>requireN(p,k,k,true);let s;
 switch(shape){
 case 0:s=rect(get('a'),get('a'),optional('r'));break;
 case 1:s=rect(get('a'),get('b'),optional('r'));break;
 case 2:s=get('a')*get('h')/2;break;
 case 3:s=get('a')*get('h');break;
 case 4:s=(get('a')+get('b'))*get('h')/2;break;
 case 5:s=Math.PI*get('d')**2/4;break;
 case 6:s=Math.PI*get('d')**2/8;break;
 case 7:s=Math.PI*get('a')*get('b')/4;break;
 case 8:{const theta=get('theta');if(theta>360)throw Error('Góc ở tâm không vượt 360°.');s=Math.PI*get('r')**2*theta/360;break;}
 case 9:s=tube(get('d'),get('t'));break;
 case 10:s=hollowBox(get('a'),get('b'),get('t'),optional('r'));break;
 }
 if(!Number.isFinite(s)||s<=0)throw Error('Kết quả diện tích không hợp lệ.');return s;
}
const UNIT_GROUPS=[
 {name:'Chiều dài',units:[['mm',.001],['cm',.01],['m',1],['km',1000],['µm',1e-6],['in',.0254],['ft',.3048],['yd',.9144],['mi',1609.344]]},
 {name:'Diện tích',units:[['mm²',1e-6],['cm²',1e-4],['m²',1],['km²',1e6],['in²',.00064516],['ft²',.09290304],['ha',1e4],['acre',4046.8564224]]},
 {name:'Thể tích',units:[['mm³',1e-9],['cm³',1e-6],['m³',1],['L',1e-3],['mL',1e-6],['in³',.000016387064],['ft³',.028316846592],['gal Mỹ',.003785411784]]},
 {name:'Khối lượng',units:[['mg',1e-6],['g',.001],['kg',1],['t',1000],['lb',.45359237],['oz',.028349523125]]},
 {name:'Nhiệt độ',units:[['°C',1],['°F',1],['K',1]]},
 {name:'Tốc độ',units:[['m/s',1],['km/h',1/3.6],['mph',.44704],['kn',1852/3600],['ft/s',.3048]]},
 {name:'Thời gian',units:[['ms',.001],['s',1],['min',60],['h',3600],['ngày',86400],['tuần',604800]]},
 {name:'Áp suất',units:[['Pa',1],['kPa',1000],['MPa',1e6],['bar',1e5],['psi',6894.757293168],['atm',101325],['mmHg',133.322387415]]}
];
function convertUnit(group,from,to,x){
 const g=UNIT_GROUPS[group];if(!g||!g.units[from]||!g.units[to]||!Number.isFinite(x))throw Error('Giá trị hoặc đơn vị không hợp lệ.');
 if(group===4){
  const k=from===0?x+273.15:from===1?(x+459.67)*5/9:x;
  if(k < -1e-9)throw Error('Nhiệt độ thấp hơn độ không tuyệt đối.');
  const kelvin=Math.max(0,k);
  return to===0?kelvin-273.15:to===1?kelvin*9/5-459.67:kelvin;
 }
 const value=x*g.units[from][1]/g.units[to][1];if(!Number.isFinite(value))throw Error('Giá trị vượt giới hạn.');return value;
}
function nestRect({sheetW,sheetH,partW,partH,gap=0,margin=0,rotate=true}){
 const nums=[sheetW,sheetH,partW,partH,gap,margin];
 if(nums.some(x=>!Number.isFinite(x)||x<0||x>1000000)||[sheetW,sheetH,partW,partH].some(x=>x===0))throw Error('Kích thước tấm hoặc chi tiết không hợp lệ.');
 const w=sheetW-2*margin,h=sheetH-2*margin;if(w<=0||h<=0)throw Error('Lề lớn hơn kích thước tấm.');
 const options=[[partW,partH,false]];if(rotate&&partW!==partH)options.push([partH,partW,true]);
 const cases=options.map(([pw,ph,rotated])=>({pw,ph,rotated,cols:Math.max(0,Math.floor((w+gap)/(pw+gap))),rows:Math.max(0,Math.floor((h+gap)/(ph+gap)))}));
 const best=cases.sort((a,b)=>b.cols*b.rows-a.cols*a.rows)[0];
 const count=best.cols*best.rows;
 if(count>250000)throw Error('Số lượng quá lớn để lập sơ đồ. Hãy tăng kích thước chi tiết hoặc giảm tấm.');
 const used=count*partW*partH/(sheetW*sheetH)*100;
 return {...best,count,efficiency:used,sheetW,sheetH,margin,gap};
}
function loanCalc({principal,rateAnnual,months,mode='amortizing'}){
 if(!Number.isFinite(principal)||principal<=0||principal>1e15||!Number.isFinite(rateAnnual)||rateAnnual<0||rateAnnual>200||!Number.isInteger(months)||months<1||months>600)throw Error('Tiền gốc, lãi suất hoặc kỳ hạn không hợp lệ.');
 const r=rateAnnual/1200;
 if(mode==='savings'){const total=principal*(1+r)**months;return {payment:null,total,interest:total-principal};}
 const payment=r===0?principal/months:principal*r/(1-(1+r)**-months);
 return {payment,total:payment*months,interest:payment*months-principal};
}
function beamCalc({span,E,I,loadType,w=0,P=0}){
 // Simply supported beam, elementary linear-elastic Euler-Bernoulli approximation.
 if(![span,E,I,w,P].every(Number.isFinite)||span<=0||E<=0||I<=0||span>1e7||E>1e9||I>1e25)throw Error('Thông số dầm không hợp lệ.');
 if(loadType==='udl'){
  if(w<=0||w>1e7)throw Error('Tải phân bố phải > 0 và hợp lệ.');
  return {moment:w*span**2/8/1e6,shear:w*span/2/1000,deflection:5*w*span**4/(384*E*I),unitMoment:'kN·m'};
 }
 if(loadType==='point'){
  if(P<=0||P>1e10)throw Error('Tải tập trung phải > 0.');const force=P*1000;
  return {moment:force*span/4/1e6,shear:force/2/1000,deflection:force*span**3/(48*E*I),unitMoment:'kN·m'};
 }
 throw Error('Loại tải không được hỗ trợ.');
}
function paintCalc({area,layers,coverage,loss,density}){
 if(![area,layers,coverage,loss,density].every(Number.isFinite)||area<=0||coverage<=0||density<=0||layers<1||!Number.isInteger(layers)||layers>100||loss<0||loss>=100||area>1e9||coverage>1e5||density>100)throw Error('Thông số sơn không hợp lệ.');
 const liters=area*layers/coverage/(1-loss/100);return {liters,kg:liters*density};
}


// One canonical source of reference density values shared by Mass, Nesting and Density Lookup.
// Store public catalog only in memory for the current tab. Never store user files or inputs.
let materialCatalogPromise = null;
function loadMaterialsCatalog(){
 if(!materialCatalogPromise){
  materialCatalogPromise=fetch(new URL('./assets/data/materials.json', document.baseURI),{cache:'no-cache'})
   .then(response=>{if(!response.ok)throw Error('Không đọc được assets/data/materials.json (HTTP '+response.status+').');return response.json();})
   .then(rows=>{
    if(!Array.isArray(rows)||rows.length<4||rows.length>2000)throw Error('Danh mục vật liệu không hợp lệ.');
    const seen=new Set();
    const validated=rows.map((row,index)=>{
     if(!row||typeof row.name!=='string'||!row.name.trim()||row.name.length>150||
        typeof row.en!=='string'||row.en.length>200||typeof row.density!=='number'||
        !Number.isFinite(row.density)||row.density<=0||row.density>1_000_000)
       throw Error('Dữ liệu vật liệu không hợp lệ tại dòng '+(index+1)+'.');
     const key=row.name.trim().toLocaleLowerCase('vi');
     if(seen.has(key))throw Error('Vật liệu bị trùng tên: '+row.name);
     seen.add(key);
     return Object.freeze({name:row.name.trim(),en:row.en,density:row.density});
    });
    return Object.freeze(validated);
   })
   .catch(error=>{materialCatalogPromise=null;throw error;}); // Allow a real retry.
 }
 return materialCatalogPromise;
}
// The tools use shared functions without importing another file.
globalThis.EpsilonSoftShared = Object.freeze({icon, hydrateIcons, number, numeric, field, setText, downloadBlob, debounce, normalize, MASS_SHAPES, AREA_SHAPES, massCalc, areaCalc, UNIT_GROUPS, convertUnit, nestRect, loanCalc, beamCalc, paintCalc, loadMaterialsCatalog});

// Main application coordinator
/**
 * Epsilon Blue Soft Web App — application coordinator.
 * No backend, no login. Persistent data here is ONLY pins and open counts.
 * Modules in assets/js/tools are loaded on demand; tool inputs are not tracked.
 */


themeSheet.textContent += '\n\n/* Epsilon Blue Soft / Nesting 2D - wider real sheet preview, less unused side/panel whitespace.\n   Preserves the original SVG viewBox, coordinates, cutting algorithm and mobile flow.\n   The extra selector specificity intentionally wins over nesting.js embedded CSS. */\n@media (min-width:1261px) {\n  .tool-page .nest-pro .nest-panelgrid {\n    grid-template-columns:minmax(375px,min(34.5%,465px)) minmax(0,1fr);\n    gap:8px;\n  }\n  .tool-page .nest-pro .nest-panel {\n    padding:8px 9px;\n  }\n  .tool-page .nest-pro .nest-figure {\n    padding:5px 6px;\n    min-height:0;\n  }\n  .tool-page .nest-pro .nest-figure-title {\n    margin-bottom:3px;\n  }\n  .tool-page .nest-pro .nest-preview {\n    min-height:0;\n    align-items:center;\n  }\n  .tool-page .nest-pro .nest-preview svg {\n    width:100%;\n    max-width:100%;\n    height:auto;\n    min-height:0;\n    max-height:min(62vh,510px);\n    object-fit:contain;\n  }\n  .tool-page .nest-pro .nest-legend {\n    min-height:25px;\n    margin-top:4px;\n    gap:10px 14px;\n  }\n  .tool-page .nest-pro .nest-caption { margin-top:6px; }\n}\n';

themeSheet.textContent += "\n/* Final layout fit for laptop/desktop. */\n@media(min-width:1081px){\n .es-app-layout.shell,body.es-catalog-mode .es-app-layout.shell{grid-template-columns:304px minmax(0,1fr)}\n .es-app-layout.es-is-collapsed,body.es-catalog-mode .es-app-layout.es-is-collapsed{grid-template-columns:65px minmax(0,1fr)}\n}\n@media(orientation:landscape) and (min-width:721px){\n .es-dashboard-layout>.es-main-banner,.es-restored-landing>.es-main-banner{min-height:275px!important}\n}\n";

themeSheet.textContent += `
/* Shared tool-page spacing: bring all desktop tools closer to the site header.
   Compact both the APP shell and tool page top padding by approximately 50%.
   Leave the homepage/catalog and mobile/tablet layout unchanged. */
@media (min-width:1081px){
 body:not(.es-catalog-mode) .es-app-layout.shell{padding-top:8px}
 body:not(.es-catalog-mode) .tool-page{padding-top:10px}
}
@media (min-width:1081px) and (max-height:900px){
 body:not(.es-catalog-mode) .tool-page{padding-top:4px}
}
/* All tool pages: compact My tools checkbox on the breadcrumb row. */
.tool-page .es-tool-topline{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px 14px;margin-bottom:12px}
.tool-page .es-tool-topline>.breadcrumbs{margin:0;min-width:0;gap:4px 8px}
.tool-page .es-tool-topline>.breadcrumbs>span:last-child{min-width:0;overflow-wrap:anywhere}
.tool-page .es-tool-pin{display:inline-flex;align-items:center;gap:8px;min-height:38px;padding:6px 11px;border:1px solid #cdb8fb;border-radius:10px;background:#fff;color:#5a20db;font-size:16px;font-weight:750;line-height:1.25;white-space:nowrap;cursor:pointer;user-select:none}
.tool-page .es-tool-pin:hover{background:#f6f1ff;border-color:#a789f3}
.tool-page .es-tool-pin:has(input:checked){background:#f1ebff;border-color:#a789f3}
.tool-page .es-tool-pin:focus-within{box-shadow:0 0 0 3px #7542ff21}
.tool-page .es-tool-pin input{width:18px;height:18px;margin:0;flex-shrink:0;accent-color:#6b2ce7;cursor:pointer}
.es-free-tool .es-free-desc{margin:0 0 13px;color:#5a6c94;font-size:16px;line-height:1.35}
.es-free-tool .es-free-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media(max-width:600px){.tool-page .es-tool-topline{gap:8px}.tool-page .es-tool-pin{gap:6px;padding:6px 8px}}
`;

themeSheet.textContent += `
/* 2026-10-29: User approved returning the global VI/EN selector to the far right of header. */
.site-header .header-inner>.es-language-picker{
 display:inline-flex;align-items:center;gap:2px;flex:0 0 auto;
 margin:0 0 0 2px;padding:3px;border:1px solid rgba(255,255,255,.44);
 border-radius:11px;background:rgba(29,11,127,.27);white-space:nowrap;
}
.site-header .header-inner>.es-language-picker>.es-language-btn{
 appearance:none;min-width:38px;min-height:36px;padding:5px 8px;
 border:0;border-radius:8px;background:transparent;color:#fff;
 font-size:16px;font-weight:800;line-height:1.2;
}
.site-header .header-inner>.es-language-picker>.es-language-btn[aria-pressed="true"]{
 background:#fff;color:#4d21c7;box-shadow:0 2px 7px rgba(41,7,96,.25);
}
.site-header .header-inner>.es-language-picker>.es-language-btn:hover:not([aria-pressed="true"]){background:rgba(255,255,255,.17)}
.site-header .header-inner>.es-language-picker>.es-language-btn:focus-visible{outline:3px solid #ffdc08;outline-offset:2px}
/* Preserve a single readable navigation row at medium desktop widths. */
@media(min-width:1081px) and (max-width:1710px){
 .site-header .brand-divider,.site-header .header-tagline{display:none!important}
}
/* Keep brand + selector on the first row when the existing nav wraps on narrower desktops. */
@media(min-width:1081px) and (max-width:1190px){
 .site-header .header-inner>.es-language-picker{order:2;margin-left:auto}
}
/* Landscape tablets keep all header controls accessible at 16px, without horizontal clipping. */
@media(max-width:1060px) and (orientation:landscape){
 body:not(.es-portrait-layout) .site-header .header-inner{flex-wrap:wrap;gap:5px;padding-block:6px}
 body:not(.es-portrait-layout) .site-header .header-inner>.es-language-picker{order:2;margin-left:auto}
 body:not(.es-portrait-layout) .site-header .main-nav{
  order:3;flex:0 0 100%;width:100%;margin-left:0;justify-content:space-between;
 }
}
/* In portrait, the site uses the bottom rail, but language switching remains in the header. */
body.es-portrait-layout .site-header .header-inner>.es-language-picker{order:2;margin-left:auto}
@media(max-width:390px){
 body.es-portrait-layout .site-header .header-inner>.es-language-picker{padding:2px;gap:1px}
 body.es-portrait-layout .site-header .header-inner>.es-language-picker>.es-language-btn{min-width:34px;min-height:34px;padding:4px 5px;font-size:16px}
}
`;


// 2026-10-29: Keep the approved complete header identity readable on narrow screens.
// The brand image already contains the logo + wordmark: resize the whole lockup,
// and allow the *existing* tagline to wrap instead of hiding or duplicating content.
themeSheet.textContent += `
@media (min-width:1081px) and (max-width:1710px){
 .site-header .header-inner{display:flex;flex-wrap:wrap;align-items:center;column-gap:13px;row-gap:5px;min-height:0;padding-block:7px}
 .site-header .header-inner>.brand{order:0;flex:0 0 auto}
 .site-header .es-header-lockup{width:clamp(285px,21vw,340px);height:auto;max-height:66px}
 .site-header .brand-divider{display:block!important;order:1;flex:0 0 1px;height:31px;margin-left:2px}
 .site-header .header-tagline{display:block!important;order:1;flex:0 1 auto;font-size:16px;line-height:1.3;white-space:nowrap}
 .site-header .header-inner>.es-language-picker{order:2;margin-left:auto}
 .site-header .main-nav{order:3;display:flex;flex:0 0 100%;width:100%;margin-left:0;justify-content:space-between;gap:5px}
}
@media (max-width:1080px) and (orientation:landscape){
 body:not(.es-portrait-layout) .site-header .header-inner{display:flex;flex-wrap:wrap;align-items:center;column-gap:10px;row-gap:5px;padding-block:6px}
 body:not(.es-portrait-layout) .site-header .header-inner>.brand{order:0;flex:0 0 auto}
 body:not(.es-portrait-layout) .site-header .es-header-lockup{width:clamp(225px,31vw,305px);height:auto;max-height:62px}
 body:not(.es-portrait-layout) .site-header .brand-divider{display:block!important;order:1;flex:0 0 1px;height:30px;margin-left:2px}
 body:not(.es-portrait-layout) .site-header .header-tagline{display:block!important;order:1;flex:0 1 auto;font-size:16px;line-height:1.3;white-space:nowrap}
 body:not(.es-portrait-layout) .site-header .header-inner>.es-language-picker{order:2;margin-left:auto}
 body:not(.es-portrait-layout) .site-header .main-nav{order:3;flex:0 0 100%;width:100%;margin:0;justify-content:space-between;gap:5px}
}
body.es-portrait-layout .site-header .header-inner{display:flex;flex-wrap:wrap;align-items:center;gap:5px 9px;padding-block:7px;min-height:0}
body.es-portrait-layout .site-header .header-inner>.brand{order:0;flex:0 0 auto}
body.es-portrait-layout .site-header .es-header-lockup{width:clamp(210px,41vw,305px);height:auto;max-height:62px}
body.es-portrait-layout .site-header .brand-divider{display:none!important}
body.es-portrait-layout .site-header .header-tagline{display:block!important;order:3;flex:0 0 100%;font-size:16px;line-height:1.25;white-space:normal;margin:0;text-align:left}
body.es-portrait-layout .site-header .header-inner>.es-language-picker{order:1;margin-left:auto}
@media (max-width:760px){
 body:not(.es-portrait-layout) .site-header .header-inner{display:flex;flex-wrap:wrap;gap:5px 9px}
 body:not(.es-portrait-layout) .site-header .brand-divider{display:none!important}
 body:not(.es-portrait-layout) .site-header .header-tagline{display:block!important;order:2;flex:0 0 100%;white-space:normal;font-size:16px;line-height:1.25}
 body:not(.es-portrait-layout) .site-header .header-inner>.es-language-picker{order:1;margin-left:auto}
 body.es-portrait-layout .site-header .es-header-lockup{width:clamp(185px,57vw,246px);max-height:54px}
}
@media (max-width:350px){
 body.es-portrait-layout .site-header .es-header-lockup{width:clamp(175px,55vw,195px)}
 body.es-portrait-layout .site-header .header-inner{column-gap:5px}
}
`;

const DEFINITIONS = Object.freeze([
 {id:'calculator',name:'Máy tính khoa học',sub:'Phép tính và hàm toán học',group:'technical',dir:'engineering',icon:'calculator',tone:'tone-blue',file:'calculator.js'},
 {id:'area',name:'Diện tích hình học',sub:'Tính diện tích nhiều hình',group:'technical',dir:'engineering',icon:'area',tone:'tone-mint',file:'area.js'},
 {id:'mass',name:'Khối lượng vật liệu',sub:'Tính nhanh theo kích thước',group:'technical',dir:'engineering',icon:'box',tone:'tone-orange',file:'mass.js'},
 {id:'converter',name:'Đổi đơn vị',sub:'Chuyển đổi đơn vị đa dạng',group:'technical',dir:'engineering',icon:'swap',tone:'tone-violet',file:'converter.js'},
 {id:'container',name:'Tra cứu Container',sub:'Kích thước, Tare, Gross, Net và tải trọng các hãng tàu',group:'technical',dir:'engineering',icon:'box',tone:'tone-mint',file:'container.js'},
 {id:'interest',name:'Tính lãi suất',sub:'Lãi suất tiền gửi và khoản vay',group:'office',dir:'office',icon:'percent',tone:'tone-blue',file:'interest.js'},
{id:'cutting-plan-plate',name:'Cutting Plan Plate',sub:'Thép tấm · định mức, sơ đồ cắt, tấm lẻ, xuất DXF · thử nghiệm nội bộ',group:'mechanical',icon:'nesting',tone:'tone-orange',dir:'mechanical',file:'cutting-plan-plate.js',guide:true},
{id:'cutting-plan-section',name:'Cutting Plan Section',sub:'Thép hình · định mức, sơ đồ cắt, cây lẻ, đề xuất nối cột · thử nghiệm nội bộ',group:'mechanical',icon:'scissors',tone:'tone-orange',dir:'mechanical',file:'cutting-plan-section.js',guide:true},
 {id:'materials',name:'Khối lượng riêng',sub:'Tra cứu khối lượng riêng (kg/m³)',group:'technical',dir:'engineering',icon:'database',tone:'tone-violet',file:'density.js'},
 {id:'beam-check',name:'Beam Check',sub:'Tính bền dầm · thử nghiệm nội bộ',group:'mechanical',icon:'beam',tone:'tone-blue',dir:'mechanical',file:'beam-check.js'},
 {id:'coating-plan',name:'Coating Plan',sub:'Sơn epoxy, PU kết cấu thép · lượng sơn · WFT/DFT · diện tích',group:'mechanical',icon:'paint',tone:'tone-mint',dir:'mechanical',file:'coating-plan.js'},
 {id:'color-mixer',name:'Phối màu RGB & CMYK',sub:'Pha màu, chuyển mã và tạo bảng phối hài hòa',group:'technical',dir:'engineering',icon:'palette',tone:'tone-violet',file:'color-mixer.js'},
 {id:'pdf',name:'PDF Studio',sub:'Gộp, tách, chỉnh sửa và ký PDF',group:'office',dir:'office',icon:'pdf',tone:'tone-red',file:'pdf-studio.js'},
 {id:'calendar',name:'Âm lịch – Dương lịch',sub:'Tra cứu ngày dương lịch, âm lịch',group:'office',dir:'office',icon:'calendar',tone:'tone-mint',file:'calendar.js'},
 {id:'vietqr',name:'VietQR',sub:'Tạo mã QR chuyển khoản',group:'office',dir:'office',icon:'qr',tone:'tone-violet',file:'vietqr.js'},
 {id:'barcode',name:'Tạo và đọc mã vạch',sub:'Tạo và đọc mã vạch',group:'office',dir:'office',icon:'barcode',tone:'tone-blue',file:'barcode.js'},
 {id:'image-studio',name:'Image Studio',sub:'Chỉnh sửa ảnh và chữ ký',group:'office',dir:'office',icon:'image',tone:'tone-mint',file:'image-studio.js'},
 {id:'money-words',name:'Đọc số tiền bằng chữ',sub:'Đọc số tiền Việt – Anh',group:'office',dir:'office',icon:'file',tone:'tone-blue',file:'money-words.js'},
 {id:'notes',name:'Ghi chú nhanh',sub:'Ghi và lưu ghi chú nhanh',group:'office',dir:'office',icon:'notes',tone:'tone-orange',file:'notes.js'},
 {id:'material-handbook',name:'Vật liệu kỹ thuật',sub:'Tra cứu đặc tính, ứng dụng và tiêu chuẩn vật liệu kỹ thuật',group:'handbook',dir:'handbook',icon:'database',tone:'tone-mint',file:'material-handbook.js'},
 {id:'bearing-handbook',name:'Ổ đỡ',sub:'Đang phát triển',group:'handbook',dir:'handbook',icon:'gear',tone:'tone-blue',file:'bearing-handbook.js'},
 {id:'bolt-handbook',name:'Bu lông',sub:'Đang phát triển',group:'handbook',dir:'handbook',icon:'settings',tone:'tone-orange',file:'bolt-handbook.js'},
 {id:'tolerance-handbook',name:'Dung sai',sub:'Đang phát triển',group:'handbook',dir:'handbook',icon:'ruler',tone:'tone-violet',file:'tolerance-handbook.js'}
]);
const GROUPS=Object.freeze([
 {id:'office',name:'Văn phòng',description:'Tài liệu và tiện ích văn phòng',icon:'file',cls:'category-utility',access:'free'},
 {id:'technical',name:'Kỹ thuật',description:'Tính toán, đo lường và tra cứu kỹ thuật',icon:'calculator',cls:'category-calc',access:'free'},
 {id:'mechanical',name:'Cơ khí',description:'Công cụ cơ khí chuyên ngành',icon:'gear',cls:'category-engineering',access:'specialist'},
 {id:'handbook',name:'Sổ tay',description:'Sổ tay kỹ thuật chuyên ngành',icon:'book',cls:'category-engineering',access:'specialist'}
]);
// Directory for each group; handbook modules can be added in assets/js/handbook/.
const GROUP_DIRECTORIES=Object.freeze({office:'office',technical:'engineering',mechanical:'mechanical',handbook:'handbook'});
const map=new Map(DEFINITIONS.map(t=>[t.id,t]));
const STORAGE_KEY='epsilon-soft.my-tools.v1';
// Mã tool cũ → mã mới (giữ link, ghim và lượt mở cũ khi đổi tên tool)
const LEGACY_TOOL_IDS={qr:'vietqr','nesting-pro':'cutting-plan-plate','bar-cutting-pro-max':'cutting-plan-section',nesting:'cutting-plan-plate','bar-cutting':'cutting-plan-section','bar-cutting-pro':'cutting-plan-section',paint:'coating-plan',beam:'beam-check','beam-analysis':'beam-check'};
let favorites={pinned:[],opens:{}};
let displayMode='grid';
let currentModuleCleanup=null;
let currentRoute=0;
let toastHandle=null;
const main=document.getElementById('app-main');
// Bilingual navigation/content shell; user data and individual tool modules are never translated in place.
const ES_LANGUAGE_KEY='epsilon-soft.language.v1';
let esLanguage='vi';
try { if(localStorage.getItem(ES_LANGUAGE_KEY)==='en') esLanguage='en'; } catch {/* Storage disabled: VI remains available. */}
const ES_EN_TEXT=Object.freeze({
 'van phong & ky thuat':'OFFICE & ENGINEERING',
 'lam viec':'Work',
 'nhanh hon moi ngay.':'smarter every day.',
 'tinh toan · ky thuat · pdf · tien ich':'Calculators · Engineering · PDF · Utilities',
 'dung ngay':'Use instantly',
 'loi ich epsilon blue soft':'Epsilon Blue Soft advantages',
 'trang chu':'Home','huong dan':'Help','so tay':'Handbook','so tay ky thuat chuyen nganh':'Specialist engineering handbook','kham pha cong cu':'Explore tools','kham pha tat ca cong cu':'Explore all tools',
 'danh muc':'CATEGORIES','tat ca cong cu':'All tools','cong cu':'Tools',
 'tinh toan':'Calculations','ky thuat':'Engineering','tai lieu & tien ich':'Documents & Utilities',
 'tai lieu va tien ich':'Documents & Utilities','tai lieu, lich va cac tien ich khac':'Documents, calendars & utilities',
 'my tools':'My tools','epsilon blue hub':'EPSILON BLUE HUB',
 'cong cu va he sinh thai':'Tools and ecosystem','danh muc epsilon blue soft':'Epsilon Blue Soft categories',
 'mo danh muc':'Open categories','thu gon thanh danh muc':'Collapse categories',
 'mo rong thanh danh muc':'Expand categories','mo menu':'Open menu',
 'cong cu ky thuat va van phong':'ENGINEERING & OFFICE TOOLS',
 'ho tro cong viec hang ngay. nhanh gon va de dung.':'Everyday tools. Fast, practical and easy to use.',
 'tinh toan · ky thuat · xu ly tai lieu · tien ich · va nhieu cong cu huu ich khac':'Calculations · Engineering · Documents · Utilities · And more',
 'van phong mien phi':'Free office tools','ky thuat chuyen sau':'Advanced engineering',
 'dang hoan thien':'In development','dinh huong chuyen sau':'Advanced development',
 'cac cong cu ky thuat dang cong khai phuc vu tinh toan va tra cuu; can kiem chung ket qua khi ap dung thuc te.':'Public engineering tools support calculation and reference; verify results before use.',
 'cong cu ky thuat chuyen sau se duoc phat trien trong epsilon blue soft. quyen vip chi ap dung khi hoan thien phan quyen thuc te.':'Advanced engineering is being developed within Epsilon Blue Soft. VIP access requires real authorization.',
 'thong tin lien he':'Contact information',
 'mien phi':'Free','khong can tai khoan':'No account required',
 'su dung ngay tren trinh duyet':'Use instantly in your browser',
 'nhieu cong cu huu ich':'Useful tools','trong mot nen tang':'on one platform',
 'giao dien hien dai, de su dung':'Modern, easy-to-use interface',
 'hoat dong ngay tren trinh duyet':'Works directly in your browser',
 'phu hop cong viec, hoc tap va ky thuat':'For work, study and engineering',
 'kham pha cong cu':'Explore tools',
 'cai app':'Install App','gioi thieu va lien he':'About & Contact',
 'cai app epsilon blue soft len thiet bi':'Install Epsilon Blue Soft on this device',
 'gioi thieu va lien he epsilon blue soft':'About and contact Epsilon Blue Soft',
 'chon cong cu phu hop hoac tim kiem nhanh':'Choose a tool or search quickly',
 'chon cong cu phu hop':'Choose a suitable tool',
 'cac cong cu anh/chi da ghim bang ngoi sao':'Your starred tools',
 'tinh toan nhanh, chinh xac, tien loi':'Quick, accurate and convenient calculations',
 'ho tro cong viec chuyen mon':'Professional engineering tools',
 'cong cu ky thuat chuyen sau':'Advanced engineering tools',
 'cat thep hinh 1d':'1D Steel Bar Cutting',
 'toi uu cat cay thep · giam hao phi':'Optimize steel bar cutting · reduce waste',
 'phien ban basic':'BASIC EDITION',
 'dinh huong phat trien':'IN DEVELOPMENT PLAN',
 'cac cong cu tai day la phien ban co ban, phu hop tinh toan va tra cuu ky thuat hang ngay.':'These are Basic tools for everyday engineering calculations and reference.',
 'cac cong cu ky thuat chuyen sau duoc phat trien trong epsilon blue soft.':'Advanced engineering tools are developed within Epsilon Blue Soft.',
 'xu ly tai lieu, lich va tien ich khac':'Documents, calendars and everyday utilities',
 'tim cong cu...':'Search tools...','tim kiem cong cu':'Search tools',
 'dang luoi':'Grid view','dang danh sach':'List view',
 'danh sach cong cu, dung chuot hoac phim mui ten de cuon':'Scrollable tools list; use mouse or arrow keys',
 'khong tim thay cong cu phu hop. hay thu tu khoa khac.':'No matching tools. Try another keyword.',
 'chua co cong cu nao':'No pinned tools yet',
 'nhan ⭐ tai mot cong cu de them vao my tools.':'Star a tool to add it to My tools.',
 'dang phat trien':'In development',
 'them vao my tools':'Add to My tools','da them vao my tools':'Added to My tools',
 'ghim':'Pin','bo ghim':'Unpin','cong cu lien quan':'Related tools',
 'dang mo cong cu...':'Opening tool...','dang kiem tra...':'Checking...',
 'xu ly tai trinh duyet':'Processed in your browser',
 'khong the tai cong cu. vui long kiem tra tep javascript tuong ung roi tai lai trang.':'Unable to load this tool. Check its JavaScript file, then reload.',
 'dang test noi bo':'INTERNAL TESTING',
 'gioi thieu epsilon blue soft':'About Epsilon Blue Soft',
 'ket noi cac san pham va ung dung thuoc he sinh thai epsilon.':'Connecting products and apps across the Epsilon ecosystem.',
 'dang tai danh sach san pham...':'Loading products...',
 'chua co san pham nao trong danh muc.':'No products are listed yet.',
 'truy cap san pham':'Visit product',
 'lien ket dang duoc cap nhat':'Link coming soon',
 'thu tai lai':'Try again',
 'khong tai duoc danh sach san pham tu':'Unable to load the product list from',
 'lop 1 – epsilon edu':'Grade 1 – Epsilon Blue Edu',
 'hoc toan, tieng viet va tieng anh theo chuong trinh epsilon edu.':'Study Math, Vietnamese and English with Epsilon Blue Edu.',
 'cac phan mem, tien ich va giai phap ky thuat trong he sinh thai epsilon.':'Software, utilities and engineering solutions in the Epsilon ecosystem.',
 'huong dan su dung':'User guide',
 'cai app tren dien thoai, may tinh bang va windows':'Install the app on phone, tablet and Windows',
 'nhan nut cai app o cuoi trang hoac ben duoi de them epsilon blue soft vao thiet bi nhu mot ung dung.':'Press Install App at the bottom of the page or below to add Epsilon Blue Soft to your device as an app.',
 'windows (chrome / edge)':'Windows (Chrome / Edge)',
 'android (chrome)':'Android (Chrome)',
 'iphone / ipad (safari)':'iPhone / iPad (Safari)',
 'nhan cai app va xac nhan cai dat khi trinh duyet hoi. neu khong hien hop thoai, mo menu chrome/edge hoac bieu tuong cai dat tren thanh dia chi.':'Press Install App and confirm if the browser prompts you. Otherwise, use the Chrome/Edge menu or the install icon in the address bar.',
 'mo trang bang chrome, nhan cai app. neu khong thay hop thoai cai dat, chon menu ⋮ → cai dat ung dung hoac them vao man hinh chinh.':'Open this site in Chrome and select Install App. If no prompt appears, open menu ⋮ → Install app or Add to Home screen.',
 'mo trang bang safari, chon chia se → them vao man hinh chinh. nut cai app tren trang se hien huong dan neu safari khong ho tro hop thoai cai dat.':'Open this site in Safari, then Share → Add to Home Screen. The Install App button will show instructions if Safari cannot display an install prompt.',
 'day la web app duoc cai tu trinh duyet. can trinh duyet ho tro va website https; mot so thiet bi chi tao loi tat, va mot so cong cu van can internet.':'This Web App is installed through your browser. A compatible browser and HTTPS are required; some devices may only create a shortcut, and some tools still require internet access.',
 'cong cu van phong mien phi; ky thuat chuyen sau theo lo trinh phat trien.':'Office tools are free; advanced engineering tools follow the development roadmap.',
 'nhan ngoi sao ⭐ tren cong cu de ghim. chi cong cu da ghim moi xuat hien trong my tools. du lieu nay duoc luu tren trinh duyet hien tai.':'Star a tool to pin it. Only pinned tools appear in My tools. Preferences are stored in this browser.',
 'danh muc va tim kiem':'Categories and search',
 'chon chu de tren trang chu hoac trong sidebar khi dang dung cong cu. go ten cong cu trong o tim kiem; phim / giup mo o tim kiem nhanh.':'Choose a category from the sidebar. Search by tool name, or press / to focus the search field.',
 'du lieu va quyen rieng tu':'Data and privacy',
 'cac cong cu uu tien xu ly du lieu ngay tai trinh duyet. mot so module co the tai thu vien tu nguon ngoai; hay xem gioi han va huong dan ngay trong module.':'Tools prioritize on-device processing. Some modules load external libraries; check their instructions and limitations.',
 'ket qua ky thuat':'Engineering results',
 'doi chieu don vi do, dau vao va tieu chuan ap dung truoc khi su dung so lieu trong cong viec thuc te.':'Verify units, inputs and applicable standards before using results professionally.',
 'da hieu':'Got it',
 'cong cu van phong mien phi va cong cu ky thuat chuyen sau.':'Free office tools and advanced engineering tools.',
 'du lieu tinh toan duoc xu ly trong trinh duyet cua ban.':'Your calculations are processed in your browser.',
 'bo qua dieu huong':'Skip navigation',
 'may tinh khoa hoc':'Scientific Calculator','phep tinh va ham toan hoc':'Arithmetic and mathematical functions',
 'dien tich hinh hoc':'Geometry Area','tinh dien tich nhieu hinh':'Area of common geometric shapes',
 'khoi luong vat lieu':'Material Mass','tinh nhanh theo kich thuoc':'Mass from dimensions',
 'doi don vi':'Unit Converter','chuyen doi don vi da dang':'Convert measurement units',
 'tinh lai suat':'Interest Calculator','tien gui, vay von, dau tu':'Savings, loans and investments',
 'trai phoi 2d':'2D Nesting','trai phoi 2d co ban':'Basic 2D nesting',
 'khoi luong rieng':'Material Density','tra cuu khoi luong rieng (kg/m³)':'Density reference (kg/m³)',
 'tinh ket cau don gian':'Basic Structural Analysis','beam check':'Beam Check','dam don gian: m, v, do vong':'Simple beams: bending, shear and deflection',
 'paint studio':'Paint Studio','coating plan':'Coating Plan','tinh luong son · wft/dft · dien tich':'Paint quantity · WFT/DFT · surface area',
 'gop, tach, chinh sua, ky ten va chuyen doi pdf':'Merge, split, edit, sign and convert PDFs',
 'am lich – duong lich':'Lunar & Solar Calendar','tra cuu ngay thang, lich van nien':'Explore dates and lunar calendars',
 'tao ma qr chuyen khoan ngan hang':'Bank transfer QR code',
 'tao va doc ma vach':'Create & Read Barcodes','tao code 39 va quet neu ho tro':'Create Code 39 and scan if supported',
 'nen, cat, xoay anh va tach nen chu ky':'Compress, crop, rotate images and remove signature backgrounds',
 'doc so tien bang chu':'Amount in Words','doc so tien viet – anh, sao chep nhanh':'Vietnamese & English amount reading',
 'ghi chu nhanh':'Quick Notes','viet, luu va tai ghi chu':'Write, save and download notes',
 'khong yeu cau tai khoan':'No account required',
 'van phong':'Office','co khi':'Mechanical','cai dat':'Settings','tai khoan':'Account',
 'danh muc cong cu':'Tool categories','ngon ngu giao dien':'Interface language',
 'tuy chon ngon ngu duoc luu tren trinh duyet nay.':'Your language choice is saved in this browser.',
 'chuyen doi giua tieng viet va tieng anh.':'Switch between Vietnamese and English.',
 'chon vi hoac en o goc phai header de doi ngon ngu.':'Select VI or EN in the top-right header to switch languages.',
 'van phong va ky thuat mien phi; co khi la nhom chuyen nganh.':'Office and engineering are free; mechanical tools are specialist tools.',
 'chua co he thong tai khoan hoac thu phi.':'Account and payment features are not available yet.',
 'he thong tai khoan dang duoc phat trien.':'Account features are in development.',
 'co khi chuyen nganh':'Specialist mechanical tools',
 'danh muc cong cu theo nhom':'Tools by category',
 'chuyen nganh':'Specialist','du kien tra phi':'Paid access planned',
 'van phong free':'Office Free','ky thuat free':'Engineering Free',
 'van phong free · ky thuat free · co khi chuyen nganh':'Office Free · Engineering Free · Mechanical Specialist',
 'co khi chuyen nganh · du kien tra phi':'Specialist mechanical tools · paid access planned',
 'cong cu co khi chuyen nganh · du kien tra phi':'Specialist mechanical tools · paid access planned','cong cu co khi chuyen nganh':'Specialist mechanical tools',
 'cong cu van phong mien phi':'Free office tools',
 'tinh toan, do luong va tra cuu ky thuat mien phi':'Free engineering calculations, measurements and references',
 'tuy chon hien thi tren thiet bi nay.':'Display preferences on this device.',
 'du lieu ca nhan':'Personal data',
 'my tools va tuy chon ngon ngu hien duoc luu trong trinh duyet. chua co dong bo tai khoan hoac google drive.':'My tools and language settings are saved in this browser. Account and Google Drive synchronization are not available.',
 'chua trien khai':'Not available yet',
 'dang mo epsilon blue soft...':'Opening Epsilon Blue Soft...'
});
const esOriginalNodes=new WeakMap();
const esOriginalAttrs=new WeakMap();
function esTranslateValue(original){
 if(esLanguage!=='en')return original;
 const trimmed=original.trim();if(!trimmed)return original;
 const normalized=normalize(trimmed).replace(/\s+/g,' ');
 if(normalized==='epsilon blue hub')return original;
 let replacement=ES_EN_TEXT[normalized];
 // Translate publicly displayed tool headings by category; do not modify workspaces.
 const suffixes=[[' · mien phi · xu ly tai trinh duyet',' · Free · In-browser'],[' · ky thuat chuyen sau · xu ly tai trinh duyet',' · Advanced engineering · In-browser']];
 for(const [suffix,description] of suffixes){
  if(!replacement && normalized.endsWith(suffix)){
   const name=normalized.slice(0,-suffix.length);
   const before=ES_EN_TEXT[name];
   if(before)replacement=before+description;
  }
 }
 if(!replacement)return original;
 const first=original.indexOf(trimmed);
 return original.slice(0,first)+replacement+original.slice(first+trimmed.length);
}
function esTranslateRegion(root){
 if(!root)return;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 let node;
 while((node=walker.nextNode())){
  if(node.parentElement?.closest('#tool-workspace'))continue;
  if(node.parentElement?.closest('.es-language-picker'))continue;
  if(!esOriginalNodes.has(node))esOriginalNodes.set(node,node.nodeValue);
  node.nodeValue=esTranslateValue(esOriginalNodes.get(node));
 }
 const nodes=[root,...root.querySelectorAll('[aria-label],[title],[placeholder]')];
 for(const el of nodes){
  if(!el.hasAttribute||el.closest?.('#tool-workspace'))continue;
  let saved=esOriginalAttrs.get(el);
  if(!saved){saved={};esOriginalAttrs.set(el,saved);}
  for(const attr of ['aria-label','title','placeholder']){
   if(el.hasAttribute(attr)){
    if(!Object.hasOwn(saved,attr))saved[attr]=el.getAttribute(attr);
    el.setAttribute(attr,esTranslateValue(saved[attr]));
   }
  }
 }
}
function esUpdateLanguageButtons(){
 document.documentElement.lang=esLanguage;
 for(const b of document.querySelectorAll('[data-es-lang]')){
  const chosen=b.dataset.esLang===esLanguage;
  b.setAttribute('aria-pressed',String(chosen));
  b.setAttribute('aria-label',b.dataset.esLang==='vi'?'Vietnamese':'English');
 }
}
function esSetLanguage(next){
 if(next!=='vi'&&next!=='en')return;
 esLanguage=next;
 try{localStorage.setItem(ES_LANGUAGE_KEY,next);}catch{/* Private browsing may forbid storage. */}
 esUpdateLanguageButtons();
 // Text nodes only: no re-mount, no resets of calculator/history/document tool state.
 esTranslateRegion(document.body);
 renderSidebar();
 if(location.hash.startsWith('#/ecosystem'))void populateEcosystem(currentRoute);
 const heroLayer=document.getElementById('es-hero-dialog-layer');
 if(heroLayer && !heroLayer.hidden){heroLayer.innerHTML=esHeroDialogContent(heroLayer.dataset.mode||'about');heroLayer.querySelector('[data-es-hero-close]')?.focus();}
}
function esLanguagePickerHtml(){
 return `<div class="es-language-picker" role="group" aria-label="Language / Ngôn ngữ">
   <button type="button" class="es-language-btn" data-es-lang="vi">VI</button>
   <button type="button" class="es-language-btn" data-es-lang="en">EN</button>
  </div>`;
}
// Place the existing language switch at the far right of the global header.
// Use the same data-es-lang delegated handler, language state, and localStorage key.
function mountHeaderLanguagePicker(){
 const header=document.querySelector('.site-header .header-inner');
 if(!header || header.querySelector('.es-language-picker'))return;
 header.insertAdjacentHTML('beforeend',esLanguagePickerHtml());
}

function readPreferences(){
 try{
  const raw=localStorage.getItem(STORAGE_KEY);if(!raw||raw.length>4096)return;
  const val=JSON.parse(raw);if(!val||typeof val!=='object')return;
  const ids=new Set(DEFINITIONS.filter(t=>!t.planned).map(t=>t.id));
  if(Array.isArray(val.pinned))favorites.pinned=[...new Set(val.pinned.map(x=>LEGACY_TOOL_IDS[x]||x).filter(x=>typeof x==='string'&&ids.has(x)))].slice(0,30);
  if(val.opens&&typeof val.opens==='object'&&!Array.isArray(val.opens)){
   for(const id of ids){const n=val.opens[id] ?? Object.keys(LEGACY_TOOL_IDS).filter(o=>LEGACY_TOOL_IDS[o]===id).map(o=>val.opens[o]).find(v=>v!==undefined);if(Number.isSafeInteger(n)&&n>0)favorites.opens[id]=Math.min(n,1000000);}
  }
 }catch{/* Continue in memory when browser storage is unavailable/corrupt. */}
}
function savePreferences(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(favorites));}catch{/* in-memory fallback */}}
function showToast(message,type='success'){
 const region=document.getElementById('toast-region');region.replaceChildren();
 const toast=document.createElement('div');toast.className='toast '+type;toast.textContent=String(message);region.append(toast);
 clearTimeout(toastHandle);toastHandle=setTimeout(()=>toast.remove(),3100);
}
function isPinned(id){return favorites.pinned.includes(id)}
function togglePin(id){
 const t=map.get(id);if(!t||t.planned)return;
 const had=isPinned(id);
 favorites.pinned=had?favorites.pinned.filter(x=>x!==id):[...favorites.pinned,id];
 savePreferences();showToast(esLanguage==='en'?(had?`Unpinned ${ES_EN_TEXT[normalize(t.name)]||t.name}`:`Pinned ${ES_EN_TEXT[normalize(t.name)]||t.name} to My tools`):(had?`Đã bỏ ghim ${t.name}`:`Đã thêm ${t.name} vào My tools`));
 const active=document.querySelector('.page-home');if(active)renderGroupCards();
 document.querySelectorAll('.tool-page input[data-tool-pin]').forEach(control=>{if(control.dataset.toolPin===id)control.checked=isPinned(id);});
}
function preferredTools(){
 // My tools is opt-in only: visits must never add a tool automatically.
 // Preserve the order in which users starred their tools.
 return favorites.pinned.map(id=>map.get(id)).filter(t=>t&&!t.planned);
}
// My tools access in the header (landscape widths). The list is ALWAYS sourced from
// the same favorites state as the sidebar and the portrait bottom category dock.
// Keep Help in the sidebar; replace its header tab with the Handbook section.
// The base index.html remains compatible: no extra file needs replacing.
function prepareHeaderNavigation(){
 const nav=document.getElementById('main-nav');
 if(!nav)return;
 const help=nav.querySelector('a[data-nav="help"]');
 if(!nav.querySelector('a[data-nav="handbook"]')){
  const link=document.createElement('a');
  link.className='nav-link';
  link.href='#/category/handbook';
  link.dataset.nav='handbook';
  link.innerHTML=`${icon('book',20)}<span>Sổ tay</span>`;
  if(help)help.before(link);else nav.append(link);
 }
 help?.remove();
}
function buildHeaderMyTools(){
 const nav=document.getElementById('main-nav');
 if(!nav || nav.querySelector('#es-header-mytools'))return;
 const area=document.createElement('div');area.id='es-header-mytools';area.className='es-header-mytools';
 area.innerHTML=`<a class="nav-link es-header-mytools-link" id="es-header-mytools-link" data-nav="mytools" href="#/mytools" aria-label="My tools">${icon('star',18)}<span>My tools</span><span class="es-header-mytools-count" id="es-header-mytools-count">0</span></a>
  <button type="button" class="es-header-mytools-toggle" data-header-mytools-toggle aria-expanded="false" aria-controls="es-header-mytools-menu" aria-label="Xổ danh sách My tools" title="Xổ danh sách My tools">${icon('chevron-down',20)}</button>
  <div class="es-header-mytools-menu" id="es-header-mytools-menu" aria-label="Danh sách công cụ đã ghim" hidden></div>`;
 nav.insertBefore(area,nav.querySelector('[data-nav="office"]'));
 refreshHeaderMyTools();
}
// The three approved categories have separate navigation links and disclosure buttons.
// Reuse existing tool IDs and the same dropdown interaction model as My tools.
function buildHeaderCategoryMenus(){
 const nav=document.getElementById('main-nav');
 if(!nav)return;
 for(const group of GROUPS){
  const link=nav.querySelector(`a[data-nav="${group.id}"]`);
  if(!link || link.closest('.es-header-category'))continue;
  const area=document.createElement('div');
  area.className='es-header-mytools es-header-category';
  area.dataset.headerCategory=group.id;
  area.id=`es-header-category-${group.id}`;
  const toggle=document.createElement('button');
  toggle.type='button';
  toggle.className='es-header-mytools-toggle es-header-category-toggle';
  toggle.dataset.headerCategoryToggle=group.id;
  toggle.setAttribute('aria-expanded','false');
  toggle.setAttribute('aria-controls',`es-header-category-menu-${group.id}`);
  toggle.innerHTML=icon('chevron-down',20);
  const menu=document.createElement('div');
  menu.className='es-header-mytools-menu es-header-category-menu';
  menu.id=`es-header-category-menu-${group.id}`;
  menu.hidden=true;
  const oldFree=link.querySelector('.es-nav-free');
  oldFree?.remove(); // Remove legacy access badges; category navigation remains unchanged.
  if((group.id==='mechanical'||group.id==='handbook')&&!link.querySelector('.es-specialist-lock')){
   link.insertAdjacentHTML('beforeend',`<span class="es-specialist-lock" aria-hidden="true">${icon('lock',14)}</span>`);
  }
  link.classList.add('es-header-mytools-link','es-header-category-link');
  nav.insertBefore(area,link);
  area.append(link,toggle,menu);
 }
 refreshHeaderCategoryMenus();
}
function refreshHeaderCategoryMenus(){
 for(const group of GROUPS){
  const area=document.getElementById(`es-header-category-${group.id}`);
  if(!area)continue;
  const label=esLanguage==='en'?({office:'Office',technical:'Engineering',mechanical:'Mechanical',handbook:'Handbook'}[group.id]):group.name;
  const toggle=area.querySelector('[data-header-category-toggle]');
  const action=esLanguage==='en'?`Show ${label} tools`:`Xổ danh sách công cụ ${label}`;
  if(toggle){toggle.setAttribute('aria-label',action);toggle.title=action;}
  const menu=area.querySelector('.es-header-category-menu');
  if(!menu)continue;
  menu.setAttribute('aria-label',esLanguage==='en'?`${label} tools`:`Công cụ ${label}`);
  const tools=DEFINITIONS.filter(t=>t.group===group.id&&!t.planned);
  const title=esLanguage==='en'?`${label} · ${tools.length} tools`:`${label} · ${tools.length} công cụ`;
  menu.innerHTML=`<div class="es-header-mytools-menu-title">${icon(group.icon,18)} <span>${escapeHTML(title)}</span></div><div class="es-header-mytools-items">${tools.map(t=>{
   const name=esLanguage==='en'?(ES_EN_TEXT[normalize(t.name)]||t.name):t.name;
   return `<a class="es-header-mytools-item" href="#/tool/${encodeURIComponent(t.id)}" title="${escapeHTML(name)}">${icon(t.icon,19)}<span>${escapeHTML(name)}</span></a>`;
  }).join('') || `<p class="es-header-mytools-empty">${esLanguage==='en'?'Handbook entries will be added soon.':'Nội dung Sổ tay đang được cập nhật.'}</p>`}</div>`;
 }
}
function closeHeaderCategoryMenus(restoreFocus=false){
 for(const area of document.querySelectorAll('.es-header-category')){
  const menu=area.querySelector('.es-header-category-menu');
  if(!menu || menu.hidden)continue;
  menu.hidden=true;
  const toggle=area.querySelector('[data-header-category-toggle]');
  toggle?.setAttribute('aria-expanded','false');
  if(restoreFocus)toggle?.focus({preventScroll:true});
 }
}
function closeHeaderMyTools(restoreFocus=false){
 const area=document.getElementById('es-header-mytools');if(!area)return;
 const menu=area.querySelector('#es-header-mytools-menu');
 if(!menu || menu.hidden)return;
 menu.hidden=true;
 const toggle=area.querySelector('[data-header-mytools-toggle]');
 toggle?.setAttribute('aria-expanded','false');
 if(restoreFocus)toggle?.focus({preventScroll:true});
}
function refreshHeaderMyTools(){
 const area=document.getElementById('es-header-mytools');if(!area)return;
 const pinned=preferredTools();
 const count=area.querySelector('#es-header-mytools-count');
 if(count)count.textContent=String(pinned.length);
 const link=area.querySelector('#es-header-mytools-link');
 if(link)link.classList.toggle('is-active',location.hash==='#/mytools');
 const toggle=area.querySelector('[data-header-mytools-toggle]');
 if(toggle){const label=esLanguage==='en'?'Show pinned tools':'Xổ danh sách My tools';toggle.setAttribute('aria-label',label);toggle.title=label;}
 const menu=area.querySelector('#es-header-mytools-menu');if(!menu)return;
 const heading=esLanguage==='en'?'My tools · Pinned tools':'My tools · Công cụ đã ghim';
 const list=pinned.length?pinned.map(t=>{
  const title=esLanguage==='en'?(ES_EN_TEXT[normalize(t.name)]||t.name):t.name;
  return `<a class="es-header-mytools-item" href="#/tool/${encodeURIComponent(t.id)}" title="${escapeHTML(title)}">${icon(t.icon,19)}<span>${escapeHTML(title)}</span></a>`;
 }).join(''):`<div class="es-header-mytools-empty">${esLanguage==='en'?'No pinned tools yet. Use the star on a tool to add it.':'Chưa có công cụ đã ghim. Nhấn ngôi sao trên công cụ để thêm vào My tools.'}<a href="#/category/office">${esLanguage==='en'?'Explore tools':'Khám phá công cụ'}</a></div>`;
 menu.innerHTML=`<div class="es-header-mytools-menu-title">${icon('star',18)} <span>${heading}</span></div><div class="es-header-mytools-items">${list}</div>`;
}
function toolCard(t){
 const action=t.planned?`<div class="tool-link"><div class="tool-tile ${t.tone}">${icon(t.icon,27)}</div><div class="tool-names"><b>${t.name}</b><small title="${escapeHTML(t.sub)}">${t.sub}</small><span class="soon-label">Đang phát triển</span></div></div>`:
 `<a class="tool-link" href="#/tool/${t.id}" aria-label="Mở ${t.name}"><span class="tool-tile ${t.tone}">${icon(t.icon,27)}</span><span class="tool-names"><b>${t.name}</b><small title="${escapeHTML(t.sub)}">${t.sub}</small></span></a>`;
 return `<article class="tool-card ${t.planned?'is-planned':'is-ready'}" data-card="${t.id}" data-search="${normalize(t.name+' '+t.sub)}">${action}${t.planned?'':`<button class="star-btn" type="button" data-pin="${t.id}" aria-label="${isPinned(t.id)?'Bỏ ghim':'Ghim'} ${t.name}" aria-pressed="${isPinned(t.id)}" title="${isPinned(t.id)?'Bỏ ghim':'Thêm vào My tools'}">${icon('star')}</button>`}</article>`;
}
// Web-first navigation. All tools keep their existing IDs and mount(root, ctx) APIs.
const SYSTEM_JSON = 'ecosystem.json';
let sidebarIsCollapsed = false;
let activeCatalog = 'all';
let modalPreviousFocus = null;

function escapeHTML(value) {
 return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function safeExternalUrl(value, driveOnly = false) {
 if (typeof value !== 'string' || value.length > 2048) return '';
 try {
  const u = new URL(value);
  if (u.protocol !== 'https:' || u.username || u.password) return '';
  if (driveOnly && !['drive.google.com', 'docs.google.com'].includes(u.hostname.toLowerCase())) return '';
  return u.href;
 } catch { return ''; }
}
async function readStaticJson(filename, maximum = 60000) {
 const response = await fetch(new URL('./assets/data/' + filename, document.baseURI), { cache: 'no-store', credentials: 'same-origin' });
 if (!response.ok) throw Error('Không tải được ' + filename + ' (HTTP ' + response.status + ').');
 const raw = await response.text();
 if (raw.length > maximum) throw Error(filename + ' vượt dung lượng cho phép.');
 return JSON.parse(raw);
}
// Read either the new two-level Hub JSON or the former flat products array.
// All JSON labels are escaped before HTML insertion; links must be HTTPS.
function normalizedEcosystem(data){
 if(!data || typeof data!=='object' || Array.isArray(data))throw Error('Invalid Hub JSON');
 const defaults=[
  {id:'edu',name:'Epsilon Blue Edu',nameEn:'Epsilon Blue Edu',description:'Các chương trình giáo dục và tự học thuộc hệ sinh thái Epsilon.',descriptionEn:'Education and self-study apps in the Epsilon ecosystem.',icon:'book',products:[]}
 ];
 let groups;
 if(Array.isArray(data.groups)){
  if(data.groups.length>12)throw Error('Too many Hub groups');
  groups=data.groups;
 }else if(Array.isArray(data.products)){
  if(data.products.length>150)throw Error('Too many Hub products');
  groups=defaults.map(g=>({...g,products:data.products.filter(p=>p && (
   String(p.group||'').toLowerCase()===g.id ||
   (!p.group && (g.id==='edu' ? /edu|lớp|class/i.test(String(p.name||'')) : !/edu|lớp|class/i.test(String(p.name||''))))
  ))}));
 }else throw Error('Missing groups/products');
 const icons=new Set(['book','grid','calculator','gear','image','file','files','lightbulb','home','shield','orbit','windows','monitor']);
 const safeString=(value,limit)=>typeof value==='string'?value.trim().slice(0,limit):'';
 const normalized=groups.filter(g=>g&&typeof g==='object'&&String(g.id||'').toLowerCase()!=='lab').map(g=>{
  const id=safeString(g.id,32).toLowerCase();
  if(!/^[a-z0-9-]{1,32}$/.test(id))return null;
  const list=Array.isArray(g.products)?g.products:(Array.isArray(g.items)?g.items:[]);
  if(list.length>150)throw Error('Too many products in '+id);
  const products=list.filter(p=>p&&typeof p==='object'&&p.visible!==false).map(p=>{
   const name=safeString(p.name||p.title,90);
   if(!name)return null;
   const url=(p.enabled===false||p.status==='draft')?'':safeExternalUrl(p.url);
   const logo=safeString(p.logo,180);
   return {id:safeString(p.id,45),name,nameEn:safeString(p.nameEn||p.titleEn,90),description:safeString(p.description,320),descriptionEn:safeString(p.descriptionEn,320),url,icon:icons.has(p.icon)?p.icon:'book',logo:/^assets\/images\/[a-z0-9_./-]+\.(png|jpe?g|webp)$/i.test(logo)&&!logo.includes('..')?logo:''};
  }).filter(Boolean);
  return {id,name:safeString(g.name,90)||'Epsilon '+id,nameEn:safeString(g.nameEn,90),description:safeString(g.description,320),descriptionEn:safeString(g.descriptionEn,320),icon:icons.has(g.icon)?g.icon:(id==='edu'?'book':'gear'),products};
 }).filter(Boolean);
 if(!normalized.length)throw Error('No valid Hub groups');
 return normalized;
}
function hubText(item,key){return (esLanguage==='en'&&item[key+'En'])||item[key]||'';}
function hubIconMarkup(product,size){return product.logo?`<img src="./${escapeHTML(product.logo)}" alt="" loading="lazy" decoding="async">`:icon(product.icon,size);}
function hubFamilyStyledLabel(label){
 const text=String(label||'').trim();
 const parts=text.split(/\s+/);
 if(parts.length>=3&&parts[0].toLowerCase()==='epsilon'&&parts[1].toLowerCase()==='blue'){
  return `<span class="es-hub-family-brand">${escapeHTML(parts.slice(0,2).join(' '))}</span><span class="es-hub-family-branch">${escapeHTML(parts.slice(2).join(' '))}</span>`;
 }
 if(parts.length>=2&&parts[0].toLowerCase()==='epsilon'){
  const branch=parts.slice(1).join(' ');
  return `<span class="es-hub-family-brand">${escapeHTML(parts[0])}</span><span class="es-hub-family-branch">${escapeHTML(branch)}</span>`;
 }
 return `<span class="es-hub-family-brand">${escapeHTML(text)}</span>`;
}
function hubFamilyHtml(group){
 const label=hubText(group,'name'),ready=group.products.filter(p=>p.url).length;
 const counts=esLanguage==='en'?`${group.products.length} items · ${ready} available`:`${group.products.length} mục · ${ready} đã có liên kết`;
 return `<a class="es-hub-family-card" data-family="${escapeHTML(group.id)}" href="#/ecosystem/${encodeURIComponent(group.id)}" aria-label="${escapeHTML(esLanguage==='en'?'Explore ':'Khám phá ')}${escapeHTML(label)}">
  <div class="es-hub-family-main"><span class="es-hub-family-icon">${icon(group.icon,32)}</span><div class="es-hub-family-heading"><h2>${hubFamilyStyledLabel(label)}</h2><span class="es-hub-family-count">${escapeHTML(counts)}</span></div></div>
  <p>${escapeHTML(hubText(group,'description'))}</p>
  <span class="es-hub-family-action">${esLanguage==='en'?'Explore products':'Khám phá sản phẩm'} ${icon('arrow',18)}</span>
 </a>`;
}
function hubProductHtml(product,index){
 const hasLink=Boolean(product.url);
 return `<article class="es-hub-product-card" data-hub-tone="${(index%6)+1}"><div class="es-hub-product-top"><span class="es-hub-product-symbol">${hubIconMarkup(product,26)}</span><h3>${escapeHTML(hubText(product,'name'))}</h3></div>
  <p>${escapeHTML(hubText(product,'description'))}</p>
  ${hasLink?`<a class="es-system-link" href="${escapeHTML(product.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHTML((esLanguage==='en'?'Open website for ':'Mở website ') + hubText(product,'name'))}">${esLanguage==='en'?'Open website':'Mở website'} ${icon('external-link',17)}</a>`:`<span class="es-system-pending">${esLanguage==='en'?'Link not yet available':'Chưa cập nhật liên kết'}</span>`}
 </article>`;
}
function makeSidebarLink(id, href, label, iconName, count) {
 const selected = (id === 'all' && ['#/home','#/explore',''].includes(location.hash)) ||
  (id === 'mytools' && location.hash === '#/mytools') ||
  (id === 'ecosystem' && location.hash.startsWith('#/ecosystem')) ||
  (id === 'help' && location.hash === '#/help') ||
  location.hash === '#/category/' + id;
 return `<a class="es-side-link" data-side="${id}" data-label="${escapeHTML(label)}" href="${href}" aria-label="${escapeHTML(label)}" title="${escapeHTML(label)}" ${selected?'aria-current="page"':''}><span class="es-side-icon">${icon(iconName,21)}</span><span class="es-side-name">${escapeHTML(label)}</span>${typeof count === 'number'?`<span class="es-side-count">${count}</span>`:''}</a>`;
}
// Keep one submenu open at a time. No persistent storage or new backend is required.
let sidebarOpenSection = null;
let sidebarHubProducts = null;
let sidebarHubLoading = false;

function sidebarToolsInSection(id){
 if(id==='mytools')return preferredTools();
 if(id==='all')return DEFINITIONS.filter(t=>!t.planned);
 return DEFINITIONS.filter(t=>t.group===id&&!t.planned);
}
function sidebarChildrenHtml(id){
 if(id==='ecosystem'){
  const home=`<a class="es-side-child" href="#/ecosystem">${icon('orbit',17)}<span>${esLanguage==='en'?'Epsilon Blue Hub home':'Tổng quan Epsilon Blue Hub'}</span></a>`;
  const groups=Array.isArray(sidebarHubProducts)&&sidebarHubProducts.length?sidebarHubProducts:[{id:'edu',name:'Epsilon Blue Edu',icon:'book'}];
  return home+groups.map(item=>`<a class="es-side-child" href="#/ecosystem/${escapeHTML(item.id)}" title="${escapeHTML(item.name)}">${icon(item.icon||'orbit',17)}<span>${escapeHTML(item.name)}</span></a>`).join('');
 }
 const items=sidebarToolsInSection(id);
 if(!items.length){
  const message=id==='mytools'
   ?(esLanguage==='en'?'No pinned tools yet. Use the star on a tool to add it.':'Chưa có công cụ đã ghim. Nhấn ngôi sao trên công cụ để thêm vào.')
   :(esLanguage==='en'?'Handbook entries will be added soon.':'Nội dung Sổ tay đang được cập nhật.');
  return `<p class="es-side-empty">${message}</p>`;
 }
 return items.map(t=>{
  const selected=location.hash==='#/tool/'+t.id;
  return `<a class="es-side-child" href="#/tool/${t.id}" ${selected?'aria-current="page"':''} title="${escapeHTML(t.name)}">${icon(t.icon,17)}<span>${escapeHTML(t.name)}</span></a>`;
 }).join('');
}
function makeSidebarExpandable(id,href,label,iconName,count){
 const route=location.hash;
 const open=sidebarOpenSection===id;
 const activeTool=route.startsWith('#/tool/')?map.get(route.slice(7)):null;
 const selected=(id==='all'&&['#/home','#/explore',''].includes(route))||
  (id==='mytools'&&route==='#/mytools')||
  (id==='ecosystem'&&route.startsWith('#/ecosystem'))||
  route==='#/category/'+id||Boolean(activeTool && id===activeTool.group);
 const escapedLabel=escapeHTML(label);
 const logo=id==='ecosystem'?'<img src="./assets/images/epsilon-mark.png?v=20261025-brand-mark" alt="" loading="lazy" decoding="async">':icon(iconName,22);
 const specialistLock=id==='mechanical'||id==='handbook'?` <span class="es-specialist-lock" aria-hidden="true">${icon('lock',14)}</span>`:'';
 const actionLabel=esLanguage==='en'?(open?'Collapse':'Expand'):(open?'Thu gọn':'Mở rộng');
 return `<section class="es-side-section" data-side-section="${id}">
  <div class="es-side-parent ${selected?'is-active':''}">
   <a class="es-side-link" data-side="${id}" data-label="${escapedLabel}" href="${href}" title="${escapedLabel}" aria-label="${escapedLabel}" ${selected?'aria-current="page"':''}><span class="es-side-icon">${logo}</span><span class="es-side-name">${escapedLabel}${specialistLock}</span></a>
   <button type="button" class="es-side-expand" data-side-expand="${id}" aria-expanded="${open}" aria-controls="es-side-children-${id}" aria-label="${actionLabel}: ${escapedLabel}" title="${actionLabel}: ${escapedLabel}">${icon('chevron-down',20)}</button>
   ${typeof count==='number'?`<a href="${href}" class="es-side-count" aria-label="${escapedLabel} (${count})">${count}</a>`:''}
  </div>
  <div class="es-side-children" id="es-side-children-${id}" ${open?'':'hidden'}>${open?sidebarChildrenHtml(id):''}</div>
 </section>`;
}
async function loadSidebarHubProducts(){
 if(sidebarHubLoading||sidebarHubProducts!==null)return;
 sidebarHubLoading=true;
 try{
  const data=await readStaticJson(SYSTEM_JSON);
  sidebarHubProducts=normalizedEcosystem(data).map(g=>({id:g.id,name:hubText(g,'name'),icon:g.icon}));
 }catch(error){sidebarHubProducts=null;console.warn('Sidebar Epsilon Blue Hub:',error);}
 finally{
  sidebarHubLoading=false;
  const panel=document.getElementById('es-side-children-ecosystem');
  if(panel && sidebarOpenSection==='ecosystem'){
   panel.innerHTML=sidebarChildrenHtml('ecosystem');
   esTranslateRegion(panel);
  }
  if(sidebarOpenSection==='ecosystem')renderMobileRail();
 }
}

// All mobile folder links use the exact same routes and published tool definitions as the desktop sidebar.
function mobileRailEntries(){
 return [
  {id:'mytools',href:'#/mytools',label:'My tools',iconName:'star',count:preferredTools().length,expand:true},
  {id:'ecosystem',href:'#/ecosystem',label:'Epsilon Blue Hub',iconName:'orbit',expand:true},
  ...GROUPS.map(g=>({id:g.id,href:'#/category/'+g.id,label:esLanguage==='en'?({office:'Office',technical:'Engineering',mechanical:'Mechanical',handbook:'Handbook'}[g.id]):g.name,
   iconName:g.icon,expand:true,count:DEFINITIONS.filter(t=>t.group===g.id&&!t.planned).length})),
  {id:'settings',href:'#/settings',label:esLanguage==='en'?'Settings':'Cài đặt',iconName:'settings',expand:false},
  {id:'account',href:'#/account',label:esLanguage==='en'?'Account':'Tài khoản',iconName:'user',expand:false},
  {id:'help',href:'#/help',label:esLanguage==='en'?'Help':'Hướng dẫn',iconName:'book',expand:false}
 ];
}
function mobileRailIsActive(entry){
 const hash=location.hash;
 const t=hash.startsWith('#/tool/')?map.get(hash.slice(7)):null;
 return (entry.id==='mytools'&&hash==='#/mytools')||
  (entry.id==='ecosystem'&&hash.startsWith('#/ecosystem'))||
  hash===entry.href||Boolean(t&&entry.id===t.group);
}
function mobileRailFolderHtml(entry){
 const opened=sidebarOpenSection===entry.id;
 const current=mobileRailIsActive(entry);
 const label=escapeHTML(entry.label);
 const graphic=entry.id==='ecosystem'?'<img src="./assets/images/epsilon-mark.png?v=20261025-brand-mark" alt="" width="32" height="32" decoding="async">':icon(entry.iconName,22);
 const ariaLabel=entry.label;
 return `<div class="es-mobile-folder ${current?'is-active':''}" data-mobile-section="${entry.id}">
   <a href="${entry.href}" class="es-mobile-folder-link" title="${escapeHTML(ariaLabel)}" aria-label="${escapeHTML(ariaLabel)}" ${current?'aria-current="page"':''}>
    <span class="es-mobile-folder-icon">${graphic}</span>
    <span class="es-mobile-folder-label">${label}${entry.id==='mechanical'||entry.id==='handbook'?` <span class="es-specialist-lock" aria-hidden="true">${icon('lock',13)}</span>`:''}</span>
   </a>
   ${entry.id==='mytools'?`<span class="es-mobile-folder-count" aria-hidden="true">${entry.count}</span>`:''}
   ${entry.expand?`<button type="button" class="es-mobile-folder-expand" data-mobile-folder="${entry.id}"
    aria-expanded="${opened}" aria-controls="es-mobile-rail-drawer"
    aria-label="${opened?(esLanguage==='en'?'Collapse':'Đóng danh sách'):(esLanguage==='en'?'Show tools in':'Xổ công cụ trong')} ${escapeHTML(ariaLabel)}">${icon('chevron-down',18)}</button>`:''}
  </div>`;
}
function renderMobileRail(){
 const rail=document.getElementById('es-mobile-rail');if(!rail)return;
 const existing=document.getElementById('es-mobile-rail-scroll');const left=existing?.scrollLeft||0;
 const entries=mobileRailEntries();const folder=entries.find(item=>item.id===sidebarOpenSection&&item.expand);
 const railOpen=document.body.classList.contains('es-tool-rail-open');
 rail.innerHTML=`<button type="button" class="es-tool-rail-toggle" id="es-tool-rail-toggle"
    data-tool-rail-toggle aria-expanded="${railOpen}" aria-controls="es-tool-rail-panel"
    aria-label="${railOpen?(esLanguage==='en'?'Collapse the tool categories':'Thu gọn danh mục công cụ'):(esLanguage==='en'?'Expand the tool categories':'Mở danh mục công cụ')}">
    ${icon('chevron-down',24)}
  </button>
  <div class="es-tool-rail-panel" id="es-tool-rail-panel">
   <div class="es-mobile-rail-drawer" id="es-mobile-rail-drawer" ${folder?'':'hidden'}>
    ${folder?`<div class="es-mobile-rail-drawer-head"><span>${icon(folder.iconName,18)} ${escapeHTML(folder.label)}</span><button type="button" class="es-mobile-rail-drawer-close" data-mobile-folder-close aria-label="${esLanguage==='en'?'Close':'Đóng'}">${icon('close',18)}</button></div>
     <div class="es-mobile-rail-drawer-grid">${sidebarChildrenHtml(folder.id)}</div>`:''}
   </div>
   <div class="es-mobile-rail-main">
    <div class="es-mobile-rail-scroll" id="es-mobile-rail-scroll" role="navigation" tabindex="0"
     aria-label="${esLanguage==='en'?'Swipe categories horizontally':'Vuốt ngang để xem các danh mục'}">
     ${entries.map(mobileRailFolderHtml).join('')}
    </div>
   </div>
  </div>`;
 rail.querySelector('#es-mobile-rail-scroll').scrollLeft=left;
 esTranslateRegion(rail);
}

function setToolRailOpen(open){
 const wasOpen=document.body.classList.contains('es-tool-rail-open');
 const enable=Boolean(open&&document.body.classList.contains('es-portrait-layout')&&document.body.classList.contains('es-tool-mode'));
 document.body.classList.toggle('es-tool-rail-open',enable);
 if(!enable&&wasOpen&&sidebarOpenSection!==null){sidebarOpenSection=null;renderSidebar();return;}
 const toggle=document.getElementById('es-tool-rail-toggle');
 if(toggle){
  toggle.setAttribute('aria-expanded',String(enable));
  toggle.setAttribute('aria-label',enable?(esLanguage==='en'?'Collapse the tool categories':'Thu gọn danh mục công cụ'):(esLanguage==='en'?'Expand the tool categories':'Mở danh mục công cụ'));
  toggle.innerHTML=icon('chevron-down',24);
 }
}
function renderSidebar() {
 const nav=document.getElementById('es-side-nav');
 if(!nav)return;
 const scroll=nav.scrollTop;
 nav.innerHTML=[
  makeSidebarExpandable('mytools','#/mytools','My tools','star',preferredTools().length),
  makeSidebarExpandable('ecosystem','#/ecosystem','Epsilon Blue Hub','orbit'),
  '<div class="es-side-divider" aria-hidden="true"></div>',
  ...GROUPS.map(g=>makeSidebarExpandable(g.id,'#/category/'+g.id,g.name,g.icon,DEFINITIONS.filter(t=>t.group===g.id&&!t.planned).length)),
  '<div class="es-sidebar-bottom" id="es-side-utilities">'+
    makeSidebarLink('help','#/help',esLanguage==='en'?'Help':'Hướng dẫn','book')+
    makeSidebarLink('settings','#/settings','Cài đặt','settings')+
    makeSidebarLink('account','#/account','Tài khoản','user')+'</div>'
 ].join('');
 esTranslateRegion(nav);
 nav.scrollTop=scroll;
 renderMobileRail();
 refreshHeaderMyTools();
 refreshHeaderCategoryMenus();
}
function buildSidebarShell() {
 const wrap = document.createElement('div');
 wrap.className = 'es-app-layout shell';
 wrap.id = 'es-app-layout';
 const sidebar = document.createElement('aside');
 sidebar.id = 'es-sidebar';
 sidebar.className = 'es-sidebar';
 sidebar.setAttribute('aria-label','Danh mục Epsilon Blue Soft');
 sidebar.innerHTML = `<div class="es-sidebar-top"><strong class="es-sidebar-title">DANH MỤC</strong><button type="button" class="es-side-toggle" id="es-side-toggle" aria-label="Thu gọn thanh danh mục" title="Thu gọn thanh danh mục">${icon('panel-left-close',21)}</button></div><nav class="es-side-nav" id="es-side-nav" aria-label="Công cụ và hệ sinh thái"></nav>`;
 main.parentNode.insertBefore(wrap,main);
 const mobileRail=document.createElement('nav');
 mobileRail.className='es-mobile-rail';
 mobileRail.id='es-mobile-rail';
 mobileRail.setAttribute('aria-label','Danh mục công cụ trên điện thoại');
 wrap.append(sidebar,mobileRail,main);
 const toolRailBackdrop=document.createElement('div');
 toolRailBackdrop.className='es-tool-rail-backdrop';
 toolRailBackdrop.id='es-tool-rail-backdrop';
 toolRailBackdrop.setAttribute('aria-hidden','true');
 document.body.append(toolRailBackdrop);
 main.classList.remove('shell');
 main.classList.add('es-main-pane');
 document.body.classList.add('es-has-sidebar');
 const backdrop=document.createElement('div');
 backdrop.id='es-mobile-backdrop';
 backdrop.className='es-mobile-backdrop';
 backdrop.setAttribute('aria-hidden','true');
 document.body.append(backdrop);
 const menuButton=document.getElementById('menu-toggle');
 if(menuButton){menuButton.setAttribute('aria-controls','es-sidebar');menuButton.setAttribute('aria-label','Mở danh mục');}
 renderSidebar();
}

function closeMainMenu(){
 document.getElementById('main-nav')?.classList.remove('open');
 if(document.body.classList.contains('es-catalog-mode'))document.getElementById('menu-toggle')?.setAttribute('aria-expanded','false');
}
function closeMobileSidebar() {
 document.getElementById('es-sidebar')?.classList.remove('es-mobile-open');
 document.getElementById('es-mobile-backdrop')?.classList.remove('es-show');
 const toggle=document.getElementById('menu-toggle');
 if(toggle) toggle.setAttribute('aria-expanded','false');
 document.body.style.removeProperty('overflow');
}
function openMobileSidebar() {
 document.getElementById('es-sidebar')?.classList.add('es-mobile-open');
 document.getElementById('es-mobile-backdrop')?.classList.add('es-show');
 const toggle=document.getElementById('menu-toggle');
 if(toggle) toggle.setAttribute('aria-expanded','true');
 document.body.style.overflow='hidden';
}
function setSidebarCollapsed(collapsed) {
 sidebarIsCollapsed=Boolean(collapsed);
 document.getElementById('es-app-layout')?.classList.toggle('es-is-collapsed',sidebarIsCollapsed);
 const btn=document.getElementById('es-side-toggle');
 if(btn){
  btn.innerHTML=icon(sidebarIsCollapsed?'panel-left-open':'panel-left-close',21);
  const label=sidebarIsCollapsed?'Mở rộng thanh danh mục':'Thu gọn thanh danh mục';
  btn.setAttribute('aria-label',label);btn.title=label;
 }
}
function showAppDialog(title, message) {
 const layer=document.getElementById('es-modal-layer');
 if(!layer)return;
 modalPreviousFocus=document.activeElement;
 layer.querySelector('.es-modal h2').textContent=title;
 layer.querySelector('.es-modal p').textContent=message;
 layer.hidden=false;
 esTranslateRegion(layer);
 layer.querySelector('.es-modal-close')?.focus();
}
function closeAppDialog() {
 const layer=document.getElementById('es-modal-layer');
 if(!layer || layer.hidden)return;
 layer.hidden=true;
 if(modalPreviousFocus?.isConnected)modalPreviousFocus.focus();
 modalPreviousFocus=null;
}
function buildAppDialog() {
 const layer=document.createElement('div');
 layer.id='es-modal-layer';layer.className='es-modal-layer';layer.hidden=true;
 layer.innerHTML=`<div class="es-modal" role="dialog" aria-modal="true" aria-labelledby="es-modal-title" aria-describedby="es-modal-text"><span class="es-modal-icon">${icon('info',25)}</span><h2 id="es-modal-title"></h2><p id="es-modal-text"></p><div class="es-modal-actions"><button class="button button-purple es-modal-close" type="button">Đã hiểu</button></div></div>`;
 document.body.append(layer);
}

// Browser install-on-device is the PWA flow; it is not a standalone Windows program.
let esDeferredInstallPrompt=null;
let esHeroDialogPreviousFocus=null;
window.addEventListener('beforeinstallprompt',event=>{
 event.preventDefault();
 esDeferredInstallPrompt=event;
});
window.addEventListener('appinstalled',()=>{
 esDeferredInstallPrompt=null;
 showToast(esLanguage==='en'?'App installed successfully.':'Đã cài Epsilon Blue Soft thành công.');
});
function esPwaIsInstalled(){
 return Boolean(window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone===true);
}
function esHeroInfoText(vi,en){return esLanguage==='en'?en:vi;}
function esHeroDialogContent(mode){
 const T=esHeroInfoText;
 const heading=(mode==='about')?T('Giới thiệu và liên hệ','About & Contact'):mode==='installed'?T('Ứng dụng đã được cài đặt','App already installed'):T('Cài Epsilon Blue Soft trên thiết bị','Install Epsilon Blue Soft');
 let body='';
 if(mode==='about'){
  body=`<p class="es-hero-intro">${T('Epsilon Blue Soft gồm bốn nhóm công cụ: Văn phòng, Kỹ thuật, Cơ khí và Sổ tay.','Epsilon Blue Soft has four tool categories: Office, Engineering, Mechanical, and Handbook.')}</p>
   <div class="es-hero-about-products">
    <article class="es-hero-product"><strong>${icon('grid',20)} ${T('Văn phòng','Office')}</strong><p>${T('Xử lý tài liệu và các tiện ích dùng hằng ngày.','Document processing and everyday utilities.')}</p></article>
    <article class="es-hero-product"><strong>${icon('calculator',20)} ${T('Kỹ thuật','Engineering')}</strong><p>${T('Tính toán, đo lường và tra cứu thông số kỹ thuật.','Engineering calculations, measurements and reference tools.')}</p></article>
    <article class="es-hero-product"><strong>${icon('gear',20)} ${T('Cơ khí','Mechanical')}</strong><p>${T('Công cụ chuyên ngành cho gia công và chế tạo cơ khí.','Specialist mechanical engineering and fabrication tools.')}</p></article>
    <article class="es-hero-product"><strong>${icon('book',20)} ${T('Sổ tay','Handbook')}</strong><p>${T('Tra cứu và tham khảo dữ liệu kỹ thuật chuyên ngành.','Technical reference data and handbooks.')}</p></article>
   </div>
   <a class="es-hero-hub-link" href="#/ecosystem" data-es-go-hub>${icon('orbit',20)} ${T('Khám phá Epsilon Blue Hub','Explore Epsilon Blue Hub')} ${icon('arrow',18)}</a>
   <h3 class="es-hero-contact-title">${T('Thông tin liên hệ','Contact information')}</h3>
   <div class="es-hero-contact-links">
    <a href="mailto:epsilon.vn@gmail.com">${icon('mail',20)} <span>epsilon.vn@gmail.com</span></a>
    <button type="button" class="es-hero-contact-copy" data-es-copy-phone title="${T('Sao chép số điện thoại','Copy phone number')}" aria-label="${T('Sao chép số điện thoại 0978.251.059','Copy phone number 0978.251.059')}">${icon('phone',20)} <span>0978.251.059</span> ${icon('copy',18)}</button>
    <a href="https://zalo.me/0978251059" target="_blank" rel="noopener noreferrer">${icon('message-circle',20)} <span>Zalo</span></a>
   </div>`;
 }else if(mode==='installed'){
  body=`<p class="es-hero-intro">${T('Epsilon Blue Soft đang chạy ở chế độ ứng dụng trên thiết bị này. Anh/chị có thể mở lại từ biểu tượng đã thêm trên màn hình hoặc hệ thống ứng dụng.','Epsilon Blue Soft is already running as an installed app. You can launch it from your home screen or app list.')}</p>`;
 }else{
  body=`<p class="es-hero-intro">${T('Cài phiên bản Web App của Epsilon Blue Soft để mở nhanh từ màn hình chính hoặc menu ứng dụng. Tính năng cài đặt phụ thuộc trình duyệt và cấu hình website.','Install the Epsilon Blue Soft Web App for quick access from your home screen or app list. Installation depends on your browser and the website configuration.')}</p>
   <div class="es-hero-install-devices">
    <div class="es-hero-install-device"><h3>${icon('monitor',21)} Windows</h3><p>${T('Dùng Chrome hoặc Edge. Chọn biểu tượng Cài đặt ở thanh địa chỉ hoặc menu trình duyệt → Cài ứng dụng / Install site as app.','Use Chrome or Edge. Select the install icon in the address bar, or the browser menu → Install app / Install site as app.')}</p></div>
    <div class="es-hero-install-device"><h3>${icon('smartphone',21)} Android</h3><p>${T('Mở bằng Chrome, chọn menu ⋮ → Cài đặt ứng dụng hoặc Thêm vào màn hình chính.','Open in Chrome, then menu ⋮ → Install app or Add to Home screen.')}</p></div>
    <div class="es-hero-install-device"><h3>${icon('tablet',21)} iPhone / iPad</h3><p>${T('Mở bằng Safari → Chia sẻ → Thêm vào Màn hình chính.','Open in Safari → Share → Add to Home Screen.')}</p></div>
   </div>
   <p class="es-hero-install-note">${T('Nếu không thấy tùy chọn cài đặt, hãy thử trình duyệt hỗ trợ PWA và đảm bảo website đang mở qua HTTPS. Một số trình duyệt chỉ cho tạo lối tắt.','If you do not see an install option, use a PWA-compatible browser and an HTTPS website. Some browsers only support creating a shortcut.')}</p>`;
 }
 return `<div class="es-hero-dialog" role="dialog" aria-modal="true" aria-labelledby="es-hero-dialog-title">
  <div class="es-hero-dialog-head"><span class="es-hero-dialog-emblem${mode==='about'?' es-hero-dialog-logo':''}">${mode==='about'?'<img src="./assets/images/epsilon-mark.png?v=20261025-brand-mark" alt="" width="47" height="47" decoding="async">':icon(mode==='installed'?'check':'app-plus',23)}</span><h2 class="es-hero-dialog-title" id="es-hero-dialog-title">${heading}</h2><button type="button" class="es-hero-dialog-close" data-es-hero-close aria-label="${T('Đóng cửa sổ','Close dialog')}" title="${T('Đóng','Close')}">${icon('close',19)}</button></div>
  ${body}</div>`;
}
function esOpenHeroDialog(mode){
 let layer=document.getElementById('es-hero-dialog-layer');
 if(!layer){layer=document.createElement('div');layer.id='es-hero-dialog-layer';layer.className='es-hero-dialog-layer';layer.hidden=true;document.body.append(layer);}
 if(layer.hidden)esHeroDialogPreviousFocus=document.activeElement;
 layer.dataset.mode=mode;
 layer.innerHTML=esHeroDialogContent(mode);
 layer.hidden=false;
 layer.querySelector('[data-es-hero-close]')?.focus();
}
function esCloseHeroDialog(){
 const layer=document.getElementById('es-hero-dialog-layer');
 if(!layer||layer.hidden)return;
 layer.hidden=true;
 layer.replaceChildren();
 if(esHeroDialogPreviousFocus?.isConnected)esHeroDialogPreviousFocus.focus();
 esHeroDialogPreviousFocus=null;
}
// Clipboard-only phone contact: never dial or open an external link.
async function esCopyContactPhone(){
 const display='0978.251.059';
 const value='0978251059';
 let copied=false;
 try{
  if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(value);copied=true;}
 }catch{/* Some browsers block the Clipboard API; try a local fallback. */}
 if(!copied){
  const field=document.createElement('textarea');
  field.value=value;
  field.setAttribute('readonly','');
  field.setAttribute('aria-hidden','true');
  field.style.cssText='position:fixed;left:-9999px;top:0;opacity:0';
  document.body.appendChild(field);
  field.select();
  try{copied=document.execCommand('copy');}catch{/* Browser may restrict clipboard access. */}
  field.remove();
  document.querySelector('[data-es-copy-phone]')?.focus();
 }
 if(copied)showToast(esLanguage==='en'?`Copied phone number: ${display}`:`Đã sao chép số điện thoại: ${display}`);
 else showToast(esLanguage==='en'?'Unable to copy. Please select the number manually.':'Không thể sao chép. Vui lòng chọn và sao chép số thủ công.','error');
}

async function esInstallWebApp(button){
 if(esPwaIsInstalled()){esOpenHeroDialog('installed');return;}
 if(!esDeferredInstallPrompt){esOpenHeroDialog('install');return;}
 const prompt=esDeferredInstallPrompt;
 esDeferredInstallPrompt=null;
 button.disabled=true;
 const label=button.querySelector('span');
 const oldLabel=label?.textContent;
 if(label)label.textContent=esHeroInfoText('Đang mở...','Opening...');
 try{
  await prompt.prompt();
  const result=await prompt.userChoice;
  if(!result || result.outcome!=='accepted')esOpenHeroDialog('install');
 }catch(err){console.warn('PWA install prompt:',err);esOpenHeroDialog('install');}
 finally{
  if(button.isConnected){button.disabled=false;if(label)label.textContent=oldLabel;}
 }
}

function currentCatalogData(){
 if(activeCatalog==='mytools')return {name:'My tools',sub:'Các công cụ anh/chị đã ghim bằng ngôi sao',icon:'star',tools:preferredTools()};
 const g=GROUPS.find(group=>group.id===activeCatalog);
 if(g)return {name:g.name,sub:g.description,icon:g.icon,access:g.access,tools:DEFINITIONS.filter(t=>t.group===g.id&&!t.planned)};
 return {name:'Danh mục công cụ theo nhóm',sub:'Văn phòng · Kỹ thuật · Cơ khí · Sổ tay',icon:'grid',tools:GROUPS.flatMap(group=>DEFINITIONS.filter(t=>t.group===group.id&&!t.planned))};
}
function renderGroupCards(){
 const grid=main.querySelector('#tool-columns');
 if(!grid)return;
 const data=currentCatalogData();
 const query=normalize(main.querySelector('#tool-search')?.value||'');
 const matches=data.tools.filter(t=>!query||normalize([t.name,t.sub,ES_EN_TEXT[normalize(t.name)],ES_EN_TEXT[normalize(t.sub)]].filter(Boolean).join(' ')).includes(query));
 const count=main.querySelector('#catalog-count');if(count)count.textContent=String(matches.length);
 const title=main.querySelector('#catalog-title');if(title)title.textContent=data.name;
 const sub=main.querySelector('#catalog-sub');if(sub)sub.textContent=data.sub;
 const em=main.querySelector('#catalog-icon');if(em)em.innerHTML=icon(data.icon,23);
 grid.classList.toggle('es-view-list',displayMode==='list');
 if(!data.tools.length && activeCatalog==='mytools'){
  grid.innerHTML=`<div class="mytools-empty"><div class="empty-icon">${icon('star',30)}</div><strong>Chưa có công cụ nào</strong><p>Nhấn ⭐ tại một công cụ để thêm vào My tools.</p></div>`;
 }else if(!data.tools.length && activeCatalog==='handbook'){
  grid.innerHTML=`<div class="es-no-matches">${icon('book',26)} <strong>${esLanguage==='en'?'Handbook entries are coming soon.':'Sổ tay đang được cập nhật.'}</strong><p>${esLanguage==='en'?'Specialist engineering references will be added here.':'Nội dung kỹ thuật chuyên ngành sẽ được bổ sung tại đây.'}</p></div>`;
 }else if(!matches.length){
  grid.innerHTML='<div class="es-no-matches">Không tìm thấy công cụ phù hợp. Hãy thử từ khóa khác.</div>';
 }else if(activeCatalog==='all'){
  grid.innerHTML=GROUPS.map(g=>{
   const tools=matches.filter(t=>t.group===g.id);
   if(!tools.length){
    if(g.id!=='handbook'||query)return '';
    return `<div class="es-home-group-title"><a href="#/category/handbook">${icon(g.icon,22)}<span>${escapeHTML(g.name)}</span></a><small>0</small></div><div class="es-no-matches" style="grid-column:1/-1">${esLanguage==='en'?'Handbook entries are coming soon.':'Nội dung Sổ tay đang được cập nhật.'}</div>`;
   }
   return `<div class="es-home-group-title"><a href="#/category/${g.id}">${icon(g.icon,22)}<span>${escapeHTML(g.name)}</span></a><small>${tools.length}</small></div>`+tools.map(toolCard).join('');
  }).join('');
 }else grid.innerHTML=matches.map(toolCard).join('');
 renderSidebar();
 esTranslateRegion(main.querySelector('.es-directory'));
}
function applySearch(raw){
 const input=main.querySelector('#tool-search');if(input && input.value!==raw)input.value=raw;
 renderGroupCards();
}
// Banner content is managed in app.js. Neither banner artwork includes promotional words.
// Keep copy localized through the existing VI/EN presentation layer without touching tool modules.
const BANNER_CONTENT = Object.freeze({
 main:Object.freeze({
  eyebrow:'VĂN PHÒNG & KỸ THUẬT',
  brand:'EPSILON BLUE',branch:'SOFT',
  tagline:'Hỗ trợ công việc hằng ngày. Nhanh gọn và dễ dùng.',
  description:'Tính toán · Kỹ thuật · Xử lý tài liệu · Tiện ích · Và nhiều công cụ hữu ích khác',
  perks:['Văn phòng','Kỹ thuật','Cơ khí chuyên ngành'],
  cardTitle:'Nhiều công cụ hữu ích',cardTitleSecond:'trong một nền tảng',
  cardBullets:['Giao diện hiện đại, dễ sử dụng','Hoạt động ngay trên trình duyệt','Phù hợp công việc, học tập và kỹ thuật'],
  installLabel:'Cài APP',aboutLabel:'Giới thiệu và liên hệ'
 })
});

// Keep visual order and keyboard navigation order aligned at the mobile breakpoint.
function syncMobileInformationOrder(){
 const panel=main.querySelector('.es-dashboard-layout,.es-restored-landing');
 if(!panel)return;
 const hero=panel.querySelector(':scope > .es-main-banner');
 const content=panel.querySelector(':scope > .es-directory,:scope > .es-landing-info');
 if(!hero||!content)return;
 if(window.innerWidth<window.innerHeight){
  if(content.nextElementSibling!==hero)content.after(hero);
 }else if(panel.firstElementChild!==hero){
  panel.insertBefore(hero,content);
 }
}

function catalogHtml(){return `<div class="page-home es-dashboard-layout">${heroBannerHtml()}<section class="es-directory " id="directory" aria-labelledby="catalog-title"><div class="es-directory-header"><div class="es-directory-title-row"><span class="es-directory-emblem" id="catalog-icon">${icon('grid',23)}</span><div><h1 class="es-directory-title" id="catalog-title">Danh mục công cụ theo nhóm</h1><p class="es-directory-sub" id="catalog-sub">Chọn công cụ phù hợp hoặc tìm kiếm nhanh</p></div><span class="es-directory-total" id="catalog-count">${DEFINITIONS.length}</span></div><div class="es-catalog-toolbar"><label class="search-box" for="tool-search">${icon('search',20)}<input id="tool-search" type="search" maxlength="100" autocomplete="off" placeholder="Tìm công cụ..." aria-label="Tìm kiếm công cụ"></label><div class="view-toggle" aria-label="Chế độ hiển thị"><button class="toggle-button ${displayMode==='grid'?'active':''}" type="button" aria-label="Dạng lưới" data-view="grid" title="Dạng lưới">${icon('grid',21)}</button><button class="toggle-button ${displayMode==='list'?'active':''}" type="button" aria-label="Dạng danh sách" data-view="list" title="Dạng danh sách">${icon('list',21)}</button></div></div></div><div class="es-directory-grid" id="tool-columns" role="region" aria-label="Danh sách công cụ"></div></section></div>`;}
function heroBannerHtml(){
 return `<section class="hero es-main-banner" aria-label="Giới thiệu các công cụ Epsilon Blue Soft">
  <div class="hero-copy es-hero-copy-v3">
   <div class="es-hero-kicker-v3">
    <span class="es-hero-kicker-left">${icon('grid',16)}<span>VĂN PHÒNG & KỸ THUẬT</span></span>
    <nav class="es-hero-shortcuts" aria-label="${esLanguage==='en'?'Quick access to Studios':'Mở nhanh công cụ Studio'}">
     <a class="es-hero-shortcut es-hero-shortcut-pdf" href="#/tool/pdf" aria-label="${esLanguage==='en'?'Open PDF Studio':'Mở PDF Studio'}"><span class="es-hero-shortcut-icon">${icon('pdf',16)}</span><span>PDF Studio</span></a>
     <a class="es-hero-shortcut es-hero-shortcut-image" href="#/tool/image-studio" aria-label="${esLanguage==='en'?'Open Image Studio':'Mở Image Studio'}"><span class="es-hero-shortcut-icon">${icon('image',16)}</span><span>Image Studio</span></a>
    </nav>
   </div>
   <h1 class="es-hero-headline-v3"><span>Làm việc</span><strong>nhanh hơn mỗi ngày.</strong></h1>
   <p class="es-hero-subline-v3">Tính toán · Kỹ thuật · PDF · Tiện ích</p>
   <div class="es-hero-benefits-v3" aria-label="Lợi ích Epsilon Blue Soft">
    <span>${icon('check',15)} Văn phòng</span>
    <span>${icon('check',15)} Kỹ thuật</span>
    <span>${icon('shield',15)} Cơ khí chuyên ngành</span>
   </div>
  </div><div class="hero-art" aria-hidden="true"></div>
 </section>`;
}
// Buttons are mounted once in the real site footer, not between catalog and decorative banner.
// Their click handlers use the existing delegated document events.
function pageActionButtonsHtml(){
 const m=BANNER_CONTENT.main;
 return `<section class="es-bottom-actions" aria-label="${esLanguage==='en'?'Installation and contact':'Cài đặt và liên hệ'}"><button type="button" class="button es-action-install" data-es-install aria-label="Cài APP Epsilon Blue Soft lên thiết bị">${icon('app-plus',19)} <span>${escapeHTML(m.installLabel)}</span></button><button type="button" class="button es-action-about" data-es-about aria-label="Giới thiệu và liên hệ Epsilon Blue Soft">${icon('contact-card',19)} <span>${escapeHTML(m.aboutLabel)}</span></button></section>`;
}
/** Place the global install/contact actions in the actual HTML footer, once per page. */
function mountFooterActions(){
 const footer=document.querySelector('.site-footer');
 if(!footer || footer.querySelector('.es-footer-actions'))return;
 const shell=document.createElement('div');
 shell.innerHTML=pageActionButtonsHtml();
 const actions=shell.firstElementChild;
 if(!actions)return;
 actions.classList.add('es-footer-actions');
 const bottom=footer.querySelector('.footer-bottom');
 if(bottom)bottom.before(actions);else footer.append(actions);
}
function landingInfoHtml(content){return `<div class="page-home es-restored-landing">${heroBannerHtml()}<div class="es-landing-info">${content}</div></div>`;}
function helpHtml(){return `<div class="es-static-page">
 <section class="es-static-intro"><span class="es-static-intro-icon">${icon('book',30)}</span><div><h1>Hướng dẫn sử dụng</h1><p>Chọn nhóm trên thanh điều hướng hoặc sidebar để mở công cụ và sổ tay kỹ thuật.</p></div></section>
 <div class="es-portable-guide">
  <section class="tool-box es-help-install-card" aria-labelledby="es-help-install-title">
   <h2 class="tool-box-heading" id="es-help-install-title">${icon('app-plus')} Cài APP trên điện thoại, máy tính bảng và Windows</h2>
   <p class="es-help-install-intro">Nhấn nút Cài APP ở cuối trang hoặc bên dưới để thêm Epsilon Blue Soft vào thiết bị như một ứng dụng.</p>
   <div class="es-help-install-devices">
    <div class="es-help-install-device"><h3>${icon('monitor',20)} Windows (Chrome / Edge)</h3><p>Nhấn Cài APP và xác nhận Cài đặt khi trình duyệt hỏi. Nếu không hiện hộp thoại, mở menu Chrome/Edge hoặc biểu tượng cài đặt trên thanh địa chỉ.</p></div>
    <div class="es-help-install-device"><h3>${icon('smartphone',20)} Android (Chrome)</h3><p>Mở trang bằng Chrome, nhấn Cài APP. Nếu không thấy hộp thoại cài đặt, chọn menu ⋮ → Cài đặt ứng dụng hoặc Thêm vào màn hình chính.</p></div>
    <div class="es-help-install-device"><h3>${icon('tablet',20)} iPhone / iPad (Safari)</h3><p>Mở trang bằng Safari, chọn Chia sẻ → Thêm vào Màn hình chính. Nút Cài APP trên trang sẽ hiện hướng dẫn nếu Safari không hỗ trợ hộp thoại cài đặt.</p></div>
   </div>
   <div class="es-help-install-bottom">
    <button type="button" class="button es-help-install-button" data-es-install aria-label="Cài APP Epsilon Blue Soft lên thiết bị">${icon('app-plus',19)} Cài APP</button>
    <p class="es-help-install-note">Đây là Web App được cài từ trình duyệt. Cần trình duyệt hỗ trợ và website HTTPS; một số thiết bị chỉ tạo lối tắt, và một số công cụ vẫn cần Internet.</p>
   </div>
  </section>
  <article class="tool-box"><h2 class="tool-box-heading">${icon('star')} My tools</h2><p>Nhấn ngôi sao ⭐ trên công cụ để ghim. Chỉ công cụ đã ghim mới xuất hiện trong My tools. Dữ liệu này được lưu trên trình duyệt hiện tại.</p></article>
  <article class="tool-box"><h2 class="tool-box-heading">${icon('grid')} Danh mục và tìm kiếm</h2><p>Chọn chủ đề trên trang chủ hoặc trong sidebar khi đang dùng công cụ. Gõ tên công cụ trong ô tìm kiếm; phím / giúp mở ô tìm kiếm nhanh.</p></article>
  <article class="tool-box"><h2 class="tool-box-heading">${icon('shield')} Dữ liệu và quyền riêng tư</h2><p>Các công cụ ưu tiên xử lý dữ liệu ngay tại trình duyệt. Một số module có thể tải thư viện từ nguồn ngoài; hãy xem giới hạn và hướng dẫn ngay trong module.</p></article>
  <article class="tool-box"><h2 class="tool-box-heading">${icon('info')} Kết quả kỹ thuật</h2><p>Đối chiếu đơn vị đo, đầu vào và tiêu chuẩn áp dụng trước khi sử dụng số liệu trong công việc thực tế.</p></article>
 </div></div>`;}
function settingsHtml(){
 return `<div class="es-static-page es-preferences-page">
 <section class="es-static-intro"><span class="es-static-intro-icon">${icon('settings',30)}</span><div><h1>Cài đặt</h1><p>Tùy chọn hiển thị trên thiết bị này.</p></div></section>
 <section class="tool-box es-preferences-card"><h2 class="tool-box-heading">${icon('settings',20)} Ngôn ngữ giao diện</h2>
  <p>Chọn VI hoặc EN ở góc phải header để đổi ngôn ngữ.</p>
  <p class="es-settings-note">Tùy chọn ngôn ngữ được lưu trên trình duyệt này.</p>
 </section>
 <section class="tool-box"><h2 class="tool-box-heading">${icon('shield',20)} Dữ liệu cá nhân</h2><p>My tools và tùy chọn ngôn ngữ hiện được lưu trong trình duyệt. Chưa có đồng bộ tài khoản hoặc Google Drive.</p></section>
 </div>`;
}
function accountHtml(){
 return `<div class="es-static-page"><section class="es-static-intro"><span class="es-static-intro-icon">${icon('user',30)}</span><div><h1>Tài khoản</h1><p>Hệ thống tài khoản đang được phát triển.</p></div></section>
 <section class="tool-box es-preferences-card"><h2 class="tool-box-heading">${icon('info',20)} Chưa triển khai</h2>
 <p>Chưa có hệ thống tài khoản hoặc thu phí. Văn phòng và Kỹ thuật vẫn miễn phí; nhóm Cơ khí là định hướng chuyên ngành dự kiến trả phí sau khi hệ thống xác thực và phân quyền thực tế được triển khai.</p>
 </section></div>`;
}
function ecosystemLoadingHtml(groupId=''){
 const group=groupId==='edu';
 const heading=group?'Epsilon Blue Edu':'';
 return `<div class="es-static-page">
 <section class="es-static-intro es-hub-intro">
  <span class="es-static-intro-icon ${group?'es-hub-group-icon':'es-hub-logo'}">${group?icon('book',34):'<img src="./assets/images/epsilon-mark.png?v=20261025-brand-mark" alt="">'}</span>
  <div>${group?`<h1 id="es-hub-group-heading">${heading}</h1><p id="es-hub-group-sub">${esLanguage==='en'?'Browse products by category':'Khám phá các sản phẩm trong nhóm'}</p>`:`<h1 class="es-hub-wordmark"><span>EPSILON BLUE</span><strong>HUB</strong></h1><p>Kết nối các sản phẩm và ứng dụng thuộc hệ sinh thái Epsilon.</p>`}</div>
 </section>
 <div id="es-system-products" role="region" aria-label="${esLanguage==='en'?'Epsilon ecosystem':'Danh mục sản phẩm Epsilon'}"><div class="tool-box" role="status">${esLanguage==='en'?'Loading products...':'Đang tải danh sách sản phẩm...'}</div></div>
 </div>`;
}
async function populateEcosystem(token){
 const target=main.querySelector('#es-system-products');if(!target)return;
 try{
  const data=await readStaticJson(SYSTEM_JSON);
  if(token!==currentRoute||!target.isConnected)return;
  const groups=normalizedEcosystem(data);
  const match=location.hash.match(/^#\/ecosystem\/([a-z0-9-]+)$/);
  const group=match?groups.find(g=>g.id===match[1]):null;
  if(match && !group){
   target.innerHTML=`<div class="es-hub-empty">${esLanguage==='en'?'Category not found.':'Không tìm thấy nhóm sản phẩm.'} <a href="#/ecosystem">${esLanguage==='en'?'Back to Hub':'Về Epsilon Blue Hub'}</a></div>`;
   return;
  }
  if(!group){
   target.innerHTML=`<div class="es-hub-families${groups.length===1?' is-single':''}">${groups.map(hubFamilyHtml).join('')}</div>`;
  }else{
   const header=main.querySelector('#es-hub-group-heading');if(header)header.textContent=hubText(group,'name');
   const sub=main.querySelector('#es-hub-group-sub');if(sub)sub.textContent=hubText(group,'description');
   target.innerHTML=`<nav class="es-hub-breadcrumb" aria-label="Breadcrumb"><a href="#/ecosystem">${esLanguage==='en'?'Epsilon Blue Hub':'Epsilon Blue Hub'}</a> ${icon('arrow',16)} <span>${escapeHTML(hubText(group,'name'))}</span></nav>
    <div class="es-hub-section-title"><h2>${esLanguage==='en'?'Applications':'Danh sách ứng dụng'}</h2><span class="es-hub-section-total">${group.products.length}</span></div>
    ${group.products.length?`<div class="es-hub-products">${group.products.map(hubProductHtml).join('')}</div>`:`<div class="es-hub-empty">${esLanguage==='en'?'The product list is being updated. Add an item in assets/data/ecosystem.json.':'Danh sách sản phẩm đang được cập nhật. Anh thêm sản phẩm vào assets/data/ecosystem.json.'}</div>`}`;
  }
 }catch(error){
  if(token!==currentRoute||!target.isConnected)return;
  console.warn('Epsilon Blue Hub data:',error);
  target.innerHTML=`<div class="tool-box"><p>${esLanguage==='en'?'Cannot load ecosystem.json.':'Không tải được danh sách sản phẩm từ'} <code>assets/data/ecosystem.json</code>.</p><button type="button" class="button button-outline" data-retry-system>${esLanguage==='en'?'Retry':'Thử tải lại'}</button></div>`;
 }finally{if(target.isConnected)esTranslateRegion(target);}
}
function relatedHtml(toolId){return `<section class="tool-box"><h2 class="tool-box-heading">${icon('grid')} Công cụ liên quan</h2><div class="related-tools">${DEFINITIONS.filter(t=>!t.planned&&t.id!==toolId).slice(0,4).map(t=>`<a href="#/tool/${t.id}"><span class="tool-tile ${t.tone}">${icon(t.icon,21)}</span><span class="related-tool-name">${t.name}</span>${icon('arrow',16)}</a>`).join('')}</div></section>`;}
function toolHtml(t){
 const g=GROUPS.find(g=>g.id===t.group);
 const topline=`<div class="es-tool-topline"><nav class="breadcrumbs" aria-label="Đường dẫn"><a href="#/home">${icon('home',18)} Trang chủ</a><span>›</span><a href="#/category/${t.group}">${escapeHTML(g?.name||'Công cụ')}</a><span>›</span><span>${escapeHTML(t.name)}</span></nav><label class="es-tool-pin"><input type="checkbox" data-tool-pin="${t.id}"${isPinned(t.id)?' checked':''}><span>My tools</span></label></div>`;
 if(t.group==='office'||t.group==='technical'||t.group==='handbook'){
  // These tool groups use a compact host row; the module owns its visible heading.
  return `<div class="tool-page es-free-tool">${topline}<h1 class="es-free-sr-only">${escapeHTML(t.name)}</h1>${t.group==='office'?'<p class="es-free-desc">'+escapeHTML(t.sub)+'</p>':''}<div class="tool-surface" id="tool-workspace"><div class="tool-box">Đang mở công cụ...</div></div>${t.group==='handbook'?'':`<div id="related-root" style="margin-top:15px">${relatedHtml(t.id)}</div>`}</div>`;
 }
 return `<div class="tool-page">${topline}<div class="tool-heading"><div class="tool-heading-icon ${t.tone}">${icon(t.icon,37)}</div><div>${t.guide?`<div class="es-tool-title"><h1>${t.name}</h1><button type="button" class="es-guide-btn" data-tool-guide aria-expanded="false" aria-controls="es-tool-guide" hidden>${icon('book',18)} Hướng dẫn sử dụng</button></div>`:`<h1>${t.name}</h1><p>${escapeHTML(t.sub)}</p>`}</div></div>${t.guide?'<section class="tool-box es-tool-guide" id="es-tool-guide" hidden aria-label="Hướng dẫn sử dụng"></section>':''}<div class="tool-surface" id="tool-workspace"><div class="tool-box">Đang mở công cụ...</div></div><div id="related-root" style="margin-top:15px">${relatedHtml(t.id)}</div></div>`;
}
function navActive(active){
 closeHeaderMyTools();
 closeHeaderCategoryMenus();
 document.querySelectorAll('.nav-link').forEach(link=>link.classList.toggle('is-active',link.dataset.nav===active));
 document.querySelectorAll('.es-header-category').forEach(area=>area.classList.toggle('is-active',area.dataset.headerCategory===active));
 document.getElementById('main-nav')?.classList.remove('open');
 renderSidebar();closeMobileSidebar();
}
function renderToolFailure(t,error){
 console.error('Module failed:',t.id,error);
 const target=main.querySelector('#tool-workspace');
 if(target)target.innerHTML='<div class="callout warning">Không thể tải công cụ. Vui lòng kiểm tra tệp JavaScript tương ứng rồi tải lại trang.</div>';
}
async function navigate(){
 esCloseHeroDialog();
 const route=location.hash||'#/home';const token=++currentRoute;
 if(currentModuleCleanup){try{currentModuleCleanup();}catch(err){console.warn('Module cleanup:',err);}currentModuleCleanup=null;}
 main.replaceChildren();
 setToolRailOpen(false);
 const isTool=route.startsWith('#/tool/');
 document.body.classList.toggle('es-tool-mode',isTool);
 document.body.classList.toggle('es-catalog-mode',!isTool);
 setSidebarCollapsed(isTool);
 closeMainMenu();
 if(isTool){
  const id=route.slice(7);if(LEGACY_TOOL_IDS[id]){location.hash='#/tool/'+LEGACY_TOOL_IDS[id];return;}
  const t=map.get(id);if(!t||t.planned||!t.file){location.hash='#/home';return;}
  navActive(t.group);main.innerHTML=toolHtml(t);renderSidebar();
  favorites.opens[id]=Math.min(1000000,(favorites.opens[id]||0)+1);savePreferences();
  window.scrollTo({top:0,behavior:'auto'});
  try{
   const imported=await import(`./${t.dir||GROUP_DIRECTORIES[t.group]||'tools'}/${t.file}`);
   if(token!==currentRoute)return;
   const workspace=main.querySelector('#tool-workspace'),abort=new AbortController();
   // Tool có hướng dẫn (t.guide + module export GUIDE): tab "Hướng dẫn sử dụng" cạnh tên tool, thay cho dòng mô tả
   const guideBtn=t.guide&&typeof imported.GUIDE==='string'?main.querySelector('[data-tool-guide]'):null,guidePanel=main.querySelector('#es-tool-guide');
   if(guideBtn&&guidePanel){
    guidePanel.innerHTML=imported.GUIDE;guideBtn.hidden=false;
    guideBtn.addEventListener('click',()=>{const open=guideBtn.getAttribute('aria-expanded')!=='true';guideBtn.setAttribute('aria-expanded',String(open));guidePanel.hidden=!open;},{signal:abort.signal});
   }
   const context={icon,showToast,number:v=>new Intl.NumberFormat('en-US',{maximumFractionDigits:4}).format(v),signal:abort.signal,hostGuide:!!guideBtn};
   const cleanup=await imported.mount(workspace,context);
   if(token!==currentRoute){abort.abort();if(typeof cleanup==='function')cleanup();return;}
   currentModuleCleanup=()=>{abort.abort();if(typeof cleanup==='function')cleanup();};
  }catch(err){if(token===currentRoute)renderToolFailure(t,err);}
  return;
 }
 // Preserve historical links without recreating the removed All Tools page.
 if(route==='#/explore'){location.hash='#/home';return;}
 const redirects={calc:'technical',utility:'office',engineering:'mechanical'};
 if(route.startsWith('#/category/') && redirects[route.slice(11)]){
  location.hash='#/category/'+redirects[route.slice(11)];return;
 }
 if(route==='#/settings'){
  navActive('settings');main.innerHTML=landingInfoHtml(settingsHtml());syncMobileInformationOrder();esUpdateLanguageButtons();window.scrollTo({top:0,behavior:'auto'});return;
 }
 if(route==='#/account'){
  navActive('account');main.innerHTML=landingInfoHtml(accountHtml());syncMobileInformationOrder();window.scrollTo({top:0,behavior:'auto'});return;
 }
 if(route==='#/help'){
  navActive('help');main.innerHTML=landingInfoHtml(helpHtml());syncMobileInformationOrder();window.scrollTo({top:0,behavior:'auto'});return;
 }
 if(route==='#/portable'){
  // Redirect legacy bookmarks; the Portable page is no longer public.
  location.hash='#/home';return;
 }
 if(route==='#/ecosystem'||/^#\/ecosystem\/[a-z0-9-]+$/.test(route)){
  navActive('hub');main.innerHTML=landingInfoHtml(ecosystemLoadingHtml(route.split('/')[2]||''));syncMobileInformationOrder();renderSidebar();window.scrollTo({top:0,behavior:'auto'});
  void populateEcosystem(token);return;
 }
 if(route==='#/mytools')activeCatalog='mytools';
 else if(route.startsWith('#/category/')){
  const group=route.slice('#/category/'.length);activeCatalog=GROUPS.some(g=>g.id===group)?group:'all';
 }else activeCatalog='all';
 navActive(route==='#/mytools'?'mytools':GROUPS.some(g=>'#/category/'+g.id===route)?activeCatalog:'home');
 main.innerHTML=catalogHtml();
 syncMobileInformationOrder();
 renderGroupCards();
 window.scrollTo({top:0,behavior:'auto'});
}
async function safeNavigate(){
 try{await navigate();esTranslateRegion(document.body);}
 catch(error){
  console.error('Epsilon Blue Soft navigation error:',error);
  main.innerHTML='<section class="startup-panel" role="alert"><h1>Không thể hiển thị trang</h1><p>Vui lòng kiểm tra assets/js/app.js và các tệp trong assets/data/, sau đó tải lại trang.</p></section>';
 }
}
readPreferences();hydrateIcons();prepareHeaderNavigation();buildHeaderMyTools();buildHeaderCategoryMenus();mountHeaderLanguagePicker();buildSidebarShell();buildAppDialog();mountFooterActions();esUpdateLanguageButtons();esTranslateRegion(document.body);
function esUpdatePortraitLayout(){
 const portrait=window.innerWidth < window.innerHeight;
 const previous=document.body.classList.contains('es-portrait-layout');
 document.body.classList.toggle('es-portrait-layout',portrait);
 if(previous!==portrait){
  setToolRailOpen(false);
  closeHeaderMyTools();
  closeHeaderCategoryMenus();
  sidebarOpenSection=null;
  syncMobileInformationOrder();
  renderSidebar();
 }
}
document.body.classList.toggle('es-portrait-layout',window.innerWidth < window.innerHeight);
window.addEventListener('resize',esUpdatePortraitLayout,{passive:true});
window.addEventListener('hashchange',safeNavigate);
document.getElementById('menu-toggle')?.addEventListener('click',()=>{
 if(document.getElementById('es-sidebar')?.classList.contains('es-mobile-open'))closeMobileSidebar();
 else openMobileSidebar();
});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape' && sidebarOpenSection!==null && window.innerWidth < window.innerHeight){
  sidebarOpenSection=null;renderSidebar();document.getElementById('es-mobile-rail-scroll')?.focus();
 }
});
document.addEventListener('click',event=>{
 if(event.target.closest('[data-tool-rail-toggle]')){
  event.preventDefault();
  setToolRailOpen(!document.body.classList.contains('es-tool-rail-open'));
  return;
 }
 if(event.target.closest('#es-tool-rail-backdrop')){
  event.preventDefault();setToolRailOpen(false);return;
 }
 const headerToggle=event.target.closest('[data-header-mytools-toggle]');
 if(headerToggle){
  event.preventDefault();
  const area=document.getElementById('es-header-mytools');const menu=area?.querySelector('#es-header-mytools-menu');
  if(menu){
   const willOpen=menu.hidden;
   closeHeaderCategoryMenus();
   if(willOpen && sidebarOpenSection!==null){sidebarOpenSection=null;renderSidebar();}
   menu.hidden=!willOpen;headerToggle.setAttribute('aria-expanded',String(willOpen));
  }
  return;
 }
 const categoryToggle=event.target.closest('[data-header-category-toggle]');
 if(categoryToggle){
  event.preventDefault();
  const area=categoryToggle.closest('.es-header-category');
  const menu=area?.querySelector('.es-header-category-menu');
  if(menu){
   const willOpen=menu.hidden;
   closeHeaderMyTools();closeHeaderCategoryMenus();
   if(willOpen && sidebarOpenSection!==null){sidebarOpenSection=null;renderSidebar();}
   menu.hidden=!willOpen;
   categoryToggle.setAttribute('aria-expanded',String(willOpen));
  }
  return;
 }
 if(event.target.closest('#es-header-mytools-menu a,#es-header-mytools-link'))closeHeaderMyTools();
 else if(!event.target.closest('#es-header-mytools'))closeHeaderMyTools();
 if(event.target.closest('.es-header-category-menu a,.es-header-category-link'))closeHeaderCategoryMenus();
 else if(!event.target.closest('.es-header-category'))closeHeaderCategoryMenus();
 const lang=event.target.closest('[data-es-lang]');if(lang){esSetLanguage(lang.dataset.esLang);return;}
 const install=event.target.closest('[data-es-install]');if(install){event.preventDefault();void esInstallWebApp(install);return;}
 const about=event.target.closest('[data-es-about]');if(about){event.preventDefault();esOpenHeroDialog('about');return;}
 const copyPhone=event.target.closest('[data-es-copy-phone]');if(copyPhone){event.preventDefault();void esCopyContactPhone();return;}
 if(event.target.closest('[data-es-hero-close]')||event.target.id==='es-hero-dialog-layer'){esCloseHeroDialog();return;}
 if(event.target.closest('[data-es-go-hub]')){esCloseHeroDialog();return;}
 if(event.target.closest('#es-mobile-backdrop')){closeMobileSidebar();return;}
 const mobileFolder=event.target.closest('[data-mobile-folder]');
 if(mobileFolder){
  event.preventDefault();
  const id=mobileFolder.dataset.mobileFolder;
  sidebarOpenSection=sidebarOpenSection===id?null:id;
  closeHeaderMyTools();closeHeaderCategoryMenus();
  renderSidebar();
  document.querySelector(`[data-mobile-folder="${id}"]`)?.focus();
  if(sidebarOpenSection==='ecosystem')void loadSidebarHubProducts();
  return;
 }
 if(event.target.closest('[data-mobile-folder-close]')){
  event.preventDefault();sidebarOpenSection=null;renderSidebar();return;
 }
 if(event.target.closest('.es-mobile-folder-link')||event.target.closest('.es-mobile-rail-drawer-grid a')){
  sidebarOpenSection=null;renderSidebar();return;
 }
 if(event.target.closest('#es-side-toggle')){
  if(window.matchMedia('(max-width:1080px)').matches)closeMobileSidebar();else setSidebarCollapsed(!sidebarIsCollapsed);
  return;
 }
 const sideExpand=event.target.closest('[data-side-expand]');
 if(sideExpand){
  event.preventDefault();
  const id=sideExpand.dataset.sideExpand;
  sidebarOpenSection=sidebarOpenSection===id?null:id;
  closeHeaderMyTools();closeHeaderCategoryMenus();
  renderSidebar();
  document.querySelector(`[data-side-expand="${id}"]`)?.focus();
  if(sidebarOpenSection==='ecosystem')void loadSidebarHubProducts();
  return;
 }
 if(event.target.closest('.es-side-link')||event.target.closest('.es-side-count')||event.target.closest('.es-side-child')){closeMobileSidebar();return;}
 if(event.target.closest('.main-nav .nav-link')){closeMainMenu();return;}
 if(event.target.closest('.es-modal-close')||event.target.id==='es-modal-layer'){closeAppDialog();return;}
 const pin=event.target.closest('[data-pin]');if(pin){event.preventDefault();togglePin(pin.dataset.pin);renderSidebar();return;}
 const mode=event.target.closest('[data-view]');if(mode){
  displayMode=mode.dataset.view==='list'?'list':'grid';
  main.querySelector('#tool-columns')?.classList.toggle('es-view-list',displayMode==='list');
  main.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===displayMode));return;
 }
 if(event.target.closest('[data-retry-system]')){void populateEcosystem(currentRoute);return;}
});
document.addEventListener('change',event=>{
 const control=event.target;
 if(!(control instanceof HTMLInputElement)||!control.matches('.tool-page input[data-tool-pin]'))return;
 const id=control.dataset.toolPin;
 if(control.checked!==isPinned(id))togglePin(id);
 control.checked=isPinned(id);
 renderSidebar();
});
document.addEventListener('input',event=>{
 if(event.target.id==='tool-search')applySearch(event.target.value);
});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'){
  if(document.body.classList.contains('es-tool-rail-open')){event.preventDefault();setToolRailOpen(false);document.getElementById('es-tool-rail-toggle')?.focus({preventScroll:true});return;}
  closeHeaderMyTools(true);closeHeaderCategoryMenus(true);esCloseHeroDialog();closeAppDialog();closeMobileSidebar();closeMainMenu();return;
 }
 const heroLayer=document.getElementById('es-hero-dialog-layer');
 if(event.key==='Tab' && heroLayer && !heroLayer.hidden){
  const focusables=[...heroLayer.querySelectorAll('a[href],button:not([disabled])')];
  if(!focusables.length){event.preventDefault();return;}
  const first=focusables[0],last=focusables[focusables.length-1];
  if(event.shiftKey && (document.activeElement===first || !heroLayer.contains(document.activeElement))){event.preventDefault();last.focus();return;}
  if(!event.shiftKey && (document.activeElement===last || !heroLayer.contains(document.activeElement))){event.preventDefault();first.focus();return;}
 }
 const modal=document.getElementById('es-modal-layer');
 if(event.key==='Tab' && modal && !modal.hidden){event.preventDefault();modal.querySelector('.es-modal-close')?.focus();return;}
 const el=event.target;
 if(event.key==='/'&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!(el instanceof HTMLInputElement)&&!(el instanceof HTMLTextAreaElement)&&!(el instanceof HTMLSelectElement)){
  const search=main.querySelector('#tool-search');if(search){event.preventDefault();search.focus();}
 }
});
window.addEventListener('resize',()=>{
 if(!window.matchMedia('(max-width:1080px)').matches)closeMobileSidebar();
});
safeNavigate();
if('serviceWorker' in navigator && location.protocol==='https:'){
 window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'}).catch(err=>console.warn('Không đăng ký được offline cache:',err)));
}
