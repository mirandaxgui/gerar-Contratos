const ACCESS_TOKEN = process.env.CLICKSIGN_ACCESS_TOKEN;;
const BASE_URL = 'https://app.clicksign.com/api/v3';

export async function criarEnvelope(nomeEmpresa, deadline_at) {
    try {
        const payload = {
            data: {
                type: 'envelopes',
                attributes: {
                    name: `Contrato ${nomeEmpresa}`,
                    locale: 'pt-BR',
                    auto_close: true,
                    remind_interval: 3,
                    block_after_refusal: true,
                    deadline_at
                }
            }
        };

        const response = await fetch(`${BASE_URL}/envelopes`, {
            method: 'POST',
            headers: {
                Authorization: ACCESS_TOKEN,
                'Content-Type': 'application/vnd.api+json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!data.data || !data.data.id) {
            console.error("❌ Erro ao criar envelope:", data);
            throw new Error("Falha ao criar envelope. Verifique o token ou payload.");
        }

        return data.data.id;

    } catch (error) {
        console.error("❌ Erro interno em criarEnvelope:", error);
        throw error;
    }
}

export async function enviarDocumentoPDF(envelopeId, base64PDF, nomeEmpresa) {
    try {
        const payload = {
            data: {
                type: 'documents',
                attributes: {
                    filename: `CONTRATO_${nomeEmpresa.replace(/[\/\\:*?"<>|]/g, '-')}.pdf`,
                    content_base64: base64PDF
                }
            }
        };

        const response = await fetch(`${BASE_URL}/envelopes/${envelopeId}/documents`, {
            method: 'POST',
            headers: {
                Authorization: ACCESS_TOKEN,
                'Content-Type': 'application/vnd.api+json',
                'Accept': '*/*'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!data.data || !data.data.id) {
            console.error("❌ Erro ao enviar documento:", data);
            throw new Error("Falha ao enviar documento para o Clicksign.");
        }

        return data.data.id;

    } catch (error) {
        console.error("❌ Erro interno em enviarDocumentoPDF:", error);
        throw error;
    }
}

export async function criarSignatarios(envelopeId, vendedorSigner, clienteSigner) {
    try {
        const fabricioSigner = {
            name: 'Fabricio Devechi',
            email: 'fabricio.devechi@demaisaude.com'
        };

        const payloads = [vendedorSigner, clienteSigner, fabricioSigner].map(signer => ({
            data: {
                type: 'signers',
                attributes: {
                    has_documentation: false,
                    group: 1,
                    location_required_enabled: false,
                    communicate_events: {
                        signature_request: 'email',
                        signature_reminder: 'email',
                        document_signed: 'email'
                    },
                    name: signer.name || signer.nomeVendedor || signer.nomeClienteSigner,
                    email: signer.email || signer.emailVendedor || signer.emailClienteSigner,
                    refusable: true
                }
            }
        }));

        const signerIds = [];

        for (const payload of payloads) {
            const response = await fetch(`${BASE_URL}/envelopes/${envelopeId}/signers`, {
                method: 'POST',
                headers: {
                    Authorization: ACCESS_TOKEN,
                    'Content-Type': 'application/vnd.api+json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!data.data || !data.data.id) {
                console.error("❌ Erro ao criar signatário:", data);
                throw new Error("Falha ao criar signatário.");
            }

            signerIds.push(data.data.id);
        }

        return signerIds;

    } catch (error) {
        console.error("❌ Erro interno em criarSignatarios:", error);
        throw error;
    }
}

async function criarRequisitos(envelopeId, documentoId, signersIds) {
    try {
        const [vendedorId, clienteId, fabricioId] = signersIds;
        const requisitos = [
            { role: "witness", id: vendedorId },
            { role: "contractee", id: clienteId },
            { role: "contractor", id: fabricioId }
        ];

        for (const { role, id } of requisitos) {
            const baseReq = {
                document: { data: { type: "documents", id: documentoId } },
                signer: { data: { type: "signers", id } }
            };

            const actions = [
                { action: "agree", role },
                { action: "provide_evidence", auth: "email" }
            ];

            for (const a of actions) {
                const payload = {
                    data: {
                        type: "requirements",
                        attributes: { ...a },
                        relationships: baseReq
                    }
                };

                const response = await fetch(`${BASE_URL}/envelopes/${envelopeId}/requirements`, {
                    method: "POST",
                    headers: {
                        Authorization: ACCESS_TOKEN,
                        "Content-Type": "application/vnd.api+json"
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();
                if (!data.data || !data.data.id) {
                    console.error(`❌ Erro ao criar requisito para ${role}:`, data);
                    throw new Error(`Falha ao criar requisito para ${role}.`);
                }

                console.log(`✅ Requisito criado para ${role}`, data.data.id);
            }
        }
    } catch (error) {
        console.error("❌ Erro interno em criarRequisitos:", error);
        throw error;
    }
}

export async function atualizarEnvelope(envelopeId, deadline_at) {
    try {
        const payload = {
            data: {
                id: envelopeId,
                type: 'envelopes',
                attributes: { status: 'running', deadline_at }
            }
        };

        const response = await fetch(`${BASE_URL}/envelopes/${envelopeId}`, {
            method: 'PATCH',
            headers: {
                Authorization: ACCESS_TOKEN,
                'Content-Type': 'application/vnd.api+json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!data.data || !data.data.id) {
            console.error("❌ Erro ao atualizar envelope:", data);
            throw new Error("Falha ao atualizar status do envelope.");
        }

    } catch (error) {
        console.error("❌ Erro interno em atualizarEnvelope:", error);
        throw error;
    }
}

export async function enviarNotificacao(envelopeId) {
    try {
        const payload = {
            data: {
                type: 'notifications',
                attributes: {
                    message: 'D+Saúde informa: Documento disponível para assinatura!'
                }
            }
        };

        const response = await fetch(`${BASE_URL}/envelopes/${envelopeId}/notifications`, {
            method: 'POST',
            headers: {
                Authorization: ACCESS_TOKEN,
                'Content-Type': 'application/vnd.api+json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!data.data || !data.data.id) {
            console.error("❌ Erro ao enviar notificação:", data);
            throw new Error("Falha ao notificar signatários.");
        }

    } catch (error) {
        console.error("❌ Erro interno em enviarNotificacao:", error);
        throw error;
    }
}

export async function enviarParaClicksign(dados, pdfBuffer) {
    try {
        const deadline_at = new Date();
        deadline_at.setMonth(deadline_at.getMonth() + 1);
        deadline_at.setDate(0);
        const deadlineFormatado = deadline_at.toISOString().slice(0, 19) + ".000-03:00";

        const nomeEmpresa = dados.campos.nomeCredenciada || nomeEmpresa;
        const envelopeId = await criarEnvelope(nomeEmpresa, deadlineFormatado);

        const base64PDF = `data:application/pdf;base64,${Buffer.from(pdfBuffer).toString('base64')}`;

        const documentoId = await enviarDocumentoPDF(envelopeId, base64PDF, nomeEmpresa);

        const signersIds = await criarSignatarios(envelopeId, dados.vendedorSigner, dados.clienteSigner);

        await criarRequisitos(envelopeId, documentoId, signersIds);
        await atualizarEnvelope(envelopeId, deadlineFormatado);
        await enviarNotificacao(envelopeId);

        return { success: true, envelopeId, documentoId };

    } catch (error) {
        console.error("❌ Erro geral em enviarParaClicksign:", error);
        return { success: false, error: error.message };
    }
}
