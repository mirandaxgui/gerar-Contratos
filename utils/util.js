/** Util: data de hoje em pt-BR por extenso */
export function dataHojePtBrExtenso() {
  const tz = 'America/Sao_Paulo';
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: tz
  }).format(new Date());
}

/** Util: data de hoje em formato curto */
export function dataHojePtBrCurta() {
  const tz = 'America/Sao_Paulo';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: tz
  }).format(new Date());
}

/** Cálculo de preços conforme quantidade de vidas */
export function obterPrecosPorVidas(qtdVidas) {
  if (qtdVidas <= 5) return { basico: 120, essencial: 170, premium: 190 };
  if (qtdVidas <= 10) return { basico: 160, essencial: 200, premium: 250 };
  if (qtdVidas <= 20) return { basico: 190, essencial: 290, premium: 360 };
  if (qtdVidas <= 30) return { basico: 240, essencial: 390, premium: 525 };
  if (qtdVidas <= 40) return { basico: 290, essencial: 450, premium: 675 };
  if (qtdVidas <= 50) return { basico: 400, essencial: 510, premium: 820 };
  return { basico: '-', essencial: '-', premium: '-' };
}

/** Normaliza examesTipos (mantido para compatibilidade com contratoCredenciada) */
export function normalizeExamesTipos(exames) {
  let examesTipos = [];
  if (!exames) return examesTipos;

  const bruto = exames.examesTipos;
  if (!bruto) return examesTipos;

  if (typeof bruto === 'string') {
    examesTipos = bruto.split(',').map(tipo => tipo.trim());
  } else if (Array.isArray(bruto)) {
    examesTipos = bruto;
  } else {
    console.warn('⚠️ examesTipos veio em tipo inesperado:', typeof bruto);
  }

  return examesTipos;
}

/** Monta a tabela HTML dos exames */
export function gerarTabelaExames(dados) {
  const linhas = [];
  const exames = dados.exames || {};
  const examesTipos = normalizeExamesTipos(exames);

  Object.keys(exames).forEach((key) => {
    if (key.startsWith('exame') && !key.includes('Valor') && !key.includes('Adc')) {
      const sufixo = key.replace('exame', '');
      const nome = exames[key];
      const valor = exames[`exame${sufixo}Valor`] || '0,00';
      if (nome && examesTipos.includes(nome)) {
        linhas.push(`<tr><td>${nome}</td><td>${valor}</td></tr>`);
      }
    }
  });

  Object.keys(exames).forEach((key) => {
    if (key.startsWith('exameAdc') && !key.includes('Valor')) {
      const sufixo = key.replace('exameAdc', '');
      const nome = (exames[key] ?? '').toString().trim();
      const valor = (exames[`exameAdc${sufixo}Valor`] ?? '').toString().trim();
      if (nome && valor) {
        linhas.push(`<tr><td>${nome}</td><td>${valor}</td></tr>`);
      }
    }
  });

  return linhas.join('\n');
}

/** Monta a tabela HTML das unidades */
export function gerarTabelaUnidades(dados) {
  const linhas = [];
  const unidades = dados.unidades || {};

  Object.keys(unidades).forEach((key) => {
    if (key.startsWith('unidade') && !key.includes('Horario')) {
      const sufixo = key.replace('unidade', '');

      const nome = (unidades[key] ?? '').toString().trim();
      const horario = (unidades[`unidade${sufixo}Horario`] ?? '').toString().trim();

      if (nome) {
        linhas.push(`
          <tr>
            <td>${nome}</td>
            <td>${horario || '-'}</td>
          </tr>
        `);
      }
    }
  });

  return linhas.join('\n');
}

export function preencherTemplate(html, variaveis) {
   const htmlComTabelas = html
    .replace('{{tabelaExames}}', gerarTabelaExames(variaveis))
    .replace('{{tabelaUnidades}}', gerarTabelaUnidades(variaveis));
  
  return htmlComTabelas.replace(/{{\s*\(?\s*([a-zA-Z0-9_]+)\s*\)?\s*}}/g, (_, chave) => {
    const k = (chave || '').trim();
    const valor = variaveis[k];
    if (valor === undefined || valor === null) {
      return `{{${k}}}`;
    }
    return String(valor);
  });
}