const SGG_TOKEN = "aWE2b2E3eFRUaWQ3dXg4S3RjV1E2Sm9QejNLRGlsMkg6";

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

      // Mantendo mesma lógica do Pipefy (ignorar inativos, se quiser manter consistência)
      if (razaoSocial && codigoSGG && situacao !== "Inativo") {
        fornecedores.push({
          razaoSocial,
          codigoSGG
        });
      }
    });

    temProximaPagina = data?.temProximaPagina;
    pagina++;
  }

  return fornecedores;
}