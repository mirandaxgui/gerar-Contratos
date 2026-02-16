// routes/enviarKitsRoute.js
import express from 'express';
import axios from 'axios';

const router = express.Router();

// 🔐 Token da API SGG (configure no .env)
const SGG_TOKEN = process.env.USER_SGG;

// 🕒 Delay utilitário
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 🔁 Processa solicitações e reenvia kits
 */
async function processarSolicitacoes() {
    console.log('🚀 Início da função /enviar-kits');

    const now = new Date();
    const hour = now.getHours();

    // Define data de filtro (7h = hoje / 19h = amanhã)
    const targetDate = new Date();
    if (hour >= 19) targetDate.setDate(now.getDate() + 1);

    const dataFormatada = targetDate.toISOString().split('T')[0]; 
    console.log(`📅 Data alvo: ${dataFormatada}`);

    const pageSize = 50;
    let pagina = 0;
    let temProximaPagina = true;
    let totalSolicitacoes = 0;
    const erros = [];

    while (temProximaPagina) {
        const url = `https://app.sgg.net.br/api/v3/solicitacoes-exames/?paginador[pagina]=${pagina}&paginador[tamanho]=${pageSize}&dataSolicitacao_aPartirDe=${dataFormatada}&dataSolicitacao_ate=${dataFormatada}`;
        console.log(`📡 Buscando página ${pagina}...`);

        try {
            const response = await axios.get(url, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Basic ${SGG_TOKEN}`
                },
                timeout: 30000
            });

            const resultado = response.data;
            temProximaPagina = Boolean(resultado.temProximaPagina);
            const solicitacoes = resultado.resultado ?? [];

            if (solicitacoes.length === 0) {
                console.log('⚠️ Nenhuma solicitação encontrada.');
                break;
            }

            for (const s of solicitacoes) {
                try {
                    let tipoExameCorrigido = String(s.tipo_exame || '').trim();
                    if (tipoExameCorrigido === 'Retorno ao Trabalho') {
                        tipoExameCorrigido = 'Retorno ao trabalho';
                    }

                    const bodyPut = {
                        id_solicitacao_de_exame: String(s.id_solicitacao),
                        id_empresa: String(s.id_empresa),
                        id_funcionario: String(s.id_funcionario),
                        data_solicitacao_de_exame: String(s.data_solicitacao_de_exame),
                        tipo_exame: tipoExameCorrigido,
                        exame: String(s.exames || '').replace(/EXAME CLÍNICO/gi, 'Clínico').trim(),
                        medico: String(s.medico || '').trim(),
                        medico_coord: String(s.medico_coord || '').trim(),
                        fornecedor: String(s.fornecedor || '').trim(),
                        modelo_qmp: String(s.modelo_qmp || '').trim(),
                        local: String(s.local || '').trim(),
                        unidade_atend: String(s.unidade_atendimento || '').trim(),
                        opcoes_envio_email: [{ KIT: 'S' }],
                        destinatarios_envio_email: [
                            { empresa: 'N' },
                            { funcionario: 'N' },
                            { fornecedor: 'S' },
                            { outro: 'N' }
                        ]
                    };

                    const putResp = await axios.put(
                        'https://app.sgg.net.br/api/v3/solicitacoes-exames/',
                        bodyPut,
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Basic ${SGG_TOKEN}`
                            },
                            timeout: 30000
                        }
                    );
                    let result = await putResp.data;
                    const match = result.match(/"returnInfo"\s*:\s*"({.*?})"/);

                    const returnInfoJson = match[1];
                    const returnInfo = JSON.parse(returnInfoJson);

                    if (returnInfo.type === 'SUCESSO') {
                        console.log(`✅ PUT feito com sucesso para ID ${s.id_solicitacao}`);
                        totalSolicitacoes++;
                    } else {
                        console.warn(`⚠️ PUT retornou status inesperado para ID ${s.id_solicitacao}`);
                        erros.push({
                            id: String(s.id_solicitacao),
                            erro: 'Status inesperado',
                            returnInfo: returnInfo
                        });

                    }
                } catch (erroInterno) {
                    console.error(`❌ Erro ao processar ID ${s.id_solicitacao}:`, erroInterno.message);
                    erros.push({
                        id: String(s.id_solicitacao),
                        erro: erroInterno.message,
                        result: {}
                    });

                }

                await sleep(3000); // intervalo entre PUTs
            }

            pagina++;
            await sleep(2000); // intervalo entre páginas

        } catch (e) {
            console.error(`❌ Erro ao buscar página ${pagina}:`, e.message);
            erros.push({ pagina, erro: e.message });
            temProximaPagina = false;
        }
    }

    console.log(`✅ Total de solicitações processadas: ${totalSolicitacoes}`);
    if (erros.length > 0) console.warn(`⚠️ ${erros.length} erros encontrados.`, erros);

    return new Response(
        JSON.stringify({
            sucesso: true,
            data_processada: dataFormatada,
            total: totalSolicitacoes,
            erros
        }),
        {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        }
    );
}


router.post('/enviar-kits', async (req, res) => {
    console.log('📬 Rota /enviar-kits recebida');

    try {
        const response = await processarSolicitacoes();
        const data = await response.json();
        res.status(response.status).json(data);

    } catch (err) {
        console.error('❌ Erro no processamento:', err);
        res.status(500).json({ sucesso: false, erro: err.message });
    }
});

export default router;
