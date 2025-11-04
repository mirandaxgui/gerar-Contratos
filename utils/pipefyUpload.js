// utils/pipefyUpload.js
import axios from "axios";

const PIPEFY_API = "https://api.pipefy.com/graphql";
const PIPEFY_TOKEN = process.env.PIPEFY_TOKEN;
const ORGANIZATION_ID = "301641025";

/** Cria uma URL presigned no Pipefy para upload */
export async function criarPresignedUrl(nomeArquivo) {
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