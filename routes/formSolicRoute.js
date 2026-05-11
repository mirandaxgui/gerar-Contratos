import express from 'express';
import axios from 'axios';
import { fetchFornecedores } from '../utils/sggFetchFornecedores.js';

// Criar o roteador
const router = express.Router();

// Variáveis de token, usei variáveis de ambiente como exemplo
const SGG_TOKEN = process.env.USER_SGG;


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
    const response = await axios.get(`https://app.sgg.net.br/api/v3/empresa/?situacao=ativa&cnpj_cpf=${cnpj_cpf}`, {
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

// Rota para buscar agenda de um fornecedor no SGG
router.get('/agenda/', async (req, res) => {
  const { id_fornecedor } = req.query;

  if (!id_fornecedor) {
    return res.status(400).json({ error: 'id_fornecedor é obrigatório' });
  }

  try {
    const response = await fetch(
      `https://app.sgg.net.br/api/v3/agenda/?id_fornecedor=${id_fornecedor}`,
      {
        method: "GET",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${SGG_TOKEN}`,
        },
      }
    );

    const data = await response.json();

    const agendas = (data?.resultado || []).filter(
      (agenda) => agenda.situacao !== "Inativa"
    );

    res.status(200).json(agendas);

  } catch (error) {
    console.error('Erro ao buscar agenda no SGG:', error);
    res.status(500).json({ error: 'Erro ao buscar agenda' });
  }
});

// Rota para buscar horários disponíveis no SGG
router.post('/agendamento/', async (req, res) => {
  const {
    agenda,
    data_inicio,
    data_fim
  } = req.body;

  if (!agenda || !data_inicio || !data_fim) {
    return res.status(400).json({
      error: 'agenda, data_inicio e data_fim são obrigatórios'
    });
  }

  try {
    const response = await fetch(
      `https://app.sgg.net.br/api/v3/agendamento/?agenda=${agenda}&retornar_horarios_livres=true&data_hora_agendamento_aPartirDe=${data_inicio} 00:00:00&data_hora_agendamento_ate=${data_fim} 23:59:59`,
      {
        method: "GET",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${SGG_TOKEN}`,
        }
      }
    );

    const data = await response.json();
    // Filtra as linhas onde "observacoes" é "Horário Livre"
    const horariosLivres = data.resultado.filter(item => item.observacoes === "Horário Livre");

    console.log("Horários livres:", horariosLivres);

    res.status(200).json(data?.resultado || []);

  } catch (error) {
    console.error('Erro ao buscar horários no SGG:', error);
    res.status(500).json({ error: 'Erro ao buscar horários' });
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
