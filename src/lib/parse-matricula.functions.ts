import { createServerFn } from "@tanstack/react-start";

export type MatriculaParsed = {
  numero_matricula?: string;
  municipio?: string;
  area_m2?: number;
  valor_avaliado?: number;
  proprietarios: { nome: string; cpf_cnpj?: string }[];
  descricao_imovel?: string;
};

const SYSTEM = `Você é um assistente especialista em interpretar matrículas de registro de imóveis brasileiras.
Você pode receber TEXTO ou IMAGENS/PDF escaneados de matrículas (inclusive fotos tiradas no celular ou via WhatsApp). Faça OCR mental quando necessário.
Extraia as informações estruturadas e retorne EXCLUSIVAMENTE um JSON válido com este formato:
{
  "numero_matricula": string | null,
  "municipio": string | null,
  "area_m2": number | null,
  "valor_avaliado": number | null,
  "proprietarios": [{ "nome": string, "cpf_cnpj": string | null }],
  "descricao_imovel": string | null
}
Regras:
- Converta a área para metros quadrados (1 hectare = 10000 m²; 1 alqueire paulista = 24200 m²).
- valor_avaliado é o valor venal/avaliado do imóvel em reais (apenas o número, sem R$).
- proprietarios = apenas o(s) proprietário(s) ATUAL(IS) (último registro/averbação de transmissão).
- Nunca invente dados. Use null quando não encontrar.
- Responda APENAS o JSON, sem comentários, sem markdown.`;

type Input = {
  texto?: string;
  arquivo?: { data_base64: string; mime_type: string; nome?: string };
};

export const parseMatricula = createServerFn({ method: "POST" })
  .inputValidator((input: Input) => {
    if (!input || (!input.texto && !input.arquivo)) throw new Error("Informe texto ou arquivo");
    if (input.texto && input.texto.length > 30000) throw new Error("Texto muito longo");
    if (input.arquivo && input.arquivo.data_base64.length > 18_000_000) throw new Error("Arquivo muito grande (máx ~13MB)");
    return input;
  })
  .handler(async ({ data }): Promise<MatriculaParsed> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY não configurada");

    const userContent: Array<Record<string, unknown>> = [];
    if (data.arquivo) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${data.arquivo.mime_type};base64,${data.arquivo.data_base64}` },
      });
      userContent.push({
        type: "text",
        text: data.texto?.trim() || "Extraia os dados da matrícula deste documento.",
      });
    } else {
      userContent.push({ type: "text", text: data.texto! });
    }

    // Para OCR de imagem/PDF, usar modelo com visão melhor
    const model = data.arquivo ? "google/gemini-2.5-pro" : "google/gemini-2.5-flash";

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("Limite de requisições atingido. Tente novamente em instantes.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Erro IA (${res.status}): ${txt.slice(0, 300)}`);
    }

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }

    const proprietarios = Array.isArray(parsed.proprietarios)
      ? (parsed.proprietarios as Array<Record<string, unknown>>)
          .map((p) => ({
            nome: String(p.nome ?? "").trim(),
            cpf_cnpj: p.cpf_cnpj ? String(p.cpf_cnpj) : undefined,
          }))
          .filter((p) => p.nome)
      : [];

    return {
      numero_matricula: parsed.numero_matricula ? String(parsed.numero_matricula) : undefined,
      municipio: parsed.municipio ? String(parsed.municipio) : undefined,
      area_m2: typeof parsed.area_m2 === "number" ? parsed.area_m2 : undefined,
      valor_avaliado: typeof parsed.valor_avaliado === "number" ? parsed.valor_avaliado : undefined,
      proprietarios,
      descricao_imovel: parsed.descricao_imovel ? String(parsed.descricao_imovel) : undefined,
    };
  });
