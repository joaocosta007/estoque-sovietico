# Estoque Soviético

Base open-source, mobile-first, para estoque, vendas, financeiro e clientes.
O repositório contém uma PWA em React e uma API FastAPI transacional.

## Começo rápido

### 1. Banco PostgreSQL

```bash
docker compose up -d db
psql postgresql://estoque:estoque@localhost:5432/estoque -f database/schema.sql
```

Para desenvolvimento simples, a API usa `sqlite:///./estoque.db` quando
`ESTOQUE_DATABASE_URL` não estiver definido. O SQLite é adequado para uma única
instância/loja; use PostgreSQL quando houver mais de um operador simultâneo.

### 2. API

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
uvicorn app.main:app --reload
```

Documentação interativa: `http://localhost:8000/docs`.

### 3. PWA

```bash
npm install
npm run dev
```

Abra a URL exibida pelo servidor. A câmera precisa de HTTPS ou `localhost`.

### 4. Testes

```bash
cd backend
pytest
```

## Estrutura

```text
app/                    PWA React mobile-first
backend/app/main.py     rotas FastAPI
backend/app/models.py   modelos usados pelo vertical slice
backend/app/services/   regras transacionais
backend/tests/          testes de venda e rollback
database/schema.sql     esquema PostgreSQL completo
docs/ARCHITECTURE.md    decisões, módulos e roadmap
docker-compose.yml      PostgreSQL local
```

O endpoint funcional `POST /api/v1/sales` está em
`backend/app/main.py`; sua transação de venda, kit, estoque FIFO, caixa e fiado
está em `backend/app/services/sales.py`.

## Estado da versão publicada

A PWA publicada usa uma base SQLite/D1 privada e começa sem dados. Este primeiro
incremento operacional já permite:

- cadastrar, editar e arquivar produtos;
- definir preço, saldo inicial e estoque mínimo;
- registrar entradas de mercadoria;
- registrar vendas e baixar o estoque transacionalmente;
- consultar faturamento e vendas recentes no painel.

O FastAPI/PostgreSQL continua no repositório como backend-alvo para os módulos
mais avançados. Clientes, fiado, despesas, RBAC, kits e relatórios ainda serão
conectados à interface em incrementos posteriores.

## Exemplo de venda

```bash
curl -X POST http://localhost:8000/api/v1/sales \
  -H 'Content-Type: application/json' \
  -H 'X-Organization-Id: UUID_DA_LOJA' \
  -H 'X-Operator-Id: UUID_DO_OPERADOR' \
  -H 'X-Permissions: sales.create' \
  -d '{
    "customer_id": null,
    "discount": "0.00",
    "items": [{"product_id": "UUID_DO_PRODUTO", "quantity": "2"}],
    "payments": [{"method": "pix", "amount": "59.80"}]
  }'
```

Os headers simulam o contexto de um JWT nesta base inicial. Antes de produção,
troque-os por autenticação com hash Argon2id, JWT curto e refresh token rotativo.
