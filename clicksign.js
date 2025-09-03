// === clicksign.js ===


const ACCESS_TOKEN = process.env.CLICKSIGN_ACCESS_TOKEN;
const BASE_URL = 'https://app.clicksign.com/api/v3';

export async function criarEnvelope(nomeEmpresa, deadline_at) {
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
    return data.data.id;
}

export async function enviarDocumentoPDF(envelopeId, base64PDF, nomeEmpresa) {
    const payload = {
        data: {
            type: 'documents',
            attributes: {
                content_base64: base64PDF,
                content_type: 'application/pdf',
                filename: `CONTRATO_${nomeEmpresa.replace(/[\/\\:*?"<>|]/g, '-')}.pdf`
            }
        }
    };

    const response = await fetch(`${BASE_URL}/envelopes/${envelopeId}/documents`, {
        method: 'POST',
        headers: {
            Authorization: ACCESS_TOKEN,
            'Content-Type': 'application/vnd.api+json'
        },
        body: JSON.stringify(payload)
    });
    const data = await response.json();
    return data.data.id;
}

export async function criarSignatarios(envelopeId, vendedorSigner, clienteSigner) {
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
        signerIds.push(data.data.id);
    }
    return signerIds;
}

async function criarRequisitos(envelopeId, documentoId, signersIds) {
    const [vendedorId, clienteId, fabricioId] = signersIds;
    const requisitos = [
        // Witness (vendedor)
        {
            data: {
                type: "requirements",
                attributes: {
                    action: "agree",
                    role: "witness"
                },
                relationships: {
                    document: { data: { type: "documents", id: documentoId } },
                    signer: { data: { type: "signers", id: vendedorId } }
                }
            }
        },
        {
            data: {
                type: "requirements",
                attributes: {
                    action: "provide_evidence",
                    auth: "email"
                },
                relationships: {
                    document: { data: { type: "documents", id: documentoId } },
                    signer: { data: { type: "signers", id: vendedorId } }
                }
            }
        },

        // Contractee (cliente)
        {
            data: {
                type: "requirements",
                attributes: {
                    action: "agree",
                    role: "contractee"
                },
                relationships: {
                    document: { data: { type: "documents", id: documentoId } },
                    signer: { data: { type: "signers", id: clienteId } }
                }
            }
        },
        {
            data: {
                type: "requirements",
                attributes: {
                    action: "provide_evidence",
                    auth: "email"
                },
                relationships: {
                    document: { data: { type: "documents", id: documentoId } },
                    signer: { data: { type: "signers", id: clienteId } }
                }
            }
        },

        // Contractor (Fabricio)
        {
            data: {
                type: "requirements",
                attributes: {
                    action: "agree",
                    role: "contractor"
                },
                relationships: {
                    document: { data: { type: "documents", id: documentoId } },
                    signer: { data: { type: "signers", id: fabricioId } }
                }
            }
        },
        {
            data: {
                type: "requirements",
                attributes: {
                    action: "provide_evidence",
                    auth: "email"
                },
                relationships: {
                    document: { data: { type: "documents", id: documentoId } },
                    signer: { data: { type: "signers", id: fabricioId } }
                }
            }
        }
    ];

    for (const requisito of requisitos) {
        console.log("Payload para criar requisito:", requisito);
        const response = await fetch(`${BASE_URL}/envelopes/${envelopeId}/requirements`, {
            method: "POST",
            headers: {
                Authorization: `${ACCESS_TOKEN}`,
                "Content-Type": "application/vnd.api+json"
            },
            body: JSON.stringify(requisito)
        });
        const data = await response.json();
        console.log("Resposta do requisito:", data);
    }
}


export async function atualizarEnvelope(envelopeId, deadline_at) {
    const payload = {
        data: {
            id: envelopeId,
            type: 'envelopes',
            attributes: { status: 'running', deadline_at }
        }
    };

    await fetch(`${BASE_URL}/envelopes/${envelopeId}`, {
        method: 'PATCH',
        headers: {
            Authorization: ACCESS_TOKEN,
            'Content-Type': 'application/vnd.api+json'
        },
        body: JSON.stringify(payload)
    });
}

export async function enviarNotificacao(envelopeId) {
    const payload = {
        data: {
            type: 'notifications',
            attributes: {
                message: 'D+Saúde informa: Documento disponível para assinatura!'
            }
        }
    };

    await fetch(`${BASE_URL}/envelopes/${envelopeId}/notifications`, {
        method: 'POST',
        headers: {
            Authorization: ACCESS_TOKEN,
            'Content-Type': 'application/vnd.api+json'
        },
        body: JSON.stringify(payload)
    });


}

export async function enviarParaClicksign(dados, pdfBuffer) {
    const deadline_at = new Date();
    deadline_at.setMonth(deadline_at.getMonth() + 1);
    deadline_at.setDate(0); // último dia do próximo mês
    const deadlineFormatado = deadline_at.toISOString().slice(0, 19) + ".000-03:00";

    const envelopeId = await criarEnvelope(dados.campos.nomeEmpresa, deadlineFormatado);

    const base64PDF = pdfBuffer.toString('base64');
    const documentoId = await enviarDocumentoPDF(envelopeId, base64PDF, dados.campos.nomeEmpresa);

    const signersIds = await criarSignatarios(envelopeId, dados.vendedorSigner, dados.clienteSigner);

    await criarRequisitos(envelopeId, documentoId, signersIds);
    await atualizarEnvelope(envelopeId, deadlineFormatado);
    await enviarNotificacao(envelopeId);

    return { success: true, envelopeId, documentoId };
}

