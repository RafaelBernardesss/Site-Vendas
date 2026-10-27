import { api } from './api.js';
import { renderHeader, renderFooter, loadUser, toast, state } from './ui.js';

const form = document.getElementById('form-login');
const erro = document.getElementById('form-erro');
const params = new URLSearchParams(location.search);

function mostrarErro(msg) {
  erro.textContent = msg || '';
  erro.hidden = !msg;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  mostrarErro('');

  const email = form.email.value.trim().toLowerCase();
  const senha = form.senha.value;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return mostrarErro('Informe um e-mail válido.');
  if (!senha) return mostrarErro('Informe sua senha.');

  const btn = form.querySelector('button[type="submit"]');
  const rotulo = btn.querySelector('.btn-text');
  btn.disabled = true;
  rotulo.textContent = 'Entrando…';

  try {
    const resp = await api.post('/api/auth/login', { email, senha });
    if (resp.requires2fa) {
      // Admin: senha ok, falta o código enviado por e-mail
      form.hidden = true;
      document.getElementById('alt-cadastro').hidden = true;
      document.querySelector('.auth-card h1').textContent = 'Verificação';
      document.querySelector('.auth-card > .auth-sub').hidden = true;
      formCodigo.hidden = false;
      document.getElementById('codigo-info').textContent = `Enviamos um código de 6 dígitos para ${resp.emailMascarado}. Ele vale por 10 minutos.`;
      document.getElementById('codigo').focus();
      return;
    }
    const { user } = resp;
    toast(`Olá, ${user.nome.split(' ')[0]}!`, 'success');
    const next = params.get('next');
    location.href = user.role === 'ADMIN' ? '/admin' : next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
  } catch (err) {
    mostrarErro(err.message);
    btn.disabled = false;
    rotulo.textContent = 'Entrar';
  }
});

// ---------- 2ª etapa (admin): código por e-mail ----------
const formCodigo = document.getElementById('form-codigo');
const erroCodigo = document.getElementById('codigo-erro');
function mostrarErroCodigo(msg) {
  erroCodigo.textContent = msg || '';
  erroCodigo.hidden = !msg;
}

formCodigo.addEventListener('submit', async (e) => {
  e.preventDefault();
  mostrarErroCodigo('');
  const codigo = formCodigo.codigo.value.trim();
  if (!/^\d{6}$/.test(codigo)) return mostrarErroCodigo('Digite os 6 números do código.');

  const btn = formCodigo.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    const { user } = await api.post('/api/auth/login/verificar', { codigo });
    toast(`Olá, ${user.nome.split(' ')[0]}!`, 'success');
    location.href = '/admin';
  } catch (err) {
    mostrarErroCodigo(err.message);
    btn.disabled = false;
  }
});

document.getElementById('reenviar').addEventListener('click', async (e) => {
  e.preventDefault();
  mostrarErroCodigo('');
  try {
    const r = await api.post('/api/auth/login/reenviar');
    toast(`Novo código enviado para ${r.emailMascarado}`, 'success');
  } catch (err) {
    mostrarErroCodigo(err.message);
  }
});

(async function init() {
  await loadUser();
  renderHeader();
  renderFooter();
  // Já logado: vai direto para o lugar certo
  if (state.user) {
    location.replace(state.user.role === 'ADMIN' ? '/admin' : '/');
  }
})();
