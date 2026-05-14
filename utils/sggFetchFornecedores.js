const SGG_TOKEN = process.env.USER_SGG;

// Função para buscar fornecedores no SGG
export async function fetchFornecedores() {
  let fornecedores = [];
  let pagina = 0;
  let temProximaPagina = true;

  while (temProximaPagina) {
    const url = `https://app.sgg.net.br/api/v3/fornecedores/?paginador[pagina]=${pagina}&paginador[limite]=100`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${SGG_TOKEN}`
      }
    });

    const data = await response.json();
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