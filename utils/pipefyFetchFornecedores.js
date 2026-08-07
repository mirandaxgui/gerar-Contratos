import { getPipefyToken } from "../utils/pipefyUpload.js";

const PIPEFY_TOKEN = await getPipefyToken();

// Função para buscar fornecedores no Pipefy
export async function pipefyFetchFornecedores() {
  let fornecedores = [];
  let endCursor = null;

  do {
    const query = {
      query: `
        query {
          table_records(table_id: "306299748", first: 50${endCursor ? `, after: "${endCursor}"` : ''}) {
            pageInfo {
              hasNextPage
              endCursor
            }
            edges {
              node {
                done
                id
                title
                record_fields {
                  name
                  value
                }
              }
            }
          }
        }
      `
    };

    const response = await fetch("https://api.pipefy.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PIPEFY_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(query)
    });

    const data = await response.json();
    const records = data?.data?.table_records?.edges || [];

    records.forEach(({ node }) => {
      const done = node.done;
      const razaoSocial = node.record_fields.find(f => f.name === "Razão Social")?.value;
      const codigoSGG = node.record_fields.find(f => f.name === "Código SGG")?.value;

      if (razaoSocial && codigoSGG && !done) {
        fornecedores.push({ razaoSocial, codigoSGG });
      }
    });

    endCursor = data?.data?.table_records?.pageInfo?.endCursor;
  } while (endCursor); // Continua buscando enquanto houver mais páginas

  return fornecedores;
};