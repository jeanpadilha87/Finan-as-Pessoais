# Finanças Pessoais

Aplicação web para registrar receitas e despesas, acompanhar o saldo e organizar contas familiares com controle parental.

## Tecnologias

- Frontend: React e Vite.
- Backend: Node.js, Express e Sequelize.
- Banco de dados: MySQL ou MariaDB.

## Como executar localmente

Requisitos: Node.js 20.19+ ou 22.12+, npm e MySQL/MariaDB.

### Backend

Crie o banco `personal_finances` e configure as credenciais no arquivo `.env`:

```powershell
cd "Back\Sistema-de-Despesas-Pessoais-Node.js-"
Copy-Item .env.example .env
```

Instale dependências, prepare o banco e inicie a API:

```powershell
npm install
npm run db:migrate
npm run db:seed
npm run start
```

A API ficará disponível em `http://localhost:3000`.

### Frontend

Em outro terminal, na raiz do projeto:

```powershell
cd "Front\Sistema-de-Despesas-Pessoais-FrontEnd"
Copy-Item .env.example .env
npm install
npm run dev
```

Abra `http://localhost:5173` e crie uma conta.

## Segurança

O sistema utiliza ORM e validação de dados para reduzir riscos de SQL Injection e mass assignment; renderização segura e proteção CSRF para reduzir riscos de XSS e CSRF; autenticação com senhas protegidas e sessões controladas; e autorização por conta para proteger os dados financeiros e recibos.
