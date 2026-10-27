function soDigitos(valor = '') {
  return String(valor).replace(/\D/g, '');
}


function formatarCpf(valor) {
  const d = soDigitos(valor).slice(0, 11);
  if (d.length > 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length > 6) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  if (d.length > 3) return `${d.slice(0, 3)}.${d.slice(3)}`;
  return d;
}


function validarCpf(valor) {
  const d = soDigitos(valor);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false; 

  const digito = (n) => {
    let soma = 0;
    for (let i = 0; i < n; i += 1) soma += parseInt(d[i], 10) * (n + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return digito(9) === parseInt(d[9], 10) && digito(10) === parseInt(d[10], 10);
}

module.exports = { soDigitos, formatarCpf, validarCpf };
