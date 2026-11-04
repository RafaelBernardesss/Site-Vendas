// Adiciona o botão "mostrar/ocultar senha" (olhinho) em todos os campos de senha da página.
// Uso: import './senha-toggle.js';  (basta importar, ele se aplica sozinho)

const ICONE_OLHO =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const ICONE_OLHO_RISCADO =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.9 10.9 0 0 1 12 19c-6.4 0-10-7-10-7a18.5 18.5 0 0 1 5.06-5.94"/><path d="M9.9 4.24A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>';

function adicionarOlhinho(input) {
  if (input.dataset.senhaToggle) return;
  input.dataset.senhaToggle = '1';

  const wrap = document.createElement('div');
  wrap.className = 'input-senha';
  input.parentNode.insertBefore(wrap, input);
  wrap.appendChild(input);

  const btn = document.createElement('button');
  btn.type = 'button'; // não envia o formulário
  btn.className = 'btn-olho';
  btn.setAttribute('aria-label', 'Mostrar senha');
  btn.setAttribute('aria-pressed', 'false');
  btn.innerHTML = ICONE_OLHO;
  wrap.appendChild(btn);

  btn.addEventListener('click', () => {
    const mostrando = input.type === 'text';
    input.type = mostrando ? 'password' : 'text';
    btn.innerHTML = mostrando ? ICONE_OLHO : ICONE_OLHO_RISCADO;
    btn.setAttribute('aria-label', mostrando ? 'Mostrar senha' : 'Ocultar senha');
    btn.setAttribute('aria-pressed', String(!mostrando));
    input.focus({ preventScroll: true });
    // mantém o cursor no final do texto
    const fim = input.value.length;
    try { input.setSelectionRange(fim, fim); } catch { /* ignora */ }
  });
}

document.querySelectorAll('input[type="password"]').forEach(adicionarOlhinho);
