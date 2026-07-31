# Estoque Soviético

PWA mobile-first para estoque, vendas, clientes, fiado, caixa e catálogo
público. A aplicação principal usa Next.js, PostgreSQL e Drizzle ORM e está
preparada para deploy na Vercel.

## Tecnologias

- Next.js 16 com App Router
- React 19 e Tailwind CSS
- PostgreSQL
- Drizzle ORM e Drizzle Kit
- Sessão administrativa assinada em cookie `HttpOnly`

## Configuração local

### 1. Instale as dependências

```bash
npm install
```

### 2. Configure o ambiente

Copie `.env.example` para `.env.local` e preencha:

```dotenv
DATABASE_URL=postgresql://usuario:senha@host:5432/banco
AUTH_SECRET=uma-chave-aleatoria-com-pelo-menos-32-caracteres
ADMIN_EMAIL=admin@exemplo.com
ADMIN_PASSWORD_HASH=scrypt:...
```

Gere o hash da senha administrativa:

```bash
npm run auth:hash -- "uma-senha-forte"
```

Copie o valor exibido para `ADMIN_PASSWORD_HASH`.

### 3. Crie as tabelas

```bash
npm run db:migrate
```

A migração PostgreSQL inicial fica em `drizzle-postgres/`.

### 4. Execute

```bash
npm run dev
```

- Painel administrativo: `http://localhost:3000`
- Login: `http://localhost:3000/login`
- Catálogo público: `http://localhost:3000/catalogo`

## Deploy na Vercel

1. Importe o repositório no painel da Vercel.
2. Selecione o preset Next.js.
3. Conecte um PostgreSQL pelo Marketplace, como Neon ou Supabase.
4. Cadastre `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_EMAIL` e
   `ADMIN_PASSWORD_HASH` em Production, Preview e Development.
5. Baixe as variáveis e aplique as tabelas:

   ```bash
   npx vercel env pull .env.local --environment=production
   npm run db:migrate
   ```

6. Faça um novo deployment.

Não use `npm run db:generate` no deploy para aplicar tabelas. O comando gera
arquivos; quem aplica as migrações é `npm run db:migrate`.

## Segurança

As páginas administrativas e APIs internas exigem uma sessão válida. Permanecem
públicos apenas:

- `/login`
- `/catalogo`
- `/api/catalog`
- `/api/catalog-settings`

O catálogo não retorna custo, fornecedor, SKU, código de barras ou saldo exato.

## Hospedagem anterior

A configuração do antigo deployment Cloudflare/Sites foi preservada apenas
como referência em `docs/sites-hosting.json`. O site já publicado não é
removido por esta conversão, mas novos builds deste branch usam Next.js e
PostgreSQL.

## Backend FastAPI

O diretório `backend/` contém a arquitetura FastAPI original e permanece como
referência separada. O PWA implantável na Vercel usa as rotas do App Router em
`app/api/`.
