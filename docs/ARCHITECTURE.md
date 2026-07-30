# Arquitetura inicial

## Princípios

- **Monólito modular primeiro:** é mais barato de operar, testar e evoluir que
  microsserviços. Módulos têm fronteiras claras, mas compartilham uma transação.
- **Razões imutáveis:** estoque e caixa são históricos append-only. Cancelamentos
  criam lançamentos inversos; não apagam o passado.
- **Multiempresa desde o início:** toda entidade de negócio carrega
  `organization_id`. Toda consulta deve filtrá-lo.
- **Valores exatos:** dinheiro usa `NUMERIC`/`Decimal`; quantidades suportam três
  casas e fatores de conversão seis.
- **Offline com limites:** o PWA pode guardar catálogo e rascunhos em IndexedDB.
  A confirmação de venda exige servidor para impedir estoque duplicado.

## Componentes

```text
PWA React (câmera, venda, dashboards)
        │ HTTPS / JSON / JWT
        ▼
FastAPI
  ├── Catálogo e fornecedores
  ├── Estoque, lotes e produção
  ├── Vendas, orçamentos e recibos
  ├── Financeiro e fiado
  ├── RBAC, API keys e auditoria
  └── Relatórios / assistente de métricas
        │
        ▼
PostgreSQL (produção) ou SQLite (uma loja/um processo)
```

Um worker separado, executado por cron do sistema, processa alertas e exportações.
Não é necessário Redis no início. A fila pode ser a própria tabela de jobs no
PostgreSQL com `FOR UPDATE SKIP LOCKED`.

## Fluxo transacional da venda

1. Validar JWT, organização e permissão `sales.create`.
2. Validar produtos, cliente, preços, desconto e soma dos pagamentos.
3. Expandir cada kit recursivamente até chegar a produtos estocáveis; ciclos são
   rejeitados.
4. Bloquear os lotes elegíveis com `SELECT ... FOR UPDATE`.
5. Consumir por FEFO/FIFO: primeiro vencimento, depois data de entrada.
6. Gravar venda, itens com custo congelado e movimentos negativos por lote.
7. Pagamentos imediatos geram entrada de caixa. “Fiado” gera parcelas em contas
   a receber e exige cliente.
8. Fazer um único `COMMIT`. Qualquer falha executa `ROLLBACK`.

Use `Idempotency-Key` em integrações e mantenha a chave única por organização
para evitar vendas duplicadas em repetição de rede.

## RBAC

A autorização efetiva é calculada assim:

1. União das permissões dos papéis em `user_roles`;
2. aplicação de `user_permission_overrides`;
3. negação por padrão.

Permissões devem ser pequenas e estáveis, por exemplo:

- `products.view`, `products.edit`, `products.view_cost`;
- `stock.receive`, `stock.adjust`, `stock.view_history`;
- `sales.create`, `sales.discount`, `sales.cancel`;
- `finance.view`, `finance.expense.create`;
- `reports.export`, `api_keys.manage`, `team.manage`.

O backend verifica a permissão em toda rota; esconder botões no frontend é apenas
uma melhoria de interface, não segurança.

## Alertas preditivos

Uma rotina diária cria sugestões, não alterações automáticas:

- **Validade:** lotes disponíveis vencendo em 7, 15 e 30 dias.
- **Estoque baixo:** `dias_de_cobertura = estoque_atual / média_móvel_diária`.
- **Ponto de pedido:** `demanda_média × lead_time + estoque_de_segurança`.

Comece com média móvel de 28 dias e percentil de variabilidade. Só adote modelos
estatísticos após ter histórico suficiente. Alertas devem guardar a explicação
e os dados usados para serem auditáveis.

## Produção e kits

Para kit virtual, a venda baixa os componentes diretamente. Para produto
montado previamente, acrescente `production_orders` e
`production_order_items`: a conclusão gera `production_out` nos insumos e
`production_in` no lote do produto acabado. O custo do acabado é a soma dos
insumos consumidos, incluindo desperdício.

## Câmera

O componente web usa `getUserMedia` com câmera traseira e a API nativa
`BarcodeDetector`. Como nem todos os navegadores a oferecem, mantenha entrada
manual e adicione `@zxing/browser` como fallback quando necessário. Permissão de
câmera requer HTTPS (exceto `localhost`).

## Financeiro

- `cash_entries` responde “o que entrou/saiu do caixa”.
- `receivables` responde “quem deve, quanto e desde quando”.
- `payable_expenses` controla despesas e parcelas futuras.
- Pagamentos parciais devem gerar uma tabela `receivable_settlements` ligada à
  parcela e ao lançamento de caixa.
- Recibo/orçamento é HTML responsivo impresso pelo navegador para PDF. Para
  documentos fiscais, integre um provedor específico: recibo não é nota fiscal.

## Relatórios e integrações

Relatórios consultam vendas concluídas e custos congelados em `sale_items`, o que
preserva a margem histórica mesmo quando o custo muda. Exporte CSV em streaming
e JSON paginado. API keys guardam apenas hash e recebem scopes RBAC.

Consultas customizadas não devem aceitar SQL livre vindo do navegador. Use uma
DSL de métricas validada (`dimensions`, `measures`, `filters`, `period`) e
compile-a para SQL parametrizado sobre views somente leitura.

## Assistente de linguagem natural

Pipeline gratuito recomendado:

1. catálogo semântico das métricas permitidas;
2. classificador local com `sentence-transformers` pequeno ou regras/rapidfuzz;
3. geração de uma DSL JSON, nunca SQL direto;
4. validador com Pydantic, limites de período/linhas e organização obrigatória;
5. compilação parametrizada e resposta com os filtros usados.

Gemini Free Tier pode substituir apenas o passo 3, via adaptador opcional. Não
envie nomes, telefones, documentos ou dados de clientes; agregue antes. Chaves
ficam no servidor.

## Roadmap sugerido

### Fase 1 — núcleo operacional

1. autenticação, organização e RBAC;
2. produtos, unidades, fornecedores e entrada por lote;
3. venda, kits, caixa e fiado;
4. cancelamento por movimentos inversos e auditoria;
5. backup automático e restauração testada.

### Fase 2 — gestão

1. despesas/parcelas, orçamentos e recibos;
2. alertas de validade e reposição;
3. relatórios, CSV/JSON e API keys;
4. fila de jobs e webhooks assinados.

### Fase 3 — inteligência

1. DSL de métricas e dashboards salvos;
2. assistente local/Gemini opcional;
3. produção física e custo industrial;
4. sincronização offline com resolução explícita de conflitos.

## Operação sem licença paga

- FastAPI, React, PostgreSQL, SQLite e Docker/Podman são open-source.
- Para uma máquina local, use Docker Compose e Caddy para HTTPS.
- Backups: `pg_dump` diário, criptografado e copiado para outro dispositivo.
- “Gratuito” não significa custo zero: domínio, servidor público, WhatsApp/SMS e
  emissão fiscal podem ter custos. Operação local/LAN pode não ter mensalidade.

