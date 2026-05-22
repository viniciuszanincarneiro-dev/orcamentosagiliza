import { createServerFn } from "@tanstack/react-start";

export type MatriculaParsed = {
  numero_matricula?: string;
  municipio?: string;
  tipo_imovel?: string;
  area_m2?: number;
  valor_avaliado?: number;
  proprietarios: { nome: string; cpf_cnpj?: string }[];
  descricao_imovel?: string;
};

// Prompt curto e objetivo — só os campos essenciais. Sem averbações, sem histórico.
const SYSTEM = `Você extrai dados de matrículas de imóveis brasileiras.
Olhe APENAS o cabeçalho e o registro mais recente. IGNORE averbações antigas, confrontações, histórico e descrições longas.
Responda SOMENTE com JSON válido neste formato:
{
  "numero_matricula": string|null,
  "municipio": string|null,
  "tipo_imovel": "urbano"|"rural"|null,
  "area_m2": number|null,
  "valor_avaliado": number|null,
  "proprietarios": [{"nome": string, "cpf_cnpj": string|null}]
}
Converta área para m² (1 ha = 10000 m²; 1 alqueire paulista = 24200 m²).
valor_avaliado em reais, apenas número. Nunca invente — use null se não encontrar.`;

type Input = {
  texto?: string;
  arquivo?: { data_base64: string; mime_type: string; nome?: string };
};

export const parseMatricula = createServerFn({ method: "POST" })
  .inputValidator((input: Input) => {
    if (!input || (!input.texto && !input.arquivo)) throw new Error("Informe texto ou arquivo");
    if (input.texto && input.texto.length > 8000) {
      // Trunca em vez de erro — só precisamos das primeiras páginas.
      input.texto = input.texto.slice(0, 8000);
    }
    if (input.arquivo && input.arquivo.data_base64.length > 14_000_000) throw new Error("Arquivo muito grande (máx ~10MB)");
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
        text: "Extraia apenas os campos pedidos. Ignore averbações e histórico.",
      });
    } else {
      userContent.push({ type: "text", text: data.texto! });
    }

    // Modelo rápido e barato; suficiente para campos objetivos.
    const model = "google/gemini-2.5-flash";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);

    let res: Response;
    try {
      res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
          max_tokens: 400,
        }),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeout);
      if ((err as Error).name === "AbortError") {
        throw new Error("Tempo esgotado na leitura. Tente novamente ou use o modo manual.");
      }
      throw err;
    }
    clearTimeout(timeout);

    if (res.status === 429) throw new Error("Limite de requisições atingido. Tente novamente em instantes.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Erro IA (${res.status}): ${txt.slice(0, 200)}`);
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
          .slice(0, 4)
      : [];

    return {
      numero_matricula: parsed.numero_matricula ? String(parsed.numero_matricula) : undefined,
      municipio: parsed.municipio ? String(parsed.municipio) : undefined,
      tipo_imovel: parsed.tipo_imovel ? String(parsed.tipo_imovel) : undefined,
      area_m2: typeof parsed.area_m2 === "number" ? parsed.area_m2 : undefined,
      valor_avaliado: typeof parsed.valor_avaliado === "number" ? parsed.valor_avaliado : undefined,
      proprietarios,
    };
  });
