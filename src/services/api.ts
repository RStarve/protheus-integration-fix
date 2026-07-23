/**
 * Camada de serviços mockada.
 *
 * Substitua as funções abaixo pelas chamadas reais à API do Protheus
 * (ex.: `await fetch(`${BASE_URL}/api/v1/vendas`)`). A interface pública
 * (assinaturas e tipos) deve permanecer estável para que a UI não precise
 * mudar quando o backend real for conectado.
 */

// export const BASE_URL = import.meta.env.VITE_PROTHEUS_URL ?? "";

const delay = (ms = 600) => new Promise((r) => setTimeout(r, ms));

// ---------- Tipos ----------
export interface Filial {
  id: string;
  codigo: string;
  nome: string;
  uf: string;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  filiais: Filial[];
  lojas?: string;
}

export interface LoginResponse {
  token: string;
  usuario: Usuario;
}

export interface PedidoCompra {
  id: string;
  numero: string;
  fornecedor: string;
  data: string;
  valor: number;
  status: "Aprovado" | "Pendente" | "Cancelado" | "Recebido";
}

export interface Venda {
  id: string;
  numeroNota: string;
  cliente: string;
  data: string;
  valor: number;
  vendedor: string;
  status: "Faturada" | "Em aberto" | "Cancelada";
}

export interface Cliente {
  id: string;
  codigo: string;
  nome: string;
  cnpj: string;
  cidade: string;
  uf: string;
  email: string;
  telefone: string;
  ultimaCompra: string;
}

export interface IndicadoresVendas {
  total: number;
  entradas: number;
  descontos: number;
  meta: number;
  metaMin: number;
  metaMax: number;
}

export interface VendaPorDia {
  dia: string;
  valor: number;
}

export interface VendaPorVendedor {
  vendedor: string;
  valor: number;
}


// ---------- Auth ----------
import { loginProtheus } from "@/lib/protheus-auth.functions";

export async function login(usuario: string, senha: string): Promise<LoginResponse> {
  if (!usuario || !senha) throw new Error("Informe usuário e senha.");

  const token = await loginProtheus({ data: { username: usuario, password: senha } });

  return {
    token: token.access_token,
    usuario: {
      id: usuario,
      nome: usuario.toUpperCase(),
      email: `${usuario.toLowerCase()}@cometa.com.br`,
      cargo: "Usuário Protheus",
      // Filiais são carregadas dinamicamente via obterLojasProtheus no AuthContext,
      // populando o estado global (filiais) consumido pelo BranchSelector no header.
      filiais: [],
    },
  };
}

// ---------- Compras ----------
export async function getPedidosCompra(filialId: string): Promise<PedidoCompra[]> {
  await delay();
  const fornecedores = [
    "Distribuidora Alfa Ltda",
    "Beta Componentes S.A.",
    "Gama Insumos",
    "Delta Suprimentos",
    "Épsilon Materiais",
    "Zeta Indústria",
  ];
  const status: PedidoCompra["status"][] = ["Aprovado", "Pendente", "Cancelado", "Recebido"];
  return Array.from({ length: 24 }).map((_, i) => ({
    id: `pc-${filialId}-${i + 1}`,
    numero: `PC-${String(10240 + i)}`,
    fornecedor: fornecedores[i % fornecedores.length],
    data: new Date(Date.now() - i * 86400000 * 2).toISOString(),
    valor: 1500 + Math.round(Math.random() * 48000),
    status: status[i % status.length],
  }));
}

// ---------- Relatório de Compras / Estoque de Mercadoria ----------
export interface IndicadoresCompras {
  custoTotal: number;
  valorEstoque: number;
  quantidadeEstoque: number;
  markupMedio: number;
  totalItens: number;
  variacaoCusto: number;
}

export interface ProdutoEstoque {
  id: string;
  filial: string;
  descricao: string;
  referencia: string;
  categoria: string;
  tamanho: string;
  custo: number;
  venda: number;
  markup: number;
  qtdVendida: number;
  estoque: number;
}

export interface ComprasPorPeriodo {
  mes: string;
  custo: number;
  quantidade: number;
}

export interface EstoquePorCategoria {
  categoria: string;
  valor: number;
  quantidade: number;
}

export interface TopFornecedor {
  fornecedor: string;
  valor: number;
}

const CATEGORIAS = [
  "Calçados",
  "Vestuário",
  "Acessórios",
  "Infantil",
  "Esporte",
  "Bolsas",
];

const PRODUTOS_BASE = [
  { desc: "TÊNIS ESPORTIVO PRO RUN", ref: "TN-PRO-01", cat: "Esporte" },
  { desc: "SANDÁLIA CONFORT LEVE", ref: "SND-CF-14", cat: "Calçados" },
  { desc: "BABUCHE INFANTIL COLORS", ref: "BB-INF-08", cat: "Infantil" },
  { desc: "BOLSA COURO CLÁSSICA", ref: "BL-CR-22", cat: "Bolsas" },
  { desc: "CAMISETA BÁSICA ALGODÃO", ref: "CM-BS-05", cat: "Vestuário" },
  { desc: "MOCHILA URBANA 20L", ref: "MC-UR-33", cat: "Acessórios" },
  { desc: "CHINELO PRAIA VERÃO", ref: "CH-VR-09", cat: "Calçados" },
  { desc: "CALÇA JEANS SLIM", ref: "CJ-SL-17", cat: "Vestuário" },
  { desc: "TÊNIS CASUAL URBAN", ref: "TN-UR-12", cat: "Esporte" },
  { desc: "BONÉ ABA CURVA", ref: "BN-AC-04", cat: "Acessórios" },
  { desc: "SAPATILHA BALLET", ref: "SP-BL-27", cat: "Calçados" },
  { desc: "MEIA ESPORTIVA KIT", ref: "MS-ES-02", cat: "Esporte" },
];

const TAMANHOS = ["PP", "P", "M", "G", "GG", "34", "36", "38", "40"];

export async function getIndicadoresCompras(filialId: string): Promise<IndicadoresCompras> {
  await delay(400);
  const base = filialId.length * 180000;
  return {
    custoTotal: base + Math.round(Math.random() * 500000),
    valorEstoque: base * 2.4 + Math.round(Math.random() * 800000),
    quantidadeEstoque: 12000 + Math.floor(Math.random() * 8000),
    markupMedio: Math.round((120 + Math.random() * 40) * 100) / 100,
    totalItens: 400 + Math.floor(Math.random() * 200),
    variacaoCusto: Math.round((Math.random() * 20 - 8) * 10) / 10,
  };
}

export async function getComprasPorPeriodo(filialId: string): Promise<ComprasPorPeriodo[]> {
  await delay(500);
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const seed = filialId.length;
  return meses.map((m, i) => ({
    mes: m,
    custo: 80000 + Math.round(Math.random() * 220000) + seed * 5000 + i * 3000,
    quantidade: 400 + Math.floor(Math.random() * 900),
  }));
}

export async function getEstoquePorCategoria(filialId: string): Promise<EstoquePorCategoria[]> {
  await delay(500);
  return CATEGORIAS.map((c) => ({
    categoria: c,
    valor: 40000 + Math.round(Math.random() * 260000) + filialId.length * 2000,
    quantidade: 400 + Math.floor(Math.random() * 3200),
  }));
}

export async function getTopFornecedores(filialId: string): Promise<TopFornecedor[]> {
  await delay(500);
  const nomes = [
    "Grendene Calçados",
    "Alpargatas S.A.",
    "Vulcabras Azaleia",
    "Beira Rio Confecções",
    "Dass Nordeste",
    "Piccadilly Ind.",
    "Ramarim Indústria",
  ];
  return nomes
    .map((n) => ({
      fornecedor: n,
      valor: 30000 + Math.round(Math.random() * 220000) + filialId.length * 4000,
    }))
    .sort((a, b) => b.valor - a.valor);
}

export async function getEstoqueProdutos(filialId: string): Promise<ProdutoEstoque[]> {
  await delay(600);
  const filial = filialId.padStart(2, "0");
  const items: ProdutoEstoque[] = [];
  PRODUTOS_BASE.forEach((p, i) => {
    for (let t = 0; t < 4; t++) {
      const custo = 20 + Math.round(Math.random() * 180 * 100) / 100;
      const venda = Math.round(custo * (1.8 + Math.random() * 1.4) * 100) / 100;
      const markup = Math.round(((venda - custo) / custo) * 10000) / 100;
      items.push({
        id: `est-${filialId}-${i}-${t}`,
        filial,
        descricao: `${p.desc} ${p.ref}/${TAMANHOS[(i + t) % TAMANHOS.length]}`,
        referencia: p.ref,
        categoria: p.cat,
        tamanho: TAMANHOS[(i + t) % TAMANHOS.length],
        custo,
        venda,
        markup,
        qtdVendida: Math.floor(Math.random() * 40),
        estoque: Math.floor(Math.random() * 120),
      });
    }
  });
  return items;
}

// ---------- Vendas ----------
export async function getIndicadoresVendas(filialId: string): Promise<IndicadoresVendas> {
  await delay(400);
  const base = 500_000 + filialId.length * 60_000;
  const total = base + Math.round(Math.random() * 250_000);
  const meta = 760_000;
  return {
    total,
    entradas: Math.round(total * (0.07 + Math.random() * 0.05)),
    descontos: Math.round(total * (0.04 + Math.random() * 0.04)),
    meta,
    metaMin: 0,
    metaMax: meta * 1.1,
  };
}

export async function getVendasPorDia(filialId: string): Promise<VendaPorDia[]> {
  await delay(500);
  const dias = 30;
  const hoje = new Date();
  const seed = filialId.length;
  return Array.from({ length: dias }).map((_, i) => {
    const d = new Date(hoje);
    d.setDate(hoje.getDate() - (dias - 1 - i));
    return {
      dia: d.toISOString(),
      valor: 8_000 + Math.round(Math.random() * 55_000) + seed * 1200,
    };
  });
}

export async function getVendasPorVendedor(filialId: string): Promise<VendaPorVendedor[]> {
  await delay(500);
  const nomes = [
    "TAMAR CERQUEIRA",
    "MARIA ELIANE",
    "MARCELA GOMES",
    "MAIARA LUIZA SANTOS",
    "CAYLANE DOS SANTOS",
    "FERNANDA PIRES",
    "LANDAIARA DE JESUS",
    "CAMILA DOS SANTOS",
    "THAILANE DOS SANTOS",
    "CLARA CRISTINA",
    "YASMIN",
    "MONIQUE",
    "VENDEDOR PADRÃO",
    "AGUIDA SANTOS",
  ];
  const seed = filialId.length;
  return nomes
    .map((n, i) => ({
      vendedor: n,
      valor: Math.max(
        500,
        Math.round(55_000 * Math.pow(0.82, i) + Math.random() * 6_000 + seed * 400),
      ),
    }))
    .sort((a, b) => b.valor - a.valor);
}

export async function getVendas(filialId: string): Promise<Venda[]> {
  await delay();
  const clientes = [
    "Comercial Horizonte",
    "Indústria Nova Era",
    "Grupo Atlas",
    "Mercantil Norte",
    "Rede Prisma",
    "Construtora Vértice",
  ];
  const vendedores = ["Ana Souza", "Carlos Lima", "Marina Reis", "Paulo Duarte"];
  const status: Venda["status"][] = ["Faturada", "Em aberto", "Cancelada"];
  return Array.from({ length: 18 }).map((_, i) => ({
    id: `v-${filialId}-${i + 1}`,
    numeroNota: `NF-${String(88010 + i)}`,
    cliente: clientes[i % clientes.length],
    data: new Date(Date.now() - i * 86400000).toISOString(),
    valor: 800 + Math.round(Math.random() * 25000),
    vendedor: vendedores[i % vendedores.length],
    status: status[i % status.length],
  }));
}


// ---------- Clientes ----------
export async function getClientes(filialId: string): Promise<Cliente[]> {
  await delay();
  const nomes = [
    "Comercial Horizonte Ltda",
    "Indústria Nova Era S.A.",
    "Grupo Atlas Participações",
    "Mercantil Norte Distribuidora",
    "Rede Prisma Varejo",
    "Construtora Vértice",
    "Alfa Serviços Corporativos",
    "Beta Logística Integrada",
    "Delta Tecnologia",
    "Épsilon Alimentos",
    "Zeta Farmacêutica",
    "Ômega Metalúrgica",
  ];
  const cidades: [string, string][] = [
    ["São Paulo", "SP"],
    ["Rio de Janeiro", "RJ"],
    ["Belo Horizonte", "MG"],
    ["Curitiba", "PR"],
    ["Porto Alegre", "RS"],
    ["Salvador", "BA"],
  ];
  return nomes.map((n, i) => {
    const [cidade, uf] = cidades[i % cidades.length];
    return {
      id: `cli-${filialId}-${i + 1}`,
      codigo: String(20100 + i),
      nome: n,
      cnpj: `${10 + i}.${String(200 + i).padStart(3, "0")}.${String(300 + i).padStart(3, "0")}/0001-${String(10 + i).padStart(2, "0")}`,
      cidade,
      uf,
      email: `contato@${n.split(" ")[0].toLowerCase()}.com.br`,
      telefone: `(${11 + (i % 20)}) 9${String(1000 + i).padStart(4, "0")}-${String(2000 + i).padStart(4, "0")}`,
      ultimaCompra: new Date(Date.now() - i * 86400000 * 3).toISOString(),
    };
  });
}

// ---------- Crediários abertos ----------
export interface IndicadoresCrediario {
  cadastrosTotal: number;
  clientesComVendas: number;
  clientesSemVendas: number;
  ticketMedio: number;
  valorTotal: number;
  crescimentoAnual: number;
  meta: number;
}

export interface CrescimentoMensal {
  mes: string;
  crescimento: number;
}

export interface CrediarioColaborador {
  id: string;
  colaborador: string;
  primeiroCodigo: string;
  loja: string;
  vlrVenda: number;
  ticketMedio: number;
  vlrEntrada: number;
  aproveitamento: number;
  limiteLiberado: number;
  utilizadoLimite: number;
}

export async function getIndicadoresCrediario(filialId: string): Promise<IndicadoresCrediario> {
  await delay(400);
  const seed = filialId.length;
  const valorTotal = 480_000 + Math.round(Math.random() * 120_000) + seed * 8_000;
  const cadastrosTotal = 2200 + Math.floor(Math.random() * 400);
  const comVendas = Math.round(cadastrosTotal * (0.5 + Math.random() * 0.15));
  return {
    cadastrosTotal,
    clientesComVendas: comVendas,
    clientesSemVendas: cadastrosTotal - comVendas,
    ticketMedio: 140_000 + Math.round(Math.random() * 30_000),
    valorTotal,
    crescimentoAnual: Math.round((90 + Math.random() * 60) * 100) / 100,
    meta: 600_000,
  };
}

export async function getCrescimentoMensal(filialId: string): Promise<CrescimentoMensal[]> {
  await delay(400);
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  const seed = filialId.length;
  return meses.map((m, i) => ({
    mes: m,
    crescimento: Math.round((Math.sin((i + seed) / 2) * 60 + Math.random() * 40 + 20) * 100) / 100,
  }));
}

export async function getCrediarioPorColaborador(filialId: string): Promise<CrediarioColaborador[]> {
  await delay(500);
  const nomes = [
    "CLAUDIA", "DEISE", "ANA CAROLINA", "JOSEANE", "KACYANE", "VANESSA",
    "TALITHA", "NAYARA", "MONICA", "CAILANE", "TAMAR", "FERNANDA",
    "MARCELA", "MAIARA", "CLARA", "YASMIN",
  ];
  const seed = filialId.length;
  return nomes.map((nome, i) => {
    const vlrVenda = Math.round((120 + i * 90 + Math.random() * 400 + seed * 20) * 100) / 100;
    const ticketMedio = Math.round((vlrVenda * (0.85 + Math.random() * 0.3)) * 100) / 100;
    const vlrEntrada = Math.round(vlrVenda * Math.random() * 0.15 * 100) / 100;
    const limiteLiberado = 300 + Math.round(Math.random() * 3500);
    const utilizado = Math.round(Math.random() * 220 * 100) / 100;
    return {
      id: `crd-${filialId}-${i}`,
      colaborador: nome,
      primeiroCodigo: String(8 + i * 3).padStart(2, "0"),
      loja: filialId.padStart(2, "0"),
      vlrVenda,
      ticketMedio,
      vlrEntrada,
      aproveitamento: Math.round(Math.random() * 300 * 100) / 100,
      limiteLiberado,
      utilizadoLimite: utilizado,
    };
  });
}
