# Personal Finance Tracker

Aplicativo full-stack para controle de finanças pessoais com foco em isolamento de dados por usuário, i18n (pt-BR), e experiência SPA (React + Vite) servida por um servidor Express.

## Visão Geral
- Frontend: React 18, React Router, React Query, Vite, Tailwind/Shadcn-UI.
- Backend: Node/Express, Drizzle ORM (MySQL), JWT auth, Zod.
- Roteamento SPA: fallback configurado tanto em desenvolvimento quanto produção.
- Cache: limpeza automática do React Query em login/logout para evitar dados de sessões anteriores.
- Recursos removidos: "Criar dados de exemplo" (Initialize Data) removido para evitar vazamento de dados entre usuários.

## Requisitos
- Node.js 18+ (recomendado)
- MySQL 8+ (ou compatível)
- NPM 9+ (recomendado)

## Variáveis de Ambiente (.env)
Crie um arquivo `.env` na raiz do projeto com, por exemplo:

```
# Servidor
PORT=3001
NODE_ENV=development
JWT_SECRET=uma_chave_segura_aqui

# Banco de dados (mysql2)
DB_HOST=localhost
DB_PORT=3306
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_DATABASE=personal_finance
```

Observações:
- JWT_SECRET é obrigatório para autenticação.
- Ajuste as credenciais do MySQL conforme seu ambiente.

## Scripts NPM

- Desenvolvimento (frontend+backend):
```
npm run dev
```
  - Sobe Vite e o servidor Express em paralelo.

- Somente servidor em dev:
```
npm run dev:server
```

- Somente client (Vite):
```
npm run dev:client
```

- Build de produção (client + server):
```
npm run build
```
Saídas:
- `client/dist/`: build da SPA.
- `dist/index.js`: bundle do servidor.

- Iniciar em produção:
```
npm start
```
Servidor em: `http://localhost:${PORT}` (padrão 3001).

## Fluxo de Autenticação
- Apenas login real por email e senha.
- Tokens antigos de demo não são aceitos.
- Após login/logout o cache do React Query é limpo para evitar mostrar dados de outro usuário.

## Rotas Principais (SPA)
- `/login`, `/register`
- `/dashboard`
- `/expenses`, `/income`
- `/investments`, `/goals`, `/alerts`, `/reports`

Atenção: em produção e desenvolvimento, acessar rotas internas diretamente (ex.: `/dashboard`) deve retornar a SPA (sem 404). O projeto já está configurado com fallback adequado.

## Recursos Removidos
- Página e rota `/initialize-data` foram removidas.
- Qualquer lógica de seed/setup manual foi desativada/removida do backend (`server/routes.ts` não monta mais rotas de init/admin).

## Migrações e Schema (Drizzle)
- Geração: `npm run db:generate`
- Aplicar alterações: `npm run db:push` ou `npm run db:migrate`
- Em casos raros, pode ser necessário aplicar SQL manualmente se o `drizzle-kit` reportar sucesso mas o banco não refletir mudanças.

## Solução de Problemas
- 404 em rotas internas da SPA:
  - Garanta que o servidor está em execução e a variável `NODE_ENV` esteja correta.
  - Em dev, o Vite precisa estar ativo (via `npm run dev`).
  - Em prod, certifique-se que o build foi gerado (`npm run build`) e que o `npm start` está servindo `client/dist` com fallback.

- Erros 500 em /api/*:
  - Verifique o schema do Drizzle e o estado do banco (migrações aplicadas).
  - Confira logs do servidor para mensagens detalhadas (há logging adicional em operações sensíveis como registro e metas).

- Datas inválidas (400/500):
  - O backend usa Zod com `z.coerce.date()` para converter strings ISO em `Date` (ajustado para transações e metas). Envie datas em ISO (YYYY-MM-DD) quando possível.

## Notas de Arquitetura
- `server/storage.ts` é a implementação ativa do acesso a dados. Versões antigas foram movidas para `server/legacy/`.
- `server/index.ts` registra as rotas e serve a SPA. Em produção, a pasta `client/dist/` é servida.
- `client/src/App.tsx` contém a configuração de rotas do React Router.

## Checklist de Verificação Rápida
- [ ] `.env` preenchido (JWT_SECRET e DB_*).
- [ ] Banco disponível e migrado (drizzle-kit ok).
- [ ] `npm run dev` funciona (GET / responde 200, SPA carrega).
- [ ] `npm run build` + `npm start` funciona (GET / e rotas internas retornam 200).
- [ ] Login com email/senha válido leva direto ao `/dashboard`.
- [ ] Troca de usuário não exibe dados antigos (cache limpo).

## Licença
MIT
