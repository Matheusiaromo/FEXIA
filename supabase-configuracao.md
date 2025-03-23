# Configuração do Supabase para o Projeto FEXIA

Este guia contém instruções para configurar o Supabase para o projeto FEXIA.

## Passo 1: Criar Conta e Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta ou faça login
2. Crie um novo projeto, dando um nome (ex: "FEXIA")
3. Anote a URL do projeto e a chave anon (pública)

## Passo 2: Configurar o Banco de Dados

1. No dashboard do Supabase, vá para a seção "SQL Editor"
2. Crie uma "Nova Query"
3. Cole o conteúdo do arquivo `supabase-setup.sql` no editor
4. Execute o script clicando em "Run"

## Passo 3: Configurar Autenticação

1. No dashboard do Supabase, vá para "Authentication" > "Providers"
2. Verifique se o provider "Email" está habilitado
3. Se desejar desativar a confirmação de email (para testes):
   - Vá para "Authentication" > "Providers" > "Email"
   - Desative a opção "Confirm email"

## Passo 4: Configurar o Projeto FEXIA

1. Abra o arquivo `public/assets/js/auth-supabase.js`
2. Substitua as variáveis SUPABASE_URL e SUPABASE_KEY pelos valores corretos:

```javascript
const SUPABASE_URL = 'https://seu-projeto.supabase.co';
const SUPABASE_KEY = 'sua-chave-anon-publica';
```

## Passo 5: Testar o Login/Registro

1. Acesse sua aplicação FEXIA (index.html)
2. Crie uma nova conta para testar o registro
3. Faça login com a conta criada

## Informações Adicionais

### Ambiente de Desenvolvimento

Para testar localmente:
- Use uma extensão como "Live Server" no VSCode
- Ou inicie um servidor local com Python: `python -m http.server`

### Estrutura do Banco de Dados

- **profiles**: Armazena informações de perfil do usuário
- **chats**: Armazena as conversas dos usuários
- **messages**: Armazena as mensagens individuais de cada chat

### Manipulação de Autenticação

O arquivo `auth-supabase.js` fornece:
- Registro de usuários
- Login
- Logout
- Verificação de estado de autenticação

### Sugestões para Produção

1. Habilite a confirmação de email
2. Configure CORS para seu domínio
3. Considere adicionar autenticação social (Google, Facebook, etc.)
4. Implemente controle de acesso RLS (Row Level Security)
5. Configure backups regulares do banco de dados 