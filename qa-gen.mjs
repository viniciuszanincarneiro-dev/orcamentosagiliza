// QA script — generates a sample PDF + DOCX using the actual app libs (with shimmed asset import)
import { readFileSync, writeFileSync } from 'fs';
import { pathToFileURL } from 'url';

// Shim @/assets/agiliza-logo.png by intercepting in import map — simpler: monkey-patch fetch
const logoBytes = readFileSync('/dev-server/src/assets/agiliza-logo.png');
const logoB64 = `data:image/png;base64,${logoBytes.toString('base64')}`;

globalThis.fetch = async (url) => {
  if (String(url).includes('agiliza-logo')) {
    return {
      arrayBuffer: async () => logoBytes.buffer.slice(logoBytes.byteOffset, logoBytes.byteOffset + logoBytes.byteLength),
      blob: async () => ({
        // FileReader.readAsDataURL is used; we'll shim FileReader too
        _bytes: logoBytes,
      }),
    };
  }
  throw new Error('unexpected fetch ' + url);
};

// Shim FileReader for jspdf logo loader
globalThis.FileReader = class {
  readAsDataURL(blob) {
    setTimeout(() => {
      this.result = logoB64;
      this.onloadend && this.onloadend();
    }, 0);
  }
};

// jsdom-free: jspdf + docx work in node
const { jsPDF } = await import('jspdf');
const autoTableMod = await import('jspdf-autotable');
const autoTable = autoTableMod.default;
const docx = await import('docx');

// Inline copies of empresa/format constants (avoid path alias)
const EMPRESA = {
  razao: "AGILIZA ASSESSORIA EM DOCUMENTOS E TOPOGRAFIA",
  razaoLegal: "Everton de Oliveira Meyer Ltda",
  cnpj: "36.172.008/0001-82",
  email: "agiliza.smo@gmail.com",
  unidades: [
    { cidade: "São Miguel do Oeste", endereco: "Rua Marcilio Dias, 1539 - Centro", telefones: "(49) 3197-8160 · (49) 99990-9954", email: "agiliza.smo@gmail.com" },
    { cidade: "Maravilha", endereco: "Av. Anita Garibaldi, 340 - Centro", telefones: "(49) 99154-1854", email: "agiliza.mh@gmail.com" },
    { cidade: "Paraíso", endereco: "Rua Guilherme Schmidt, 834 - Centro", telefones: "(49) 99188-5181", email: "agiliza.paraiso@gmail.com" },
    { cidade: "Dionísio Cerqueira", endereco: "Av. Washington Luis, 646 - Centro", telefones: "(49) 99192-2081", email: "agiliza.dc@gmail.com" },
  ],
};
const TIPO_TITULOS = { retificacao_geo: "RETIFICAÇÃO ADMINISTRATIVA COM GEORREFERENCIAMENTO CERTIFICADO PELO INCRA" };
const DESCRICAO_PADRAO = { retificacao_geo: "No presente orçamento está incluso os seguintes serviços: Levantamento Topográfico, Locação (marcos georreferenciados), Assessoria Documental (elaboração de mapas, memoriais descritivos, TRT, requerimentos e demais documentos que compõe o processo), Coleta de Assinaturas (proprietários e confrontantes), encaminhamento dos documentos no Registro de Imóveis e, atualização dos cadastros rurais CCIR, ITR e CAR." };
const formatBRL = (n) => Number(n||0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatNumberBR = (n, d=2) => Number(n||0).toLocaleString("pt-BR", { maximumFractionDigits: d });
const formatDateLong = (d) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

const orc = {
  numero: "ORC-2026-0001",
  tipo_servico: "retificacao_geo",
  requerente_nome: "JOÃO DA SILVA TESTE",
  requerente_cpf_cnpj: "123.456.789-00",
  imovel_descricao: "Imóvel rural",
  imovel_localizacao: "Linha Castelo Branco",
  imovel_municipio: "São Miguel do Oeste/SC",
  imovel_area_m2: 80000,
  imovel_matricula: "12345",
  imovel_valor_avaliado: 350000,
  imovel_ccir: "1234567890",
  imovel_car: "SC-4204400-XXX",
  proprietarios: [
    { nome: "JOÃO DA SILVA TESTE", cpf_cnpj: "123.456.789-00" },
    { nome: "MARIA DA SILVA TESTE", cpf_cnpj: "987.654.321-00" },
  ],
  confrontantes: [
    { nome: "CARLOS VIZINHO", lado: "Norte" },
    { nome: "ANA FRONTEIRA", lado: "Leste" },
  ],
  itens: [
    { descricao: "LEVANTAMENTO TOPOGRÁFICO E LOCAÇÃO", valor: 5300 },
    { descricao: "REGISTRO DE IMÓVEIS", valor: 2862.95 },
    { descricao: "CERTIDÕES, NEGATIVAS E ASSINATURAS", valor: 450 },
    { descricao: "ATUALIZAÇÃO CCIR, ITR, CAR", valor: 250 },
  ],
  valor_total: 8862.95,
  observacoes: "Desconto especial negociado com o cliente.",
};

// ====== PDF ======
const VERDE = [52, 168, 83], VERMELHO = [220, 53, 47], PRETO = [25, 25, 28], CINZA = [110, 110, 115];
const doc = new jsPDF({ unit: "pt", format: "a4" });
const W = doc.internal.pageSize.getWidth();
const H = doc.internal.pageSize.getHeight();
const M = 48;
const titulo = TIPO_TITULOS[orc.tipo_servico];

const addHeader = () => {
  doc.addImage(logoB64, "PNG", M, 30, 140, 50);
  doc.setFontSize(9); doc.setTextColor(...CINZA);
  doc.text(`Orçamento Nº ${orc.numero}`, W - M, 45, { align: "right" });
  doc.text(formatDateLong(new Date()), W - M, 58, { align: "right" });
  doc.setDrawColor(...VERDE); doc.setLineWidth(2);
  doc.line(M, 90, W - M, 90);
};
const addFooter = (p, t) => {
  const y = H - 70;
  doc.setDrawColor(...VERDE); doc.setLineWidth(1); doc.line(M, y, W - M, y);
  doc.setFontSize(7); doc.setTextColor(...CINZA);
  let cy = y + 10;
  EMPRESA.unidades.forEach((u) => {
    doc.setFont("helvetica", "bold"); doc.setTextColor(...PRETO);
    doc.text(u.cidade, M, cy);
    doc.setFont("helvetica", "normal"); doc.setTextColor(...CINZA);
    doc.text(`${u.endereco} · ${u.telefones} · ${u.email}`, M + 90, cy);
    cy += 9;
  });
  doc.text(`${p} / ${t}`, W - M, H - 20, { align: "right" });
};

addHeader();
let y = 120;
doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.setTextColor(...PRETO);
doc.text("ORÇAMENTO", W / 2, y, { align: "center" }); y += 22;
doc.setFontSize(11); doc.setTextColor(...VERMELHO);
const tl = doc.splitTextToSize(titulo, W - 2 * M);
doc.text(tl, W / 2, y, { align: "center" }); y += tl.length * 14 + 18;

doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(...PRETO);
doc.text("REQUERENTE:", M, y);
doc.setFont("helvetica", "normal");
doc.text(`${orc.requerente_nome} — ${orc.requerente_cpf_cnpj}`, M + 90, y); y += 16;

doc.setFont("helvetica", "bold"); doc.text("PRESTADORA:", M, y);
doc.setFont("helvetica", "normal");
const prest = `${EMPRESA.razao}, pessoa jurídica de direito privado, inscrita no CNPJ nº ${EMPRESA.cnpj}, com sede na Rua Marcilio Dias, nº 1539, Centro, São Miguel do Oeste/SC. E-mail: ${EMPRESA.email}.`;
const pl = doc.splitTextToSize(prest, W - 2 * M - 90);
doc.text(pl, M + 90, y); y += pl.length * 12 + 14;

doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...VERDE);
doc.text("OBJETO DO ORÇAMENTO", M, y); y += 14;
doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...PRETO);
const partes = [orc.imovel_descricao, `com área de ${formatNumberBR(orc.imovel_area_m2)} m² (${formatNumberBR(orc.imovel_area_m2/10000,4)} ha)`, `localizado em ${orc.imovel_localizacao}`, `município de ${orc.imovel_municipio}`, `matrícula nº ${orc.imovel_matricula}`, `imóvel avaliado em ${formatBRL(orc.imovel_valor_avaliado)}`, `CCIR: ${orc.imovel_ccir}`, `CAR: ${orc.imovel_car}`];
const obj = `O presente orçamento refere-se à prestação de serviço de ${titulo.toLowerCase()}, referente ao imóvel: ${partes.join(", ")}.`;
const ol = doc.splitTextToSize(obj, W - 2*M);
doc.text(ol, M, y); y += ol.length * 12 + 14;

doc.setFont("helvetica", "bold"); doc.setTextColor(...VERDE); doc.text("PROPRIETÁRIOS", M, y); y += 12;
doc.setFont("helvetica", "normal"); doc.setTextColor(...PRETO);
orc.proprietarios.forEach(p => { doc.text(`• ${p.nome} — ${p.cpf_cnpj}`, M+6, y); y += 12; }); y += 4;
doc.setFont("helvetica", "bold"); doc.setTextColor(...VERDE); doc.text("CONFRONTANTES", M, y); y += 12;
doc.setFont("helvetica", "normal"); doc.setTextColor(...PRETO);
orc.confrontantes.forEach(c => { doc.text(`• ${c.nome} (${c.lado})`, M+6, y); y += 12; }); y += 6;

doc.setFont("helvetica", "bold"); doc.setTextColor(...VERDE); doc.text("DESCRIÇÃO DOS SERVIÇOS", M, y); y += 14;
doc.setFont("helvetica", "normal"); doc.setTextColor(...PRETO);
const dl = doc.splitTextToSize(DESCRICAO_PADRAO[orc.tipo_servico], W - 2*M);
doc.text(dl, M, y); y += dl.length * 12 + 16;

autoTable(doc, {
  startY: y,
  head: [["SERVIÇOS", "VALORES"]],
  body: orc.itens.map(i => [i.descricao, formatBRL(i.valor)]),
  foot: [["VALOR TOTAL", formatBRL(orc.valor_total)]],
  theme: "grid",
  margin: { left: M, right: M },
  styles: { font: "helvetica", fontSize: 10, cellPadding: 8, textColor: PRETO },
  headStyles: { fillColor: PRETO, textColor: [255,255,255], fontStyle: "bold", halign: "left" },
  footStyles: { fillColor: VERDE, textColor: [255,255,255], fontStyle: "bold", fontSize: 11 },
  columnStyles: { 1: { halign: "right", cellWidth: 130 } },
});
y = doc.lastAutoTable.finalY + 24;

if (y > H - 250) { doc.addPage(); addHeader(); y = 120; }
doc.setFont("helvetica", "bold"); doc.setTextColor(...VERDE); doc.setFontSize(11);
doc.text("OBSERVAÇÕES", M, y); y += 14;
doc.setFont("helvetica", "normal"); doc.setTextColor(...PRETO); doc.setFontSize(10);
const obs = [
  "1. Os valores podem sofrer alterações em virtude da tabela de emolumentos do respectivo Cartório de Registro de Imóveis;",
  "2. Em casos de notificação extrajudicial haverá acréscimo de valor, conforme art. 213, §2º da Lei 6.015/76;",
  "3. Forma de Pagamento: a combinar;",
  "4. Orçamento válido por 30 dias.",
  `5. ${orc.observacoes}`,
];
obs.forEach(o => { const lns = doc.splitTextToSize(o, W-2*M); doc.text(lns, M, y); y += lns.length*12 + 4; });
y += 14;
const agradec = "Agradecemos pela oportunidade de apresentar nossa proposta. Estamos confiantes de que podemos atender às suas necessidades com qualidade e eficiência!";
const ag = doc.splitTextToSize(agradec, W-2*M); doc.text(ag, M, y); y += ag.length*12 + 30;
doc.text(`São Miguel do Oeste/SC, ${formatDateLong(new Date())}.`, M, y); y += 50;
doc.setDrawColor(...PRETO); doc.line(W/2-120, y, W/2+120, y); y += 12;
doc.setFont("helvetica", "bold"); doc.text(EMPRESA.razao, W/2, y, { align: "center" }); y += 12;
doc.setFont("helvetica", "normal"); doc.text(`${EMPRESA.razaoLegal} — CNPJ ${EMPRESA.cnpj}`, W/2, y, { align: "center" });

const tp = doc.getNumberOfPages();
for (let i = 1; i <= tp; i++) { doc.setPage(i); addFooter(i, tp); }
writeFileSync('/tmp/qa-orc.pdf', Buffer.from(doc.output('arraybuffer')));
console.log('PDF written, pages:', tp);
