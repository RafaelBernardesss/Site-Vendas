import { api } from './api.js';
import {
  state, renderHeader, renderFooter, loadUser, refreshCartCount, toast, emptyState,
  money, escapeHtml, dataBr, tamanhoBr, iniciais, showModal, stars, STAR_SVG_PATH,
  SPINNER, SVG_CART, SVG_DOWNLOAD,
} from './ui.js';

const root = document.getElementById('produto-root');
const id = Number(new URLSearchParams(location.search).get('id'));
const LABEL_TIPO = { POWERPOINT: 'PowerPoint', IMAGENS: 'Imagens', MISTO: 'PowerPoint + Imagens' };

document.body.classList.add('pg-produto');

let m = null; // material carregado
let fotoAtual = 0;

/* ---------------- Botão de ação (comprar / carrinho / download) ---------------- */
function botaoCompra() {
  if (m.comprado) {
    const href = m.arquivoId ? `/api/downloads/arquivo/${m.arquivoId}` : `/api/downloads/material/${m.id}`;
    return `<a class="btn btn-pix btn-lg btn-block" href="${href}">${SVG_DOWNLOAD}<span>Download</span></a>`;
  }
  if (state.user && state.user.role === 'ADMIN') {
    return `<span class="btn btn btn-outline btn-lg btn-block" style="cursor:default;opacity:.7" aria-disabled="true">Admin não compra</span>`;
  }
  if (m.noCarrinho) {
    return `<a class="btn btn-outline btn-lg btn-block" href="/carrinho">${SVG_CART}<span>No carrinho — ir para o pagamento</span></a>`;
  }
  return `<button class="btn btn-primary btn-lg btn-block" id="btn-comprar"><span>Comprar</span></button>`;
}

/* ---------------- Galeria ---------------- */
function galeriaHtml() {
  const fotos = m.galeria;
  if (!fotos.length) {
    return `<div class="galeria-main"><div class="galeria-vazia" aria-hidden="true">
      <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10M7 12h6"/></svg>
      <span>Sem fotos de divulgação</span></div></div>`;
  }
  const nav = fotos.length > 1
    ? `<button class="galeria-nav prev" data-nav="-1" aria-label="Foto anterior">‹</button>
       <button class="galeria-nav next" data-nav="1" aria-label="Próxima foto">›</button>
       <span class="galeria-count" id="galeria-count">${fotoAtual + 1} / ${fotos.length}</span>`
    : '';
  const dots = fotos.length > 1
    ? `<span class="galeria-dots" aria-hidden="true">${fotos.map((_, i) => `<i class="${i === fotoAtual ? 'on' : ''}"></i>`).join('')}</span>`
    : '';
  const thumbs = fotos.length > 1
    ? `<div class="galeria-thumbs">${fotos
        .map((f, i) => `<button class="galeria-thumb ${i === fotoAtual ? 'ativa' : ''}" data-foto="${i}" aria-label="Ver foto ${i + 1}"><img src="${f}" alt="" loading="lazy" /></button>`)
        .join('')}</div>`
    : '';
  const slides = fotos
    .map((f, i) => `<img class="galeria-slide" src="${f}" alt="Foto ${i + 1} de ${escapeHtml(m.titulo)}" draggable="false" ${i === 0 ? '' : 'loading="lazy"'} />`)
    .join('');
  return `<div class="galeria-main" id="galeria-main"><div class="galeria-track" id="galeria-track" style="transform:translate3d(${-fotoAtual * 100}%,0,0)">${slides}</div>${nav}${dots}</div>${thumbs}`;
}

/* Move a faixa para a foto atual. `deslocPx` acompanha o dedo/mouse durante o arraste. */
function aplicarPosicao(animar, deslocPx = 0) {
  const track = document.getElementById('galeria-track');
  if (!track) return;
  track.style.transition = animar ? '' : 'none';
  track.style.transform = `translate3d(calc(${-fotoAtual * 100}% + ${deslocPx}px),0,0)`;
}

function atualizarIndicadores() {
  const n = m.galeria.length;
  const cont = document.getElementById('galeria-count');
  if (cont) cont.textContent = `${fotoAtual + 1} / ${n}`;
  document.querySelectorAll('#galeria .galeria-dots i').forEach((d, i) => d.classList.toggle('on', i === fotoAtual));
  document.querySelectorAll('#galeria .galeria-thumb').forEach((t, i) => t.classList.toggle('ativa', i === fotoAtual));
}

function irParaFoto(i) {
  const n = m.galeria.length;
  if (!n) return;
  fotoAtual = ((i % n) + n) % n;
  aplicarPosicao(true);
  atualizarIndicadores();
}

function abrirLightbox() {
  if (document.querySelector('.lightbox')) return;
  const box = document.createElement('div');
  box.className = 'lightbox';
  box.innerHTML = `<img src="${m.galeria[fotoAtual]}" alt="" />`;
  const fecha = () => { box.remove(); document.removeEventListener('keydown', esc); };
  const esc = (ev) => { if (ev.key === 'Escape') fecha(); };
  box.addEventListener('click', fecha);
  document.addEventListener('keydown', esc);
  document.body.appendChild(box);
}

/* ---------------- Avaliações ---------------- */
function resumoHtml() {
  const a = m.avaliacoes;
  const barras = [5, 4, 3, 2, 1]
    .map((n) => {
      const pct = a.total ? Math.round((a.distribuicao[n] / a.total) * 100) : 0;
      return `<div class="aval-barra"><span>${n}★</span><div class="aval-trilho"><i style="width:${pct}%"></i></div><span>${a.distribuicao[n]}</span></div>`;
    })
    .join('');
  return `
    <div class="aval-media">${a.total ? a.media.toFixed(1).replace('.', ',') : '—'}</div>
    <div style="margin-top:6px">${stars(a.media)}</div>
    <p class="muted small" style="margin:6px 0 0">${a.total ? `${a.total} avaliaç${a.total > 1 ? 'ões' : 'ão'}` : 'Ninguém avaliou ainda'}</p>
    <div class="aval-barras">${barras}</div>`;
}

function avaliarBoxHtml() {
  if (!state.user) {
    return `<p class="aviso-compra"><a href="/login?next=${encodeURIComponent(location.pathname + location.search)}">Entre na sua conta</a> para avaliar este material depois de comprar.</p>`;
  }
  if (!m.comprado) {
    return '<p class="aviso-compra">🔒 Somente quem comprou pode avaliar</p>';
  }
  // Já avaliou: a nota é definitiva, então mostra só as estrelas (sem botões).
  if (m.minhaNota) {
    return `<div class="avaliar-box"><p>Sua avaliação:</p><div>${stars(m.minhaNota)}</div><p class="muted small" style="margin:6px 0 0">Você já avaliou este material. Cada usuário avalia uma única vez.</p></div>`;
  }
  const botoes = [1, 2, 3, 4, 5]
    .map((n) => `<button type="button" data-nota="${n}" aria-label="${n} estrela${n > 1 ? 's' : ''}"><svg viewBox="0 0 24 24" class="star"><path d="${STAR_SVG_PATH}"/></svg></button>`)
    .join('');
  return `<div class="avaliar-box"><p>Avalie este material (só é possível uma vez):</p><div class="estrelas-input" id="estrelas-input">${botoes}</div></div>`;
}

function atualizarAvaliacoes() {
  document.getElementById('aval-resumo').innerHTML = resumoHtml() + avaliarBoxHtml();
  const ratingTopo = document.getElementById('rating-topo');
  if (ratingTopo) ratingTopo.innerHTML = ratingTopoHtml();
}

function ratingTopoHtml() {
  const a = m.avaliacoes;
  return a.total
    ? `${stars(a.media)} <strong>${a.media.toFixed(1).replace('.', ',')}</strong> <a href="#avaliacoes">(${a.total} avaliaç${a.total > 1 ? 'ões' : 'ão'})</a>`
    : '<a href="#avaliacoes">Seja o primeiro a avaliar</a>';
}

/* ---------------- Comentários ---------------- */
function comentarioHtml(c) {
  return `
  <article class="comentario" data-cid="${c.id}">
    <div class="comentario-topo">
      <span class="avatar" aria-hidden="true">${iniciais(c.autor)}</span>
      <span class="comentario-autor">${escapeHtml(c.autor)}</span>
      ${c.admin ? '<span class="selo loja">Loja</span>' : ''}
      ${c.compraVerificada ? '<span class="selo">Compra verificada</span>' : ''}
      ${c.nota ? stars(c.nota) : ''}
      <span class="comentario-data">${dataBr(c.createdAt)}</span>
    </div>
    <p>${escapeHtml(c.texto)}</p>
    ${(c.respostas || []).map((r) => `<div class="comentario-resposta"><div class="comentario-topo"><span class="selo loja">Loja</span><strong>${escapeHtml(r.autor)}</strong>${r.meu || r.podeExcluir ? `<span class="resp-acoes">${r.meu ? `<button class="comentario-edit" data-edit-resp="${r.id}">Editar</button>` : ''}${r.podeExcluir ? `<button class="comentario-del" data-del-resp="${r.id}">Excluir</button>` : ''}</span>` : ''}</div><p>${escapeHtml(r.texto)}</p><div class="resp-data">${dataBr(r.createdAt)}</div></div>`).join('')}
    <div class="comentario-acoes">
      ${c.meu ? `<button class="comentario-edit" data-edit="${c.id}">Editar</button>` : ''}
      ${c.podeExcluir ? `<button class="comentario-del" data-del="${c.id}">Excluir</button>` : ''}
    </div>
  </article>`;
}

let jaComentei = false; // o usuário logado já tem um comentário neste material
let formRenderizadoComo = null; // evita redesenhar o formulário (e apagar o texto digitado) sem necessidade

async function carregarComentarios() {
  const lista = document.getElementById('comentario-lista');
  try {
    const dados = await api.get(`/api/materiais/${id}/comentarios`);
    const { comentarios } = dados;
    jaComentei = !!dados.jaComentei;
    lista.innerHTML = comentarios.length
      ? comentarios.map(comentarioHtml).join('')
      : '<p class="muted">Ainda não há comentários. Seja o primeiro a deixar um feedback!</p>';
  } catch (err) {
    lista.innerHTML = `<p class="muted">${escapeHtml(err.message)}</p>`;
  }
  atualizarFormComentario();
}

function atualizarFormComentario() {
  const box = document.getElementById('comentario-form-box');
  if (!box || formRenderizadoComo === jaComentei) return;
  box.innerHTML = comentarioFormHtml();
  formRenderizadoComo = jaComentei;
}

function comentarioFormHtml() {
  if (!state.user) {
    return `<p class="muted"><a href="/login?next=${encodeURIComponent(location.pathname + location.search)}">Entre na sua conta</a> para comentar.</p>`;
  }
  if (jaComentei) {
    return '<p class="aviso-compra">Você já comentou neste material. Para escrever outro comentário, exclua o seu.</p>';
  }
  return `
  <form class="comentario-form" id="comentario-form" novalidate>
    <label class="sr-only" for="comentario-texto" style="position:absolute;left:-9999px">Seu comentário</label>
    <textarea id="comentario-texto" maxlength="1000" placeholder="Conte como foi sua experiência com este material…"></textarea>
    <div class="linha">
      <span class="contador-chars"><span id="chars">0</span>/1000</span>
      <button type="submit" class="btn btn-primary btn-sm"><span class="btn-text">Publicar comentário</span></button>
    </div>
  </form>`;
}

/* ---------------- Página ---------------- */
function render() {
  document.title = `${m.titulo} · EducaPrime`;
  const pacote = m.arquivos.length
    ? `<div class="produto-box"><h2>O que você recebe (${m.arquivos.length} arquivo${m.arquivos.length > 1 ? 's' : ''})</h2>
        <ul class="pacote-lista">${m.arquivos
          .map((a) => `<li><span>${escapeHtml(a.nomeArquivo)}</span><span class="muted small">${a.tipo === 'PPTX' ? 'PowerPoint' : 'Imagem'} · ${tamanhoBr(a.tamanho)}</span></li>`)
          .join('')}</ul></div>`
    : '';

  root.innerHTML = `
  <nav class="breadcrumb" aria-label="Você está em"><a href="/">Vitrine</a><span>›</span><span>${escapeHtml(m.titulo)}</span></nav>
  <div class="produto">
    <div id="galeria">${galeriaHtml()}</div>
    <div class="produto-info">
      <span class="chip" style="position:static;display:inline-block">${LABEL_TIPO[m.tipo] || 'Digital'}</span>
      <h1>${escapeHtml(m.titulo)}</h1>
      <div class="rating-inline" id="rating-topo">${ratingTopoHtml()}</div>
      <div class="produto-preco">${money(m.preco)}</div>
      <p class="muted small" style="margin:0 0 14px">Pagamento via Pix · download imediato após a confirmação</p>
      <div class="buybar">
        <div class="buybar-preco"><small>Pix · download imediato</small><strong>${money(m.preco)}</strong></div>
        <div id="acao-compra">${botaoCompra()}</div>
      </div>
      <p class="produto-desc">${m.descricao ? escapeHtml(m.descricao) : '<span class="muted">O vendedor não adicionou uma descrição.</span>'}</p>
      ${pacote}
      <p class="produto-garantia">🔒 Acesso protegido. Só quem compra consegue baixar os arquivos.</p>
    </div>
  </div>

  <section class="secao-feedback" id="avaliacoes" aria-label="Avaliações e comentários">
    <aside class="aval-resumo" id="aval-resumo">${resumoHtml()}${avaliarBoxHtml()}</aside>
    <div class="comentarios">
      <h2>Comentários</h2>
      <div id="comentario-form-box"></div>
      <div class="comentario-lista" id="comentario-lista"><p class="muted">Carregando…</p></div>
    </div>
  </section>`;
  formRenderizadoComo = null;
  carregarComentarios(); // também desenha o formulário (ou o aviso de "já comentou")
}

async function carregar() {
  if (!Number.isInteger(id) || id < 1) {
    root.innerHTML = emptyState({ titulo: 'Material não encontrado', texto: 'O link está incompleto.', acaoHref: '/', acaoLabel: 'Voltar à vitrine', icone: 'alert' });
    return;
  }
  try {
    ({ material: m } = await api.get(`/api/materiais/${id}`));
    render();
  } catch (err) {
    root.innerHTML = emptyState({
      titulo: err.status === 404 ? 'Material não encontrado' : 'Não foi possível carregar',
      texto: err.message, acaoHref: '/', acaoLabel: 'Voltar à vitrine', icone: 'alert',
    });
  }
}

/* ---------------- Arrastar fotos (celular e computador) ----------------
   Pointer Events: o mesmo código serve para dedo, mouse e caneta.
   A foto acompanha o dedo/mouse e, ao soltar, desliza até a foto certa. */
let arr = null;        // arraste em andamento
let arrastou = false;  // true se o último gesto foi um arraste (não um clique)

function fimDoArraste(e, cancelado) {
  if (!arr || e.pointerId !== arr.id) return;
  const a = arr;
  arr = null;
  a.main.classList.remove('arrastando');
  if (a.main.hasPointerCapture && a.main.hasPointerCapture(a.id)) a.main.releasePointerCapture(a.id);
  if (!a.horizontal) return; // toque simples (vira clique) ou rolagem vertical

  const n = m.galeria.length;
  const dx = e.clientX - a.x0;
  const veloc = Math.abs(dx) / Math.max(1, performance.now() - a.t0); // px por ms
  const passou = Math.abs(dx) > a.largura * 0.2 || (Math.abs(dx) > 30 && veloc > 0.4);
  if (!cancelado && n > 1 && passou) {
    const alvo = fotoAtual + (dx < 0 ? 1 : -1);
    if (alvo >= 0 && alvo < n) fotoAtual = alvo;
  }
  aplicarPosicao(true);   // anima até a foto (ou volta para a mesma)
  atualizarIndicadores();
}

root.addEventListener('pointerdown', (e) => {
  const main = e.target.closest('.galeria-main');
  if (!main || e.target.closest('.galeria-nav')) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  arrastou = false;
  arr = { id: e.pointerId, main, x0: e.clientX, y0: e.clientY, largura: main.clientWidth || 1, horizontal: null, t0: performance.now() };
});

root.addEventListener('pointermove', (e) => {
  if (!arr || e.pointerId !== arr.id) return;
  const dx = e.clientX - arr.x0;
  const dy = e.clientY - arr.y0;
  if (arr.horizontal === null) {
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return; // ainda pode ser um clique
    arr.horizontal = Math.abs(dx) > Math.abs(dy);
    if (arr.horizontal) {
      arrastou = true;
      arr.main.classList.add('arrastando');
      try { arr.main.setPointerCapture(e.pointerId); } catch { /* ok */ }
    }
  }
  if (!arr.horizontal || m.galeria.length < 2) return;
  const n = m.galeria.length;
  const naPonta = (fotoAtual === 0 && dx > 0) || (fotoAtual === n - 1 && dx < 0);
  aplicarPosicao(false, naPonta ? dx * 0.35 : dx); // "elástico" nas pontas
});

root.addEventListener('pointerup', (e) => fimDoArraste(e, false));
root.addEventListener('pointercancel', (e) => fimDoArraste(e, true));

/* ---------------- Eventos ---------------- */
root.addEventListener('click', async (e) => {
  // Galeria
  const thumb = e.target.closest('[data-foto]');
  if (thumb) return irParaFoto(Number(thumb.dataset.foto));
  const nav = e.target.closest('[data-nav]');
  if (nav) return irParaFoto(fotoAtual + Number(nav.dataset.nav));
  if (e.target.closest('.galeria-main')) {
    // Um único clique/toque abre a foto. Se o gesto foi um arraste, não abre.
    if (arrastou) { arrastou = false; return; }
    if (m.galeria.length) abrirLightbox();
    return;
  }

  // Comprar
  if (e.target.closest('#btn-comprar')) {
    const btn = document.getElementById('btn-comprar');
    btn.disabled = true;
    btn.innerHTML = `${SPINNER}<span>Adicionando…</span>`;
    try {
      await api.post('/api/carrinho', { materialId: m.id });
      m.noCarrinho = true;
      toast('Adicionado ao carrinho!', 'success');
      document.getElementById('acao-compra').innerHTML = botaoCompra();
      refreshCartCount();
    } catch (err) {
      if (err.status === 401) { location.href = `/login?next=${encodeURIComponent(location.pathname + location.search)}`; return; }
      toast(err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '<span>Comprar</span>';
    }
    return;
  }

  // Avaliar
  const notaBtn = e.target.closest('[data-nota]');
  if (notaBtn) {
    try {
      const r = await api.put(`/api/materiais/${m.id}/avaliacao`, { nota: Number(notaBtn.dataset.nota) });
      m.minhaNota = r.minhaNota;
      m.avaliacoes = r.avaliacoes;
      atualizarAvaliacoes();
      carregarComentarios();
      toast('Obrigado pela avaliação!', 'success');
    } catch (err) {
      toast(err.message, 'error');
      if (err.status === 409) {
        // Já havia avaliado (outra aba/dispositivo): sincroniza e trava as estrelas.
        try {
          ({ material: m } = await api.get(`/api/materiais/${id}`));
          atualizarAvaliacoes();
        } catch { /* mantém a tela como está */ }
      }
    }
    return;
  }

  // Editar (comentário próprio ou resposta própria do admin): troca o texto por uma caixa de edição
  const edit = e.target.closest('[data-edit], [data-edit-resp]');
  if (edit) {
    const ehResp = edit.hasAttribute('data-edit-resp');
    const card = edit.closest(ehResp ? '.comentario-resposta' : '.comentario');
    const p = card.querySelector(':scope > p');
    const atual = p.textContent;
    const minimo = ehResp ? 2 : 3;
    const url = ehResp
      ? `/api/admin/respostas/${edit.dataset.editResp}`
      : `/api/materiais/comentarios/${edit.dataset.edit}`;
    const form = document.createElement('form');
    form.className = 'comentario-editar';
    form.innerHTML = `<textarea maxlength="1000" aria-label="Editar"></textarea>
      <div class="linha"><button type="button" class="btn btn-ghost btn-sm" data-edit-cancel>Cancelar</button>
      <button type="submit" class="btn btn-primary btn-sm">Salvar</button></div>`;
    form.querySelector('textarea').value = atual;
    p.replaceWith(form);
    const acoes = card.querySelector(':scope > .comentario-acoes');
    if (acoes) acoes.hidden = true;
    form.querySelector('textarea').focus();
    form.querySelector('[data-edit-cancel]').addEventListener('click', () => carregarComentarios());
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const texto = form.querySelector('textarea').value.trim();
      if (texto.length < minimo) return toast(`Escreva pelo menos ${minimo} caracteres.`, 'error');
      const salvar = form.querySelector('[type="submit"]');
      salvar.disabled = true;
      try {
        await api.put(url, { texto });
        toast(ehResp ? 'Resposta atualizada.' : 'Comentário atualizado.', 'success');
        carregarComentarios();
      } catch (err) {
        toast(err.message, 'error');
        salvar.disabled = false;
      }
    });
    return;
  }

  // Excluir resposta da loja (admin)
  const delResp = e.target.closest('[data-del-resp]');
  if (delResp) {
    const ok = await showModal({ titulo: 'Excluir resposta', corpo: '<p>Tem certeza que deseja excluir esta resposta?</p>', okLabel: 'Excluir', perigo: true });
    if (!ok) return;
    try {
      await api.del(`/api/admin/respostas/${delResp.dataset.delResp}`);
      toast('Resposta excluída.', 'success');
      carregarComentarios();
    } catch (err) {
      toast(err.message, 'error');
    }
    return;
  }

  // Excluir comentário
  const del = e.target.closest('[data-del]');
  if (del) {
    const ok = await showModal({ titulo: 'Excluir comentário', corpo: '<p>Tem certeza que deseja excluir este comentário?</p>', okLabel: 'Excluir', perigo: true });
    if (!ok) return;
    try {
      await api.del(`/api/materiais/comentarios/${del.dataset.del}`);
      toast('Comentário excluído.', 'success');
      carregarComentarios();
    } catch (err) {
      toast(err.message, 'error');
    }
  }
});

root.addEventListener('input', (e) => {
  if (e.target.id === 'comentario-texto') document.getElementById('chars').textContent = e.target.value.length;
});

root.addEventListener('submit', async (e) => {
  if (e.target.id !== 'comentario-form') return;
  e.preventDefault();
  const campo = document.getElementById('comentario-texto');
  const texto = campo.value.trim();
  if (texto.length < 3) return toast('Escreva pelo menos 3 caracteres.', 'error');
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    await api.post(`/api/materiais/${m.id}/comentarios`, { texto });
    campo.value = '';
    document.getElementById('chars').textContent = '0';
    toast('Comentário publicado!', 'success');
    carregarComentarios();
  } catch (err) {
    toast(err.message, 'error');
    if (err.status === 409) carregarComentarios(); 
  } finally {
    btn.disabled = false;
  }
});

(async function init() {
  await loadUser();
  renderHeader();
  renderFooter();
  refreshCartCount();
  carregar();
})();