function validate(schemas) {
  return (req, res, next) => {
    try {
      for (const key of ['params', 'query', 'body']) {
        if (schemas[key]) {
          req[key] = schemas[key].parse(req[key]);
        }
      }
      next();
    } catch (err) {
      if (err && err.name === 'ZodError') {
        const mensagem = (err.issues || err.errors || []).map((e) => e.message).join(' ') || 'Dados inválidos.';
        return next(Object.assign(new Error(mensagem), { status: 400, isApiError: true }));
      }
      next(err);
    }
  };
}

module.exports = { validate };
