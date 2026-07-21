## Decisão de arquitetura

Descartar o Supabase para o Relatório de Vendas. O Protheus já é a fonte da verdade — duplicar dados em outro banco criaria um problema de sincronização sem ganho real. Vamos seguir o mesmo padrão que já usamos em `loginProtheus` e `obterLojasProtheus`: **server functions do TanStack** chamando a API do Protheus, com paginação e filtros feitos no servidor.

## O que vai ser construído

### 1. Server function `obterVendasProtheus`
Arquivo novo: `src/lib/protheus-vendas.functions.ts`

- `POST` para o endpoint de vendas do Protheus (URL exata a confirmar com o TI — deixo um placeholder tipo `/ag/externos/functions/relatorioVendas` e você só troca).
- Entrada: `{ filial, dataInicio, dataFim, page, pageSize, busca?, status?, vendedor? }`.
- Saída normalizada: `{ vendas: Venda[], total: number, page: number, pageSize: number, hasMore: boolean }`.
- Parser tolerante a variações no JSON do Protheus (mesmo estilo do `obterLojasProtheus`, que aceita `data`, `result`, `lojas`...).

### 2. Server function `obterIndicadoresVendasProtheus`
Mesmo arquivo. Traz os agregados do topo (Total, Entradas, Descontos, Meta) e séries para os gráficos (por dia, por vendedor, por status, por mês) num único payload — assumindo que o Protheus expõe isso agregado. Se não expuser, cai num fallback: pega uma janela maior de vendas e agrega no servidor antes de mandar pro cliente.

### 3. Página `/app/vendas` com paginação real
Arquivo: `src/routes/app.vendas.tsx`

- `useQuery` com `queryKey: ['vendas', filial, filtros, page]` — cache automático por página.
- Controles de paginação server-side (Anterior / Próxima / "Página X de Y") no rodapé da tabela.
- Filtros (status, mês, busca, vendedor) enviados pra API — nada de filtrar array em memória.
- Estados de loading (skeleton), erro (com botão "tentar de novo") e vazio.
- KPIs e gráficos consomem o segundo endpoint, independente da tabela.

### 4. Aposentar os mocks de vendas
Remover de `src/services/api.ts` só as funções de vendas mockadas (`getVendas`, `getIndicadoresVendas`, `getVendasPorDia`, `getVendasPorVendedor`). Compras, clientes e crediário continuam como estão até você me passar os endpoints deles.

## Detalhes técnicos

**Por que server function e não fetch direto do navegador:**
- Evita CORS (Protheus provavelmente não libera pro domínio do site).
- Não expõe a URL interna do Protheus no bundle.
- Permite reaproveitar o token de auth do usuário logado sem passar pelo cliente.

**Sobre o token:** hoje o `access_token` é guardado no `AuthContext` (localStorage). Vou aceitar duas formas na server function:
1. Token enviado no body da chamada (mais simples, funciona já).
2. (Futuro) mover token pra cookie httpOnly quando for pra produção — deixo anotado, não faço agora.

**Paginação:** padrão `page`/`pageSize` (default 50). Se o TI me disser que o endpoint usa `offset`/`limit`, é uma linha de mudança na server function.

## O que EU vou assumir (e você corrige depois se estiver errado)

1. Endpoint de vendas: `POST https://appcometa.fortiddns.com/ag/externos/functions/relatorioVendas` — **placeholder**, você me passa a URL certa e eu troco em 30 segundos.
2. Payload de request: `{ user, filial, dataInicio, dataFim, page, pageSize }`.
3. Payload de resposta: `{ data: [...], total: N }` ou `{ vendas: [...], total: N }` — o parser aceita os dois.
4. KPIs e séries vêm de um endpoint agregado separado. Se não vier, agrego a partir da lista.

## Fora do escopo agora

- Compras, Clientes e Crediário — continuam com dados mockados até você me passar os endpoints.
- Exportação (Excel/PDF) — se quiser depois.
- Cache/refresh automático a cada X minutos — se quiser depois.

## Próximo passo depois que aprovar

Se você já tiver a URL e um exemplo de resposta do endpoint de vendas, cola aqui que eu já implemento com os valores certos. Se não tiver, eu implemento com o placeholder e você só ajusta a URL no arquivo `src/lib/protheus-vendas.functions.ts`.
