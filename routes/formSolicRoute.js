import express from 'express';
import axios from 'axios';

// Criar o roteador
const router = express.Router();

// Variáveis de token, usei variáveis de ambiente como exemplo
const PIPEFY_TOKEN = "Bearer eyJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJQaXBlZnkiLCJpYXQiOjE3NDI0ODI1MjEsImp0aSI6ImUxZjU0Y2ZkLTEzYzItNDQ2Yy05OGU0LWU0NDljY2MxY2IzYSIsInN1YiI6MzA2MDUxNzg3LCJ1c2VyIjp7ImlkIjozMDYwNTE3ODcsImVtYWlsIjoiZ3VpbGhlcm1lLm1pcmFuZGFAZGVtYWlzYXVkZS5jb20ifX0.LVlemZuqRl98fHsWxCpIBU5M0VeM2rM3hE24d9tIR9jX0O4nvQeX5zqRHywYBtlumTqK42bN-E6HDIQ0YLpmkg";
const SGG_TOKEN = 'aWE2b2E3eFRUaWQ3dXg4S3RjV1E2Sm9QejNLRGlsMkg6';

// Função para buscar fornecedores no Pipefy
const fetchFornecedores = async () => {
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
      const response = await axios.post('https://api.pipefy.com/graphql', query, {
        headers: {
          Authorization: `Bearer ${PIPEFY_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      const data = response.data;
      const records = data?.data?.table_records?.edges || [];

      records.forEach(({ node }) => {
        const done = node.done;
        const razaoSocial = node.record_fields.find((f) => f.name === 'Razão Social')?.value;
        const codigoSGG = node.record_fields.find((f) => f.name === 'Código SGG')?.value;

        if (razaoSocial && codigoSGG && !done) {
          fornecedores.push({ razaoSocial, codigoSGG });
        }
      });

      endCursor = data?.data?.table_records?.pageInfo?.endCursor;
    } catch (error) {
      console.error('Erro ao buscar fornecedores no Pipefy:', error);
    }
  } while (endCursor); // Continua buscando enquanto houver mais páginas

  return fornecedores;
};

// Rota para buscar fornecedores
router.post('/fornecedores', async (req, res) => {
  try {
    const fornecedores = await fetchFornecedores();
    res.status(200).json(fornecedores);
  } catch (error) {
    console.error('Erro ao processar fornecedores:', error);
    res.status(500).json({ error: 'Erro ao processar fornecedores' });
  }
});

// Rota para buscar empresas com base no CNPJ
router.get('/empresa', async (req, res) => {
  const { cnpj_cpf } = req.query; // Pegando o cnpj_cpf dos parâmetros da URL

  try {
    const response = await axios.get(`https://app.sgg.net.br/api/v3/empresa/?cnpj_cpf=${cnpj_cpf}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${SGG_TOKEN}`,
      },
    });
    const idEmpresa = response.data.resultado?.[0]?.id_empresa;
    console.log(idEmpresa);
    res.status(200).json(response.data.resultado || []);
    console.log(response.data);
  } catch (error) {
    console.error('Erro ao buscar empresa no SGG:', error);
    res.status(500).json({ error: 'Erro ao buscar empresa' });
  }
});

// Rota para buscar setores de uma empresa no SGG
router.get('/setor/', async (req, res) => {
  const { id_empresa } = req.query;  // Agora recebendo o id_empresa como query parameter

  try {
    console.log('ID da empresa recebido:', id_empresa);
    // Buscar setores da empresa com o ID da empresa
    const setoresResponse = await axios.get(`https://app.sgg.net.br/api/v3/setor/?id_empresa=${id_empresa}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${SGG_TOKEN}`,
      },
    });

    console.log('Setores recebidos:', setoresResponse.data);

    res.status(200).json(setoresResponse.data.resultado || []);  // Retornando a resposta da API
  } catch (error) {
    console.error('Erro ao buscar setores no SGG:', error);
    res.status(500).json({ error: 'Erro ao buscar setores' });
  }
});

// Rota para buscar cargos de um setor no SGG
router.get('/cargo/', async (req, res) => {
  const { id_setor } = req.query;  // Agora recebendo o id_setor como query parameter

  try {
    // Buscar cargos usando o ID do setor
    const cargosResponse = await axios.get(`https://app.sgg.net.br/api/v3/cargo/?id_setor=${id_setor}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${SGG_TOKEN}`,
      },
    });
    console.log("Cargos recebidos:", cargosResponse.data);
    res.status(200).json(cargosResponse.data.resultado || []);  // Retornando a resposta da API
  } catch (error) {
    console.error('Erro ao buscar cargos no SGG:', error);
    res.status(500).json({ error: 'Erro ao buscar cargos' });
  }
});

router.post('/submit-form/', (req, res) => {
  const formData = req.body;
  try {
    console.log('Dados do formulário recebidos:', formData);

    const n9nResponse = axios.post('https://n8n.srv964086.hstgr.cloud/webhook/a191de90-3590-479b-b530-a6e30d9c04d5', formData, {
      headers: {
        'Content-Type': 'application/json',
      },
    }); 
    console.log('Resposta do n8n:', n9nResponse.data);

    res.status(200).json({ message: 'Formulário enviado com sucesso' });
  } catch (error) {
    console.error('Erro ao processar o formulário:', error);
    res.status(500).json({ error: 'Erro ao processar o formulário' });
  }
});


export default router;
