const nodemailer = require('nodemailer');
const env = require('./env');

let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465, // 465 = SSL; 587 = STARTTLS
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return transporter;
}

/** Para quem o código do admin é enviado. */
function destinoCodigoAdmin(user) {
  return env.ADMIN_CODE_EMAIL || user.email;
}

/** Mascara o e-mail para exibir na tela: jo***@gmail.com */
function mascararEmail(email) {
  const [u, dom] = String(email).split('@');
  return `${u.slice(0, 2)}***@${dom}`;
}

async function enviarCodigoAdmin(para, codigo) {
  await getTransporter().sendMail({
    from: env.MAIL_FROM || `"EducaPrime" <${env.SMTP_USER}>`,
    to: para,
    subject: `Seu código de acesso: ${codigo}`,
    text: `Seu código de verificação do painel admin é ${codigo}.\nEle vale por 10 minutos. Se não foi você, ignore este e-mail e troque sua senha.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto">
      <h2>Código de verificação</h2>
      <p>Use o código abaixo para entrar no painel administrativo:</p>
      <p style="font-size:34px;font-weight:bold;letter-spacing:8px;margin:16px 0">${codigo}</p>
      <p style="color:#666">Vale por 10 minutos. Se não foi você, ignore este e-mail e troque sua senha.</p>
    </div>`,
  });
}

module.exports = { enviarCodigoAdmin, destinoCodigoAdmin, mascararEmail };
