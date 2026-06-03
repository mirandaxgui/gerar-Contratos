import express from "express";
import pdfDocument from "pdf-lib";
const SGG_BASE_URL = "https://app.sgg.net.br/api/v3";
const SGG_TOKEN = process.env.USER_SGG;
const PIPEFY_TOKEN = process.env.PIPEFY_TOKEN;

const router = express.Router();
const { PDFDocument } = pdfDocument;
// ⬇️ Funções auxiliares (convertidas do seu código original)
async function updateCardPipefy(cardId, value) {
  const mutation = {
    query: `
                mutation {
                    updateFieldsValues(input: {
                    nodeId: "${cardId}",
                    values: [
                        { fieldId: "motivo_do_erro", value: "${value}" },
                    ]
                    }) {
                    success
                    userErrors { message }
                    }
                }
                `
  };

  console.log(mutation);
  const resposta = await fetch("https://api.pipefy.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PIPEFY_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(mutation)
  });
  const resultado = await resposta.json();
  console.log("Resultado da atualização do Pipefy:", resultado);
}

function toBase64(uint8Array) {
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}
async function fetchSolicitacao(id_solicitacao) {
  const res = await fetch(`${SGG_BASE_URL}/solicitacoes-exames/?codigo=${id_solicitacao}`, {
    headers: {
      Authorization: `Basic ${SGG_TOKEN}`
    }
  });
  const json = await res.json();
  if (!json.resultado || !json.resultado[0]) return new Error("Solicitação não encontrada.");
  return json.resultado[0];
}
async function attSolicitacao(solicitacao, status) {
  // Corrige o tipo_exame caso seja "Retorno ao Trabalho"
  let tipoExameCorrigido = String(solicitacao.tipo_exame || '').trim();
  if (tipoExameCorrigido === 'Retorno ao Trabalho') {
    tipoExameCorrigido = 'Retorno ao trabalho';
  }

  const payload = {
    ...solicitacao,
    situacao: status,
    tipo_exame: tipoExameCorrigido,
    id_solicitacao_de_exame: solicitacao.id_solicitacao,
    exame: String(solicitacao.exames || "").replace(/EXAME CLÍNICO/g, "Clínico").trim(),
    fornecedor: String(solicitacao.fornecedor || '').trim(),
    unidade_atend: String(solicitacao.unidade_atend || '').trim()
  };
  const solicitacaoRes = await fetch(`${SGG_BASE_URL}/solicitacoes-exames/`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${SGG_TOKEN}`
    },
    body: JSON.stringify(payload)
  });
  const solicitacaoReq = await solicitacaoRes.text();
  // Extrai o campo returnInfo com regex (mesmo vindo quebrado)
  const match = solicitacaoReq.match(/"returnInfo"\s*:\s*"({.*?})"/);

  if (match && match[1]) {
    // Agora temos a string interna como JSON (ainda precisa de parse)
    const returnInfoJson = match[1];
    const returnInfo = JSON.parse(returnInfoJson); // agora sim é válido

    if (returnInfo.erro) {
      return new Error(`Erro ao atualizar solicitação: [${returnInfo.erro}] ${returnInfo.msg}`);
    } else {
      console.log(`✅ Solicitação atualizada: ${solicitacaoReq}`);
      return solicitacaoReq;
    }
  } else {
    // Se não tiver returnInfo, tenta parsear como JSON normal
    console.log(`✅ Solicitação atualizada: ${solicitacaoReq}`);
    return solicitacaoReq;
  }
}
async function cadastrarExame(solicitacao, exameNome) {
  const nome = exameNome.toLowerCase().includes("clínico") ? "Clínico" : exameNome;
  // Corrige o tipo_exame caso seja "Retorno ao Trabalho"
  let tipoExameCorrigido = String(solicitacao.tipo_exame || '').trim();
  if (tipoExameCorrigido === 'Retorno ao Trabalho') {
    tipoExameCorrigido = 'Retorno ao trabalho';
  }

  let payload = {
    data_exames_lancados: solicitacao.data_solicitacao_de_exame,
    exame: nome,
    id_empresa: solicitacao.id_empresa,
    medico: solicitacao.medico === '54369-SP'
      ? '93975-SP'
      : (solicitacao.medico || '93975-SP'),
    id_funcionario: solicitacao.id_funcionario,
    tipo_exame: tipoExameCorrigido,
    fornecedor: solicitacao.fornecedor,
    resultado: "Normal",
    servico_realizado: "Sim",
    id_solicitacao: solicitacao.id_solicitacao
  };
  if (exameNome === "EXAME CLÍNICO") {
    payload.data_atestado = solicitacao.data_solicitacao_de_exame;
    payload.resultado_atestado = "Apto";
  }
  if (exameNome === "AV. PSICOSSOCIAL" || exameNome === 'AVALIAÇÃO PSICOSSOCIAL') {
    payload.fornecedor = '455';
  }
  console.log("BODY DO CADASTRAMENTO DO EXAME:", payload);
  const res = await fetch(`${SGG_BASE_URL}/exames-realizados/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${SGG_TOKEN}`
    },
    body: JSON.stringify(payload)
  });
  let text = await res.text();
  console.log("aq", text);
  try {
    if (text.includes('"returnInfo":"{')) {
      text = text.replace(/"returnInfo":"\{([^}]+)\}"/g, '"returnInfo":{$1}');
    }
    const json = JSON.parse(text);
    let id_exame = null;
    if (json.returnInfo?.msg?.includes("já cadastrados")) {
      id_exame = await buscarIdExameExistente(solicitacao, nome);
      console.log(`✅ Exame cadastrado (id_exame = ${id_exame})`);

      return id_exame;
    } else {
      id_exame = json.returnInfo?.id || null;
    }
    if (!id_exame) {
      throw new Error("❌ Não foi possível extrair id_exame do retorno.");
    }
    console.log(`✅ Exame cadastrado (id_exame = ${json.returnInfo?.id})`);

    return json.returnInfo?.id || "";
  } catch (e) {
    console.error("⚠️ Erro ao interpretar JSON do exame:", e);
    throw new Error("Erro ao cadastrar exame.");
  }
}
async function buscarIdExameExistente(solicitacao, nome) {
  if (nome == 'EXAME CLÍNICO') {
    nome = 'Clínico';
  }
  const url = `${SGG_BASE_URL}/exames-realizados/?dataExame_aPartirDe=${solicitacao.data_solicitacao_de_exame}&dataExame_ate=${solicitacao.data_solicitacao_de_exame}&funcionario=${solicitacao.id_funcionario}&exame=${nome}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${SGG_TOKEN}`
    }
  });
  const json = await res.json();
  const exameEncontrado = json.resultado[0].id_exames_lancados
  if (exameEncontrado) {
    return exameEncontrado;
  } else {
    console.error("⚠️ Nenhum exame correspondente encontrado.");
    return null;
  }
}
async function cadastrarAso(solicitacao, id_exame) {
  const payload = {
    id_empresa: solicitacao.id_empresa,
    id_funcionario: solicitacao.id_funcionario,
    data_emissao_aso: solicitacao.data_solicitacao_de_exame,
    medico: solicitacao.medico === '54369-SP'
      ? '93975-SP'
      : (solicitacao.medico || '93975-SP'),
    medico_coordenador: solicitacao.medico_coord,
    codigos_exames_realizados: id_exame
  };
  console.log(payload, "bb");
  const asoRes = await fetch(`${SGG_BASE_URL}/aso/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${SGG_TOKEN}`
    },
    body: JSON.stringify(payload)
  });
  let asoResText = await asoRes.text();
  try {
    // Extrai o campo returnInfo com regex (mesmo vindo quebrado)
    const match = asoResText.match(/"returnInfo"\s*:\s*"({.*?})"/);

    if (match && match[1]) {
      // Agora temos a string interna como JSON (ainda precisa de parse)
      const returnInfoJson = match[1];
      const returnInfo = JSON.parse(returnInfoJson); // agora sim é válido

      if (returnInfo.erro) {
        return new Error(`Erro ao cadastrar ASO documento: [${returnInfo.erro}] ${returnInfo.msg}`);
      } else {
        console.log(`ASO cadastrado com sucesso: ${asoResText}`);
      }
    } else {
      // Se não tiver returnInfo, tenta parsear como JSON normal
      const parsed = JSON.parse(asoResText);
      console.log(`ASO cadastrado com sucesso: ${JSON.stringify(parsed)}`);
    }

  } catch (err) {
    console.error("❌ Erro ao processar resposta da API:", err.message);
    console.error("Resposta bruta:", asoResText);
  }
}
async function enviarDocumento(url, id_empresa, id_funcionario, id_exame) {
  const res = await fetch(url);
  let buffer = new Uint8Array(await res.arrayBuffer());
  const pdfDoc = await PDFDocument.load(buffer);
  const compressed = await pdfDoc.save({
    useObjectStreams: true,
    objectsPerTick: 50,
    addDefaultPage: false
  });
  const base64 = toBase64(compressed);
  const payload = {
    id_empresa,
    id_funcionario,
    id_exame,
    tipo: "Público",
    descricao: "ASO",
    arquivo: base64
  };
  const documentoRes = await fetch(`${SGG_BASE_URL}/exames-realizados-documento/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${SGG_TOKEN}`
    },
    body: JSON.stringify(payload)
  });
  let documentoJson = await documentoRes.text();
  try {
    // Extrai o campo returnInfo com regex (mesmo vindo quebrado)
    const match = documentoJson.match(/"returnInfo"\s*:\s*"({.*?})"/);

    if (match && match[1]) {
      // Agora temos a string interna como JSON (ainda precisa de parse)
      const returnInfoJson = match[1];
      const returnInfo = JSON.parse(returnInfoJson); // agora sim é válido

      if (returnInfo.erro) {
        return new Error(`Erro ao anexar documento: [${returnInfo.erro}] ${returnInfo.msg}`);
      } else {
        console.log(`📎 Documento anexado com sucesso: ${documentoJson}`);
      }
    } else {
      // Se não tiver returnInfo, tenta parsear como JSON normal
      const parsed = JSON.parse(documentoJson);
      console.log(`📎 Documento anexado com sucesso: ${JSON.stringify(parsed)}`);
    }

  } catch (err) {
    console.error("❌ Erro ao processar resposta da API:", err.message);
    console.error("Resposta bruta:", documentoJson);
  }
}
async function fetchPsico(data_solicitacao, id_funcionario) {
  console.log(`🔎 Buscando Av. Psicossocial para o funcionario ${id_funcionario}...`);
  const solicitacaoRes = await fetch(
    `${SGG_BASE_URL}/solicitacoes-exames/?dataSolicitacao_aPartirDe=${data_solicitacao}&dataSolicitacao_ate=${data_solicitacao}&funcionario=${id_funcionario}&fornecedor=455`,
    { headers: { Authorization: `${SGG_TOKEN}` } }
  );
  const solicitacaoJson = await solicitacaoRes.json();
  if (solicitacaoJson.statusCode === 'D001' && solicitacaoJson.statusMsg === 'Nenhum problema ocorrido. Porém o retorno é em branco.') {
    // Caso não haja dados de avaliação psicossocial
    console.log('✅ Nenhuma avaliação psicossocial encontrada.');
    return null;
  }
  const solicitacao = solicitacaoJson.resultado[0];
  console.log(solicitacao, "psico");
  if (!solicitacao) {
    return null;
  };
  return solicitacao;
}

router.post('/subirAso', async (req, res) => {
  try {
    let idExameClinico = null;
    let idExames = null;
    const { id_solicitacao, link_arquivo, cardId } = req.body;
    if (!id_solicitacao || !link_arquivo) {
      return res.status(400).json({
        error: "Parâmetros id_solicitacao e link_arquivo são obrigatórios."
      });
    }
    console.log(req);
    const solicitacao = await fetchSolicitacao(id_solicitacao);
    console.log("solicitacao", solicitacao, solicitacao.type)
    if (solicitacao instanceof Error) {
      await updateCardPipefy(cardId, solicitacao.message);
      throw solicitacao; // Lança o erro para ser capturado no catch externo
    }
    /*if (solicitacao.situacao === "Cancelado") {
      return new Response(JSON.stringify({
        error: "Solicitação cancelada."
      }), {
        status: 400
      });
    }*/
    if (solicitacao.tipo_exame === "Demissional") {
      const payload = {
        id_empresa: solicitacao.id_empresa,
        id_funcionario: solicitacao.id_funcionario,
        data_demissao: new Date().toISOString().slice(0, 10),
        motivo: 1
      }
      const res = await fetch(`${SGG_BASE_URL}/demissao/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${SGG_TOKEN}`
        },
        body: JSON.stringify(payload)
      });
      let text = await res.text();
      console.log(text);
    }
    const exames = solicitacao.exames.split(",").map((e) => e.trim());
    for (const exame of exames) {
      try {
        const id_exame = await cadastrarExame(solicitacao, exame);
        if (id_exame instanceof Error) {
          await updateCardPipefy(cardId, id_exame.message);
          throw id_exame; // Lança o erro para ser capturado no catch externo
        }
        if (idExames) {
          idExames += ", " + id_exame;
        } else {
          idExames = id_exame; // Para o primeiro id_exame, só atribui diretamente
        }
        if (exame === 'EXAME CLÍNICO') {
          idExameClinico = id_exame;
        }
      } catch (error) {
        await updateCardPipefy(cardId, error.message);
        throw error;
      }
      const asoCadastrar = await cadastrarAso(solicitacao, idExames);
      if (asoCadastrar instanceof Error) {
        await updateCardPipefy(cardId, asoCadastrar.message);
        throw asoCadastrar; // Lança o erro para ser capturado no catch externo
      }
      const enviarDoc = await enviarDocumento(link_arquivo, solicitacao.id_empresa, solicitacao.id_funcionario, idExameClinico);
      if (enviarDoc instanceof Error) {
        await updateCardPipefy(cardId, enviarDoc.message);
        throw enviarDoc; // Lança o erro para ser capturado no catch externo
      }

      const attSolicitacaoResult = await attSolicitacao(solicitacao, "Finalizada");
      if (attSolicitacaoResult instanceof Error) {
        await updateCardPipefy(cardId, attSolicitacaoResult.message);
        throw attSolicitacaoResult; // Lança o erro para ser capturado no catch externo
      }
      /*
          const psicossocial = await fetchPsico(solicitacao.data_solicitacao_de_exame, solicitacao.id_funcionario);
          if (psicossocial === null) {
            console.log("Sem Av. Psico");
            console.log("🎉 Processo finalizado com sucesso!");
            return res.status(200).json({
              message: "🎉 Processo finalizado com sucesso!",
              idExameClinico
            });
          }
          if (psicossocial.situacao === 'Cancelado') {
            //attSolicitacao(solicitacao, 'Pendente');
            console.error("PSICO CANCELADA");
          } else {
            const idPsico = await cadastrarExame(psicossocial, 'AVALIAÇÃO PSICOSSOCIAL');
            if (idPsico) {
              await attSolicitacao(psicossocial, 'Finalizada');
            } else {
              console.log("Sem Av. Psico");
            }
          }
      */

      return res.status(200).json({
        message: "ASO cadastrado com sucesso",
        idExameClinico
      });
    } catch (error) {
      console.error("❌ Erro:", error);
      return res.status(500).json({
        error: error.message
      });
    }
  });


export default router;