import { api } from './api.js';
import {
  state, renderHeader, renderFooter, loadUser, toast,
  money, escapeHtml, stars, iniciais, showModal,
} from './ui.js';

const $ = (id) => document.getElementById(id);
const dataHora = (iso) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

let materiais = [];
let pagina = 1;
let carregando = false;

/* ---------------- Resumo (cards + tabela por material) ---------------- */
function statsHtml(t) {
  const card = (valor, rotulo, extra = '') => `<div class="fb-stat ${extra}"><strong>${valor}</strong><span>${rotulo}</span></div>`;
  return [
    card(t.compradores, 'compras de materiais'),
    card(t.avaliacoes ? `${String(t.media).replace('.', ',')} ★` : '—', `nota média · ${t.avaliacoes} avaliaç${t.avaliacoes === 1 ? 'ão' : 'ões'}`),
    card(t.comentarios, 'comentários'),
    card(t.semResposta, 'sem resposta', t.semResposta ? 'alerta' : ''),
  ].join('');
}

function distribuicaoHtml(m) {
  if (!m.avaliacoes) return '<span class="muted small">Sem avaliações</span>';
  const linhas = [5, 4, 3, 2, 1]
    .map((n) => {
      const q = m.distribuicao[n] || 0;
      const pct = Math.round((q / m.avaliacoes) * 100);
      return `<div class="fb-dist-linha"><span>${n}★</span><div class="fb-dist-barra"><i style="width:${pct}%"></i></div><span class="muted">${q}</span></div>`;
    })
    .join('');
  return `<div class="fb-nota">${stars(m.media)} <strong>${String(m.media).replace('.', ',')}</strong>
    <span class="muted small">(${m.avaliacoes})</span></div><div class="fb-dist">${linhas}</div>`;
}

function linhaMaterial(m) {
  const capa = m.capa
    ? `<img class="admin-thumb" src="${m.capa}" alt="" />`
    : '<div class="admin-thumb admin-thumb-fallback" aria-hidden="true">S</div>';
  return `
  <tr>
    <td class="admin-td-material">${capa}<div><strong>${escapeHtml(m.titulo)}</strong><span class="muted small">${money(m.preco)}</span></div></td>
    <td>
      <button class="fb-link" data-compradores="${m.id}" ${m.compradores ? '' : 'disabled'}>
        <span class="pill-vendas">${m.compradores}</span> ${m.compradores === 1 ? 'pessoa' : 'pessoas'}
      </button>
      <span class="muted small fb-receita">${money(m.receita)}</span>
    </td>
    <td>${distribuicaoHtml(m)}</td>
    <td>
      <button class="fb-link" data-ver-coment="${m.id}" ${m.comentarios ? '' : 'disabled'}>${m.comentarios} comentário${m.comentarios === 1 ? '' : 's'}</button>
      ${m.semResposta ? `<span class="fb-badge">${m.semResposta} sem resposta</span>` : ''}
    </td>
  </tr>`;
}

async function carregarResumo() {
  try {
    const { totais, materiais: lista } = await api.get('/api/admin/feedback/resumo');
    materiais = lista;
    $('fb-stats').innerHTML = statsHtml(totais);
    const badge = $('badge-pend');
    badge.hidden = !totais.semResposta;
    badge.textContent = totais.semResposta;

    $('f-material').innerHTML =
      '<option value="">Todos os materiais</option>' +
      lista.map((m) => `<option value="${m.id}">${escapeHtml(m.titulo)}</option>`).join('');

    $('fb-materiais').innerHTML = lista.length
      ? `<div class="table-wrap"><table class="table">
          <thead><tr><th>Material</th><th>Quem comprou</th><th>Avaliações</th><th>Comentários</th></tr></thead>
          <tbody>${lista.map(linhaMaterial).join('')}</tbody></table></div>`
      : '<div class="empty"><h3>Nenhum material publicado</h3><p>Publique um material no painel do admin.</p></div>';
  } catch (err) {
    toast(err.message, 'error');
  }
}

/* ---------------- Compradores (modal) ---------------- */
async function abrirCompradores(id) {
  let dados;
  try {
    dados = await api.get(`/api/admin/materiais/${id}/compradores`);
  } catch (err) {
    return toast(err.message, 'error');
  }
  const linhas = dados.compradores
    .map(
      (c) => `<tr>
        <td><strong>${escapeHtml(c.nome)}</strong><span class="muted small block">${escapeHtml(c.email)}</span></td>
        <td class="muted small">${dataHora(c.compradoEm)}</td>
        <td>${c.nota ? stars(c.nota) : '<span class="muted small">Não avaliou</span>'}</td>
        <td>${c.comentarioId ? `<button class="fb-link" data-ir-coment="${c.comentarioId}">Ver</button>` : '<span class="muted small">—</span>'}</td>
      </tr>`
    )
    .join('');
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal fb-modal" role="dialog" aria-modal="true" aria-labelledby="cp-titulo">
      <h3 id="cp-titulo">Quem comprou: ${escapeHtml(dados.material.titulo)}</h3>
      <div class="modal-corpo">
        <p class="muted small">${dados.compradores.length} pessoa${dados.compradores.length === 1 ? '' : 's'}</p>
        <div class="table-wrap"><table class="table"><thead><tr><th>Cliente</th><th>Comprou em</th><th>Nota</th><th>Comentário</th></tr></thead><tbody>${linhas}</tbody></table></div>
      </div>
      <div class="modal-acoes"><button type="button" class="btn btn-primary" data-act="ok">Fechar</button></div>
    </div>`;
  $('modal-root').appendChild(overlay);
  const fecha = () => { overlay.remove(); document.removeEventListener('keydown', esc); };
  const esc = (e) => { if (e.key === 'Escape') fecha(); };
  document.addEventListener('keydown', esc);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('[data-act="ok"]')) return fecha();
    const ir = e.target.closest('[data-ir-coment]');
    if (ir) { fecha(); irParaComentarios({ materialId: id, busca: '' }); }
  });
  overlay.querySelector('[data-act="ok"]').focus();
}

/* ---------------- Comentários ---------------- */
function respostaHtml(r) {
  return `<div class="fb-resposta" data-rid="${r.id}">
    <div class="fb-resposta-topo"><span class="selo loja">${r.admin ? 'Loja' : 'Cliente'}</span>
      <strong>${escapeHtml(r.autor)}</strong>
      <span class="fb-acoes">${r.autorId === state.user.id ? `<button class="comentario-edit" data-edit-resp="${r.id}">Editar</button>` : ''}
      <button class="comentario-del" data-del-resp="${r.id}">Excluir</button></span></div>
    <p>${escapeHtml(r.texto)}</p>
    <div class="resp-data">${dataHora(r.createdAt)}</div></div>`;
}

function comentarioCard(c) {
  const pend = c.respostas.length === 0 && !c.autor.admin;
  return `
  <article class="comentario fb-coment ${pend ? 'pendente' : ''}" data-cid="${c.id}">
    <div class="comentario-topo">
      <span class="avatar" aria-hidden="true">${iniciais(c.autor.nome)}</span>
      <span class="comentario-autor">${escapeHtml(c.autor.nome)}</span>
      <span class="muted small">${escapeHtml(c.autor.email)}</span>
      ${c.autor.admin ? '<span class="selo loja">Loja</span>' : ''}
      ${c.comprou ? '<span class="selo">Comprou</span>' : '<span class="selo nao">Não comprou</span>'}
      ${c.nota ? stars(c.nota) : ''}
      <span class="comentario-data">${dataHora(c.createdAt)}</span>
    </div>
    <div class="fb-material muted small">Em: <a href="/produto?id=${c.material.id}" target="_blank" rel="noopener">${escapeHtml(c.material.titulo)}</a>
      ${pend ? '<span class="fb-badge">Sem resposta</span>' : ''}</div>
    <p class="fb-texto">${escapeHtml(c.texto)}</p>
    ${c.autor.id === state.user.id ? `<div class="fb-acoes"><button class="comentario-edit" data-edit-coment="${c.id}">Editar</button></div>` : ''}
    <div class="fb-respostas">${c.respostas.map(respostaHtml).join('')}</div>
    <form class="fb-form-resp" data-cid="${c.id}">
      <textarea maxlength="1000" rows="2" placeholder="Escreva uma resposta ao cliente…" aria-label="Resposta"></textarea>
      <div class="linha"><span class="muted small">Ctrl+Enter para enviar · aparece publicamente na página do material</span>
        <button type="submit" class="btn btn-primary btn-sm"><span class="btn-text">Responder</span></button></div>
    </form>
  </article>`;
}

function filtros() {
  return {
    materialId: $('f-material').value,
    status: $('f-status').value,
    q: $('f-q').value.trim(),
  };
}

async function carregarComentarios({ reset = true } = {}) {
  if (carregando) return;
  carregando = true;
  if (reset) {
    pagina = 1;
    $('fb-comentarios').innerHTML = '<div class="skeleton-list"><div class="skel skel-row"></div><div class="skel skel-row"></div></div>';
  }
  const f = filtros();
  const qs = new URLSearchParams({ status: f.status, pagina: String(pagina), limite: '15' });
  if (f.materialId) qs.set('materialId', f.materialId);
  if (f.q) qs.set('q', f.q);
  try {
    const dados = await api.get(`/api/admin/comentarios?${qs}`);
    const html = dados.comentarios.map(comentarioCard).join('');
    if (reset) {
      $('fb-comentarios').innerHTML =
        html || '<div class="empty"><h3>Nenhum comentário encontrado</h3><p>Ajuste os filtros para ver outros comentários.</p></div>';
    } else {
      $('fb-comentarios').insertAdjacentHTML('beforeend', html);
    }
    $('fb-mais').hidden = dados.pagina >= dados.paginas;
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    carregando = false;
  }
}

function irParaComentarios({ materialId = '', status = 'todos', busca = '' } = {}) {
  $('f-material').value = String(materialId || '');
  $('f-status').value = status;
  $('f-q').value = busca;
  trocarAba('comentarios');
}

function trocarAba(nome) {
  document.querySelectorAll('.fb-tab').forEach((b) => {
    const on = b.dataset.tab === nome;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', String(on));
  });
  $('painel-materiais').hidden = nome !== 'materiais';
  $('painel-comentarios').hidden = nome !== 'comentarios';
  if (nome === 'comentarios') carregarComentarios();
  else carregarResumo();
}

async function enviarResposta(form) {
  const ta = form.querySelector('textarea');
  const texto = ta.value.trim();
  if (texto.length < 2) return toast('Escreva a resposta antes de enviar.', 'error');
  const btn = form.querySelector('button[type="submit"]');
  const rot = btn.querySelector('.btn-text');
  btn.disabled = true;
  rot.textContent = 'Enviando…';
  try {
    const r = await api.post(`/api/admin/comentarios/${form.dataset.cid}/respostas`, { texto });
    const card = form.closest('.comentario');
    card.querySelector('.fb-respostas').insertAdjacentHTML('beforeend', respostaHtml(r));
    card.classList.remove('pendente');
    card.querySelectorAll('.fb-material .fb-badge').forEach((b) => b.remove());
    ta.value = '';
    toast('Resposta enviada!', 'success');
    carregarResumoSilencioso();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false;
    rot.textContent = 'Responder';
  }
}

/** Atualiza os contadores sem redesenhar a aba de comentários. */
async function carregarResumoSilencioso() {
  try {
    const { totais, materiais: lista } = await api.get('/api/admin/feedback/resumo');
    materiais = lista;
    $('fb-stats').innerHTML = statsHtml(totais);
    $('badge-pend').hidden = !totais.semResposta;
    $('badge-pend').textContent = totais.semResposta;
  } catch { /* ignora */ }
}

/** Troca o texto por uma caixa de edição; salva por PUT e atualiza o texto na tela. */
function editarInline(container, p, url, min) {
  if (container.querySelector(':scope > .fb-editar')) return;
  const original = p.textContent;
  const form = document.createElement('form');
  form.className = 'fb-editar';
  form.innerHTML = `<textarea maxlength="1000" aria-label="Editar mensagem"></textarea>
    <div class="linha"><button type="button" class="btn btn-ghost btn-sm" data-cancel>Cancelar</button>
    <button type="submit" class="btn btn-primary btn-sm">Salvar</button></div>`;
  const ta = form.querySelector('textarea');
  ta.value = original;
  p.hidden = true;
  p.after(form);
  ta.focus();
  const fechar = () => { form.remove(); p.hidden = false; };
  form.querySelector('[data-cancel]').addEventListener('click', fechar);
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const texto = ta.value.trim();
    if (texto.length < min) return toast(`Escreva pelo menos ${min} caracteres.`, 'error');
    const salvar = form.querySelector('[type="submit"]');
    salvar.disabled = true;
    try {
      await api.put(url, { texto });
      p.textContent = texto;
      fechar();
      toast('Mensagem atualizada.', 'success');
    } catch (err) {
      toast(err.message, 'error');
      salvar.disabled = false;
    }
  });
  ta.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); form.requestSubmit(); }
    if (ev.key === 'Escape') fechar();
  });
}

/* ---------------- Eventos ---------------- */
document.addEventListener('click', async (e) => {
  const tab = e.target.closest('.fb-tab');
  if (tab) return trocarAba(tab.dataset.tab);

  const comp = e.target.closest('[data-compradores]');
  if (comp) return abrirCompradores(Number(comp.dataset.compradores));

  const ver = e.target.closest('[data-ver-coment]');
  if (ver) return irParaComentarios({ materialId: ver.dataset.verComent });

  const edR = e.target.closest('[data-edit-resp]');
  if (edR) {
    const box = edR.closest('.fb-resposta');
    return editarInline(box, box.querySelector(':scope > p'), `/api/admin/respostas/${edR.dataset.editResp}`, 2);
  }
  const edC = e.target.closest('[data-edit-coment]');
  if (edC) {
    const card = edC.closest('.comentario');
    return editarInline(card, card.querySelector(':scope > .fb-texto'), `/api/materiais/comentarios/${edC.dataset.editComent}`, 3);
  }

  const del = e.target.closest('[data-del-resp]');
  if (del) {
    const ok = await showModal({ titulo: 'Excluir resposta', corpo: '<p>Tem certeza que deseja excluir esta resposta?</p>', okLabel: 'Excluir', perigo: true });
    if (!ok) return;
    try {
      await api.del(`/api/admin/respostas/${del.dataset.delResp}`);
      const card = del.closest('.comentario');
      del.closest('.fb-resposta').remove();
      if (!card.querySelector('.fb-resposta')) card.classList.add('pendente');
      toast('Resposta excluída.', 'success');
      carregarResumoSilencioso();
    } catch (err) {
      toast(err.message, 'error');
    }
  }
});

document.addEventListener('submit', (e) => {
  if (e.target.classList.contains('fb-form-resp')) {
    e.preventDefault();
    enviarResposta(e.target);
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && e.target.matches('.fb-form-resp textarea')) {
    e.preventDefault();
    enviarResposta(e.target.closest('form'));
  }
});

['f-material', 'f-status'].forEach((id) => $(id).addEventListener('change', () => carregarComentarios()));
let timer;
$('f-q').addEventListener('input', () => {
  clearTimeout(timer);
  timer = setTimeout(() => carregarComentarios(), 350);
});
$('fb-mais').addEventListener('click', () => {
  pagina += 1;
  carregarComentarios({ reset: false });
});

/* ---------------- Init com guarda de admin ---------------- */
(async function init() {
  await loadUser();
  renderHeader();
  renderFooter();

  if (!state.user) {
    location.href = '/login?next=%2Fadmin-feedback';
    return;
  }
  if (state.user.role !== 'ADMIN') {
    toast('Acesso restrito ao administrador.', 'error');
    setTimeout(() => { location.href = '/'; }, 1400);
    return;
  }
  await carregarResumo();
  if (new URLSearchParams(location.search).get('aba') === 'comentarios') trocarAba('comentarios');
})();
