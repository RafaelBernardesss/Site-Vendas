import { api } from './api.js';

export const state = { user: null };

/* ---------------- Utilidades ---------------- */
export const money = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function dataBr(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
}

export function tamanhoBr(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export function iniciais(nome) {
  return (nome || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

export const SPINNER = '<span class="spinner" aria-hidden="true"></span>';

export const SVG_CART =
  '<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="M4 6h2l2.4 10.4a1 1 0 001 .6h8.4a1 1 0 001-.8L20.5 9H7"/><circle cx="10" cy="20" r="1.6"/><circle cx="17" cy="20" r="1.6"/></svg>';

export const SVG_DOWNLOAD =
  '<svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16"/></svg>';

const STAR_PATH = 'M12 2.6l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.6l-5.9 3.2 1.2-6.6L2.5 9.6l6.6-.9z';

/** Estrelas somente leitura (aceita notas quebradas, ex.: 4.3 → 4 cheias). */
export function stars(nota = 0) {
  const cheias = Math.round(Number(nota) || 0);
  return `<span class="stars" role="img" aria-label="${nota} de 5 estrelas">${[1, 2, 3, 4, 5]
    .map((i) => `<svg viewBox="0 0 24 24" class="star ${i <= cheias ? 'on' : ''}"><path d="${STAR_PATH}"/></svg>`)
    .join('')}</span>`;
}

export const STAR_SVG_PATH = STAR_PATH;

/* ---------------- Sessão ---------------- */
export async function loadUser() {
  try {
    const { user } = await api.get('/api/auth/me');
    state.user = user;
  } catch {
    state.user = null;
  }
  return state.user;
}

export function requireAuth(page) {
  if (!state.user) {
    location.href = `/login?next=${encodeURIComponent(page)}`;
    return false;
  }
  return true;
}

/* ---------------- Layout ---------------- */
/* Dados de contato e redes sociais exibidos no topo e no rodapé.
   Troque aqui pelos dados reais da loja. */
export const CONTATO = {
  email: 'contato@slidehub.com.br',
  telefone: '(00) 00000-0000',
  redes: [
    { nome: 'Instagram', href: '#', icone: 'instagram' },
    { nome: 'WhatsApp', href: '#', icone: 'whatsapp' },
    { nome: 'Facebook', href: '#', icone: 'facebook' },
  ],
};

const SOCIAL_ICONS = {
  instagram:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3.6" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16.6" cy="7.4" r="1.2" fill="currentColor"/></svg>',
  whatsapp:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.6a8.4 8.4 0 00-7.2 12.7L3.6 20.4l4.2-1.1A8.4 8.4 0 1012 3.6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9.2 8.6c-.3.6-.2 1.6.9 3.1 1.1 1.5 2.3 2.3 3.5 2.6.7.2 1.5-.3 1.7-.9l-1.5-.9-.7.7c-.8-.3-1.8-1.2-2.2-2.1l.7-.6-.8-1.7z" fill="currentColor"/></svg>',
  facebook:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.8 20v-6.8h2.3l.4-2.7h-2.7V8.8c0-.8.3-1.3 1.4-1.3h1.4V5.1c-.3 0-1.1-.1-2.1-.1-2.1 0-3.5 1.3-3.5 3.6v2H8.6v2.7h2.4V20z" fill="currentColor"/></svg>',
};

const SEARCH_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';

/* Ícones "ilustrados" dos botões do menu (duas cores + contorno marrom) */
const INK = '#4a2a1a';
const NAV_ICONS = {
  inicio: `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="11" y="22" width="26" height="18" rx="2.5" fill="#fff3e6" stroke="${INK}" stroke-width="2"/><path d="M6 24L24 8l18 16z" fill="#e4572e" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><rect x="20" y="29" width="8" height="11" rx="1.5" fill="#ffb27a" stroke="${INK}" stroke-width="2"/></svg>`,
  materiais: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M5 12c7-2.5 14-1.5 19 3v24c-5-4.5-12-5.5-19-3z" fill="#fff3e6" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M43 12c-7-2.5-14-1.5-19 3v24c5-4.5 12-5.5 19-3z" fill="#ffd9b8" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M10 19c3-.8 6-.8 9 .5M10 25c3-.8 6-.8 9 .5M29 20c3-1.3 6-1.3 9-.5M29 26c3-1.3 6-1.3 9-.5" stroke="#e4572e" stroke-width="2" stroke-linecap="round" fill="none"/></svg>`,
  pasta: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M5 14a3 3 0 013-3h10l4 5h18a3 3 0 013 3v20a3 3 0 01-3 3H8a3 3 0 01-3-3z" fill="#ffb27a" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><rect x="5" y="19" width="38" height="20" rx="3" fill="#fff3e6" stroke="${INK}" stroke-width="2"/><path d="M24 22v10m0 0l-4-4m4 4l4-4" stroke="#e4572e" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
  conta: `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="20" cy="16" r="7" fill="#ffd9b8" stroke="${INK}" stroke-width="2"/><path d="M6 40c1-9 7-13 14-13s13 4 14 13z" fill="#e4572e" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><circle cx="37" cy="13" r="7" fill="#ffd66b" stroke="${INK}" stroke-width="2"/><path d="M37 10v6M34 13h6" stroke="${INK}" stroke-width="2" stroke-linecap="round"/></svg>`,
  painel: `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="6" width="16" height="20" rx="3" fill="#e4572e" stroke="${INK}" stroke-width="2"/><rect x="26" y="6" width="16" height="12" rx="3" fill="#ffd66b" stroke="${INK}" stroke-width="2"/><rect x="26" y="22" width="16" height="20" rx="3" fill="#ffb27a" stroke="${INK}" stroke-width="2"/><rect x="6" y="30" width="16" height="12" rx="3" fill="#fff3e6" stroke="${INK}" stroke-width="2"/></svg>`,
  carrinho: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M5 8h6l5 22h20l4-15H14" fill="#fff3e6" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 15h26l-4 15H16z" fill="#ffb27a" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><circle cx="19" cy="39" r="3" fill="#e4572e" stroke="${INK}" stroke-width="2"/><circle cx="33" cy="39" r="3" fill="#e4572e" stroke="${INK}" stroke-width="2"/></svg>`,
};

/* Ícones simples (traço) da barra de abas do celular */
const TAB_ICONS = {
  inicio: '<path d="M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"/>',
  materiais: '<path d="M4 5c3-1 6-1 8 1v13c-2-2-5-2-8-1zM20 5c-3-1-6-1-8 1v13c2-2 5-2 8-1z"/>',
  meus: '<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M12 10v6m0 0l-2.5-2.5M12 16l2.5-2.5"/>',
  carrinho: '<path d="M4 6h2l2.4 10.4a1 1 0 001 .6h8.4a1 1 0 001-.8L20.5 9H7"/><circle cx="10" cy="20" r="1.6"/><circle cx="17" cy="20" r="1.6"/>',
  conta: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  painel: '<rect x="3" y="3" width="8" height="10" rx="1.5"/><rect x="13" y="3" width="8" height="6" rx="1.5"/><rect x="13" y="11" width="8" height="10" rx="1.5"/><rect x="3" y="15" width="8" height="6" rx="1.5"/>',
};

function tab(href, icone, label, { ativo = false, extra = '' } = {}) {
  return `<a class="tab ${ativo ? 'active' : ''}" href="${href}"${ativo ? ' aria-current="page"' : ''}>
    <span class="tab-ico"><svg viewBox="0 0 24 24" aria-hidden="true">${TAB_ICONS[icone]}</svg>${extra}</span>
    <span class="tab-label">${label}</span>
  </a>`;
}

const LOGO =
  '<svg class="brand-mark" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#E4572E"/><path d="M18 42l10-20 10 20" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M23 34h10" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>';

function tile(href, icone, label, { ativo = false, extra = '' } = {}) {
  return `<a class="nav-tile ${ativo ? 'active' : ''}" href="${href}"${ativo ? ' aria-current="page"' : ''}>
    <span class="nav-tile-ico">${NAV_ICONS[icone]}${extra}</span>
    <span class="nav-tile-label">${label}</span>
  </a>`;
}

export function renderHeader() {
  const el = document.getElementById('site-header');
  if (!el) return;
  const u = state.user;
  const rota = location.pathname;
  const q = new URLSearchParams(location.search).get('q') || '';

  const redes = CONTATO.redes
    .map((r) => `<a href="${r.href}" aria-label="${r.nome}" rel="noopener">${SOCIAL_ICONS[r.icone]}</a>`)
    .join('');

  const badge = '<span class="cart-count" data-cart-count hidden>0</span>';
  /* produto e checkout ficam em tela cheia (com barra de compra própria) */
  const semAbas = /^\/(produto|checkout)/.test(rota);

  el.innerHTML = `
  <header class="site-header">
    <div class="header-main">
      <div class="container header-grid">
        <div class="header-member">
          ${u ? userMenuHtml(u) : '<a class="btn-member" href="/login">Entrar</a>'}
        </div>
        <a class="brand" href="/" aria-label="SlideHub — página inicial">
          ${LOGO}
          <span class="brand-text">
            <span class="brand-name">Slide<b>Hub</b></span>
            <span class="brand-tag">materiais digitais</span>
          </span>
        </a>
        <a class="hdr-cart" href="/carrinho" aria-label="Ver carrinho">${SVG_CART}${badge}</a>
        <form class="site-search" action="/" method="get" role="search">
          <input type="search" name="q" value="${escapeHtml(q)}" placeholder="Buscar Materiais" aria-label="Buscar no site" />
          <button type="submit" aria-label="Buscar">${SEARCH_ICON}</button>
        </form>
      </div>

      <nav class="container main-nav" aria-label="Navegação principal">
        ${tile('/', 'inicio', 'Início', { ativo: rota === '/' })}
        ${tile('/#vitrine', 'materiais', 'Materiais')}
        ${u
          ? tile('/meus-materiais', 'pasta', 'Meus materiais', { ativo: rota === '/meus-materiais' })
          : tile('/cadastro', 'conta', 'Criar conta', { ativo: rota === '/cadastro' })}
        ${u && u.role === 'ADMIN' ? tile('/admin', 'painel', 'Painel', { ativo: rota === '/admin' }) : ''}
        ${tile('/carrinho', 'carrinho', 'Carrinho', { ativo: rota === '/carrinho', extra: badge })}
      </nav>
    </div>

    <svg class="header-wave" viewBox="0 0 1440 40" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 22c120 14 240 18 360 10s240-24 360-22 240 22 360 24 240-10 360-20v26H0z" fill="#fff"/>
    </svg>
  </header>

  <a class="fab-cart" href="/carrinho" aria-label="Ver carrinho">
    ${SVG_CART}
    ${badge}
  </a>

  ${semAbas ? '' : `<nav class="tabbar" aria-label="Menu do aplicativo">
    ${tab('/', 'inicio', 'Início', { ativo: rota === '/' })}
    ${tab('/#vitrine', 'materiais', 'Materiais')}
    ${u
      ? tab('/meus-materiais', 'meus', 'Meus', { ativo: rota === '/meus-materiais' })
      : tab('/login', 'conta', 'Entrar', { ativo: rota === '/login' || rota === '/cadastro' })}
    ${u && u.role === 'ADMIN' ? tab('/admin', 'painel', 'Painel', { ativo: rota.startsWith('/admin') }) : ''}
    ${tab('/carrinho', 'carrinho', 'Carrinho', { ativo: rota === '/carrinho', extra: badge })}
  </nav>`}`;

  document.body.classList.toggle('sem-tabbar', semAbas);

  if (u) wireUserMenu();
}

function userMenuHtml(u) {
  return `
  <div class="user-menu">
    <button type="button" class="user-btn" id="user-btn" aria-haspopup="true" aria-expanded="false" aria-label="Menu do usuário">
      <span class="avatar" aria-hidden="true">${iniciais(u.nome)}</span>
      <span class="user-nome">${escapeHtml(u.nome.split(' ')[0])}</span>
      <svg viewBox="0 0 24 24" class="chev" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
    </button>
    <div class="user-dropdown" id="user-dropdown" hidden>
      <a href="/meus-materiais">Meus materiais</a>
      ${u.role === 'ADMIN' ? '<a href="/admin">Painel do admin</a>' : ''}
      <button id="btn-sair" type="button" class="sair">Sair da conta</button>
    </div>
  </div>`;
}

function wireUserMenu() {
  const btn = document.getElementById('user-btn');
  const dd = document.getElementById('user-dropdown');
  if (!btn || !dd) return;

  const fecha = () => {
    dd.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  };

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const fechar = !dd.hidden;
    dd.hidden = fechar;
    btn.setAttribute('aria-expanded', String(!fechar));
  });
  dd.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', fecha);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecha();
  });
  window.addEventListener('resize', fecha);

  document.getElementById('btn-sair').addEventListener('click', async () => {
    try {
      await api.post('/api/auth/sair');
    } catch {
      /* segue o logout */
    }
    location.href = '/';
  });
}

export function renderFooter() {
  const el = document.getElementById('site-footer');
  if (!el) return;
  const redes = CONTATO.redes
    .map((r) => `<a href="${r.href}" aria-label="${r.nome}" rel="noopener">${SOCIAL_ICONS[r.icone]}</a>`)
    .join('');
  el.innerHTML = `
  <footer class="site-footer">
    <svg class="footer-wave" viewBox="0 0 1440 40" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 18c120-14 240-18 360-10s240 24 360 22 240-22 360-24 240 10 360 20V0H0z" fill="#fff"/>
    </svg>
    <div class="container footer-inner">
      <div class="footer-brand">
        ${LOGO}
        <div>
          <p class="footer-name">SlideHub</p>
          <p class="footer-tag">Materiais digitais prontos para usar. Pague com Pix e baixe na hora.</p>
          <div class="footer-social">${redes}</div>
        </div>
      </div>
      <nav class="footer-col" aria-label="Loja">
        <h3>Loja</h3>
        <a href="/">Vitrine</a>
        <a href="/carrinho">Carrinho</a>
        <a href="/meus-materiais">Meus materiais</a>
      </nav>
      <nav class="footer-col" aria-label="Conta">
        <h3>Conta</h3>
        <a href="/login">Entrar</a>
        <a href="/cadastro">Criar conta</a>
      </nav>
      <div class="footer-col">
        <h3>Contato</h3>
        <a href="mailto:${CONTATO.email}">${CONTATO.email}</a>
        <span>${CONTATO.telefone}</span>
      </div>
    </div>
    <div class="footer-base">
      <div class="container footer-base-inner">
        <span>© ${new Date().getFullYear()} SlideHub · Todos os direitos reservados</span>
        <span>Feito com Pix, café e PowerPoint.</span>
      </div>
    </div>
  </footer>`;
}

/* ---------------- Carrinho (contador) ---------------- */
export async function refreshCartCount() {
  const badges = document.querySelectorAll('[data-cart-count]');
  if (!badges.length || !state.user) return;
  try {
    const { itens } = await api.get('/api/carrinho');
    badges.forEach((badge) => {
      badge.textContent = itens.length;
      badge.hidden = itens.length === 0;
    });
  } catch {
    /* silencioso */
  }
}

/* ---------------- Toasts ---------------- */
export function toast(mensagem, tipo = 'info', duracao = 3800) {
  const box = document.getElementById('toasts');
  if (!box) return;
  const el = document.createElement('div');
  el.className = `toast toast-${tipo}`;
  el.setAttribute('role', 'status');
  const icone =
    tipo === 'success'
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>'
      : tipo === 'error'
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v5m0 3.5v.5M12 21a9 9 0 110-18 9 9 0 010 18z"/></svg>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v.5m0 3.5v5M12 21a9 9 0 110-18 9 9 0 010 18z"/></svg>';
  el.innerHTML = `${icone}<span>${escapeHtml(mensagem)}</span><button class="toast-x" aria-label="Fechar aviso">×</button>`;
  box.appendChild(el);

  let fechado = false;
  const fecha = () => {
    if (fechado) return;
    fechado = true;
    el.classList.add('out');
    setTimeout(() => el.remove(), 300);
  };
  el.querySelector('.toast-x').addEventListener('click', fecha);
  setTimeout(fecha, duracao);
}

/* ---------------- Estados vazios / skeleton ---------------- */
export function skeletonGrid(n = 8) {
  return Array.from(
    { length: n },
    () => `
    <div class="card skel-card" aria-hidden="true">
      <div class="skel skel-cover"></div>
      <div class="card-body">
        <div class="skel skel-line w80"></div>
        <div class="skel skel-line"></div>
        <div class="skel skel-line w60"></div>
        <div class="skel skel-btn"></div>
      </div>
    </div>`
  ).join('');
}

export function emptyState({ titulo, texto, acaoHref, acaoLabel, icone = 'box' }) {
  const icons = {
    cart: '<path d="M4 6h2l2.4 10.4a1 1 0 001 .6h8.4a1 1 0 001-.8L20.5 9H7"/><circle cx="10" cy="20" r="1.6"/><circle cx="17" cy="20" r="1.6"/>',
    box: '<path d="M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8"/>',
    download: '<path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16"/>',
    alert: '<path d="M12 8v5m0 3.5v.5M12 21a9 9 0 110-18 9 9 0 010 18z"/>',
  };
  return `
  <div class="empty">
    <div class="empty-ico" aria-hidden="true"><svg viewBox="0 0 24 24">${icons[icone] || icons.box}</svg></div>
    <h3>${escapeHtml(titulo)}</h3>
    <p>${escapeHtml(texto)}</p>
    ${acaoHref ? `<a class="btn btn-primary" href="${acaoHref}">${escapeHtml(acaoLabel)}</a>` : ''}
  </div>`;
}

/* ---------------- Modal de confirmação ---------------- */
export function showModal({ titulo, corpo = '', okLabel = 'Confirmar', cancelLabel = 'Cancelar', perigo = false }) {
  return new Promise((resolve) => {
    const root = document.getElementById('modal-root') || document.body;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
        <h3 id="modal-titulo">${escapeHtml(titulo)}</h3>
        ${corpo ? `<div class="modal-corpo">${corpo}</div>` : ''}
        <div class="modal-acoes">
          <button type="button" class="btn btn-ghost" data-act="cancel">${escapeHtml(cancelLabel)}</button>
          <button type="button" class="btn ${perigo ? 'btn-danger' : 'btn-primary'}" data-act="ok">${escapeHtml(okLabel)}</button>
        </div>
      </div>`;
    root.appendChild(overlay);
    const okBtn = overlay.querySelector('[data-act="ok"]');
    okBtn.focus();

    const fecha = (v) => {
      overlay.remove();
      document.removeEventListener('keydown', esc);
      resolve(v);
    };
    const esc = (e) => {
      if (e.key === 'Escape') fecha(false);
    };
    document.addEventListener('keydown', esc);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) fecha(false);
    });
    overlay.querySelector('[data-act="cancel"]').addEventListener('click', () => fecha(false));
    okBtn.addEventListener('click', () => fecha(true));
  });
}
