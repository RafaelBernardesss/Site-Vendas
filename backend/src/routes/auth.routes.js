const router = require('express').Router();
const { z } = require('zod');
const ctrl = require('../controllers/auth.controller');
const { validate } = require('../middlewares/validate');
const { loginLimiter, cadastroLimiter, codigoLimiter } = require('../middlewares/rateLimit');

const schemaCadastro = z.object({
  nome: z.string({ error: 'Informe seu nome.' }).trim().min(3, 'Informe seu nome completo (mínimo 3 caracteres).'),
  email: z.string({ error: 'Informe seu e-mail.' }).trim().toLowerCase().email('E-mail inválido.').max(120, 'E-mail muito longo.'),
  senha: z.string({ error: 'Informe sua senha.' }).min(8, 'A senha deve ter pelo menos 8 caracteres.'),
  dataNascimento: z
    .string({ error: 'Informe sua data de nascimento.' })
    .trim()
    .refine((v) => {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return false;
      if (d.getTime() > Date.now()) return false;
      const idade = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
      return idade >= 0 && idade <= 120;
    }, 'Data de nascimento inválida.'),
});

const schemaLogin = z.object({
  email: z.string({ error: 'Informe seu e-mail.' }).trim().toLowerCase().email('E-mail inválido.'),
  senha: z.string({ error: 'Informe sua senha.' }).min(1, 'Informe sua senha.'),
});

router.post('/cadastro', cadastroLimiter, validate({ body: schemaCadastro }), ctrl.cadastro);
router.post('/login', loginLimiter, validate({ body: schemaLogin }), ctrl.login);
const schemaCodigo = z.object({
  codigo: z.string({ error: 'Informe o código.' }).trim().regex(/^\d{6}$/, 'O código tem 6 números.'),
});
router.post('/login/verificar', codigoLimiter, validate({ body: schemaCodigo }), ctrl.verificarCodigoAdmin);
router.post('/login/reenviar', codigoLimiter, ctrl.reenviarCodigoAdmin);
router.get('/me', ctrl.me);
router.post('/sair', ctrl.sair);

module.exports = router;
