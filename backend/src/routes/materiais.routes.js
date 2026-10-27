const router = require('express').Router();
const { z } = require('zod');
const ctrl = require('../controllers/materiais.controller');
const fb = require('../controllers/feedback.controller');
const { validate } = require('../middlewares/validate');
const { requireAuth } = require('../middlewares/auth');
const { comentarioLimiter } = require('../middlewares/rateLimit');


function authOpcional(req, res, next) {
  requireAuth(req, res, (err) => {
    // Sem token/token inválido: segue como visitante anônimo.
    next();
  });
}

const idParam = validate({ params: z.object({ id: z.coerce.number().int().min(1) }) });

router.get('/', authOpcional, ctrl.listar);
router.get('/capa/:id', idParam, ctrl.capa);
router.get('/foto/:fotoId', validate({ params: z.object({ fotoId: z.coerce.number().int().min(1) }) }), ctrl.foto);

// Comentários (excluir: autor ou admin)
router.delete(
  '/comentarios/:comentarioId',
  requireAuth,
  validate({ params: z.object({ comentarioId: z.coerce.number().int().min(1) }) }),
  fb.excluirComentario
);

// Editar o próprio comentário
router.put(
  '/comentarios/:comentarioId',
  requireAuth,
  comentarioLimiter,
  validate({ params: z.object({ comentarioId: z.coerce.number().int().min(1) }) }),
  fb.editarComentario
);

// Página do produto + avaliações + comentários
router.get('/:id', authOpcional, idParam, ctrl.detalhe);
router.get('/:id/comentarios', authOpcional, idParam, fb.listarComentarios);
router.post('/:id/comentarios', requireAuth, comentarioLimiter, idParam, fb.criarComentario);
router.put('/:id/avaliacao', requireAuth, idParam, fb.avaliar);

module.exports = router;
