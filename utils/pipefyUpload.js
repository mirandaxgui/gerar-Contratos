// utils/pipefyUpload.js
import axios from "axios";
import { getPipefyToken } from "./pipefyToken.js";
const PIPEFY_API = "https://api.pipefy.com/graphql";
const ORGANIZATION_ID = "301641025";

/** Cria uma URL presigned no Pipefy para upload */
export async function criarPresignedUrl(nomeArquivo) {
  const PIPEFY_TOKEN = getPipefyToken();
  const mutation = `
    mutation {
      createPresignedUrl(input: {
        organizationId: "${ORGANIZATION_ID}",
        fileName: "${nomeArquivo}",
        contentType: "application/pdf"
      }) {
        url
        downloadUrl
      }
    }
  `;

  try {
    const response = await axios.post(
      PIPEFY_API,
      { query: mutation },
      {
        headers: {
          Authorization: `Bearer ${PIPEFY_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data.errors) {
      console.error("❌ Erro GraphQL:", response.data.errors);
      throw new Error(response.data.errors[0].message);
    }

    const data = response.data?.data?.createPresignedUrl;
    const presignedUrl = data.url;

    // 🧩 extrai o path interno (orgs/.../uploads/.../arquivo.pdf)
    const match = presignedUrl.match(/orgs\/.+\/uploads\/.+\/[^/?]+/);
    const filePath = match ? match[0] : null;

    if (!filePath) throw new Error("Não foi possível extrair o path do arquivo");

    console.log("🧩 Path interno extraído:", filePath);

    return {
      url: presignedUrl, // URL completa para upload (PUT)
      path: filePath     // path interno usado no campo do Pipefy
    };

  } catch (err) {
    console.error("❌ Falha ao criar presigned URL:", err.message);
    throw err;
  }
}


/** Faz upload do arquivo PDF para a URL presigned */
export async function enviarArquivoParaPipefy(url, pdfBuffer) {
  try {
    await axios.put(url, pdfBuffer, {
      headers: { "Content-Type": "application/pdf" },
    });
    console.log("✅ Upload concluído com sucesso!");
  } catch (err) {
    console.error("❌ Erro ao enviar arquivo para presigned URL:", err.message);
    throw err;
  }
}

/** Atualiza o campo do card no Pipefy com o path (downloadUrl) */
export async function atualizarCampoCardPipefy(cardId, fieldId, pathArquivo) {
  const PIPEFY_TOKEN = getPipefyToken();
  const mutation = `
    mutation {
      updateFieldsValues(input: {
        nodeId: "${cardId}",
        values: [
          {
            fieldId: "${fieldId}",
            value: "${pathArquivo}"
          }
        ]
      }) {
        success
        userErrors { message }
      }
    }
  `;

  console.log("🧩 Mutation enviada ao Pipefy:\n", mutation);

  try {
    const response = await axios.post(
      PIPEFY_API,
      { query: mutation },
      {
        headers: {
          Authorization: `Bearer ${PIPEFY_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("📡 Retorno updateFieldsValues:", response.data);

    if (response.data.errors) {
      console.error("❌ Erro GraphQL ao atualizar campo:", response.data.errors);
      return false;
    }

    const sucesso = response.data?.data?.updateFieldsValues?.success ?? false;
    const errosUsuario =
      response.data?.data?.updateFieldsValues?.userErrors ?? [];

    if (!sucesso && errosUsuario.length) {
      console.error("⚠️ Erros reportados:", errosUsuario);
    }

    return sucesso;
  } catch (err) {
    console.error("❌ Falha ao atualizar campo no Pipefy:", err.message);
    return false;
  }
}

/** Cria um card de erro no Pipefy em caso de falha na integração */
export async function handleErrorPipefy(quem_solicita, mais_detalhes) {
  try {
    const PIPEFY_TOKEN = getPipefyToken();
    if (!PIPEFY_TOKEN) {
      console.warn("⚠️ PIPEFY_TOKEN ausente. Não foi possível criar card de erro no Pipefy.");
      return;
    }

    const detalhesStr = typeof mais_detalhes === "object"
      ? JSON.stringify(mais_detalhes)
      : String(mais_detalhes || "");

    const quemSanitizado = (quem_solicita || "").replace(/["\\]/g, '\\"').replace(/\n/g, ' ');
    const detalhesSanitizados = detalhesStr.replace(/["\\]/g, '\\"').replace(/\n/g, ' ');

    const mutation = `
      mutation {
        createCard(input: {
          pipe_id: "305879331",
          fields_attributes: [
            {
              field_id: "quem_est_solicitando",
              field_value: "${quemSanitizado}"
            },
            {
              field_id: "mais_detalhes",
              field_value: "${detalhesSanitizados}"
            },
            {
              field_id: "o_que",
              field_value: "ERRO"
            },
            {
              field_id: "tipo_de_solicita_o",
              field_value: "Desenvolvimento"
            }
          ]
        }) {
          card {
            id
          }
        }
      }
    `;

    console.log(`🚨 Criando Card Erro no Pipefy para: ${quem_solicita}`);
    const response = await axios.post(
      PIPEFY_API,
      { query: mutation },
      {
        headers: {
          Authorization: `Bearer ${PIPEFY_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("📥 Retorno do Card Erro no Pipefy:", JSON.stringify(response.data));
  } catch (err) {
    console.error("❌ Erro ao criar card de erro no Pipefy:", err.message);
  }
}



