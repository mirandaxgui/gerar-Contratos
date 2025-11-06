import axios from 'axios';

const PIPEFY_TOKEN = process.env.PIPEFY_TOKEN;

// Função para buscar fornecedores no Pipefy
export async function fetchFornecedores() {
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
      `,
    };

    try {
      // Fazendo a requisição para o Pipefy
      const response = await axios.post('https://api.pipefy.com/graphql', query, {
        headers: {
          Authorization: PIPEFY_TOKEN,
          'Content-Type': 'application/json',
        },
      });

      const data = response.data;
      const records = data?.data?.table_records?.edges || [];

      // Extraindo os dados dos fornecedores
      records.forEach(({ node }) => {
        const done = node.done;
        const razaoSocial = node.record_fields.find((f) => f.name === 'Razão Social')?.value;
        const codigoSGG = node.record_fields.find((f) => f.name === 'Código SGG')?.value;

        if (razaoSocial && codigoSGG && !done) {
          fornecedores.push({ razaoSocial, codigoSGG });
        }
      });

      // Atualiza o endCursor para continuar a busca, caso haja mais registros
      endCursor = data?.data?.table_records?.pageInfo?.endCursor;
    } catch (error) {
      console.error('Erro ao buscar fornecedores no Pipefy:', error);
    }
  } while (endCursor); // Continua buscando enquanto houver mais páginas

  return fornecedores;
};