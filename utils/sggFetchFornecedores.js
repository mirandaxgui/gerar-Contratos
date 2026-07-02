const SGG_TOKEN = process.env.USER_SGG;
const SGG_TOKEN_BACKUP = process.env.USER_INTEGRACOES_SGG;

// Função auxiliar para buscar com retry somente em caso de erro 429
async function fetchComRetry429(url) {
  const fazerRequisicao = async (token) => {
    return await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${token}`
      }
    });
  };

  let response = await fazerRequisicao(SGG_TOKEN);

  // Se retornar 429, tenta novamente usando o token USER_INTEGRACOES_SGG
  if (response.status === 429) {
    console.warn("Retorno 429 com USER_SGG. Tentando novamente com USER_INTEGRACOES_SGG...");

    response = await fazerRequisicao(SGG_TOKEN_BACKUP);
  }

  if (!response.ok) {
    throw new Error(`Erro na requisição: ${response.status} - ${response.statusText}`);
  }

  return await response.json();
}

// Função para buscar fornecedores no SGG
export async function fetchFornecedores() {
  let fornecedores = [];
  let pagina = 0;
  let temProximaPagina = true;

  while (temProximaPagina) {
    const url = `https://app.sgg.net.br/api/v3/fornecedores/?paginador[pagina]=${pagina}&paginador[limite]=100`;

    const data = await fetchComRetry429(url);
    const registros = data?.resultado || [];

    registros.forEach((fornecedor) => {
      const razaoSocial = fornecedor.nome;
      const codigoSGG = fornecedor.id_fornecedor;
      const situacao = fornecedor.situacao;
      const tipo = fornecedor.tipo;
      const estado = fornecedor.estado;
      const cidade = fornecedor.cidade;

      if (razaoSocial && codigoSGG && situacao !== "Inativo" && tipo === "Clinica") {
        fornecedores.push({
          razaoSocial,
          codigoSGG,
          estado,
          cidade
        });
      }
    });

    temProximaPagina = data?.temProximaPagina;
    pagina++;
  }

  return fornecedores;
}