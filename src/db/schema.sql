-- Esquema do banco de dados SQLite para o FEXIA
-- Este arquivo contém a estrutura do banco de dados que pode ser implementada posteriormente

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL, -- Em produção, armazenar apenas hash e salt
    role TEXT NOT NULL DEFAULT 'subscriber', -- 'admin' ou 'subscriber'
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'suspended'
    subscription_plan TEXT DEFAULT 'basic', -- 'basic', 'standard', 'premium'
    subscription_start DATE,
    subscription_end DATE,
    tokens_used INTEGER DEFAULT 0,
    tokens_limit INTEGER DEFAULT 100000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    created_by INTEGER -- ID do admin que criou este usuário (NULL para o admin principal)
);

-- Tabela de chats
CREATE TABLE IF NOT EXISTS chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabela de mensagens
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    role TEXT NOT NULL, -- 'user' ou 'assistant'
    content TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
);

-- Tabela de configurações do usuário
CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER PRIMARY KEY,
    theme TEXT DEFAULT 'dark',
    language TEXT DEFAULT 'pt-BR',
    notification_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabela de tokens de uso mensal
CREATE TABLE IF NOT EXISTS usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    month INTEGER NOT NULL, -- mês (1-12)
    year INTEGER NOT NULL, -- ano (ex: 2023)
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Índices para melhorar o desempenho
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_month_year ON usage_logs(month, year);

-- Dados de exemplo (opcional)
-- Inserir um usuário admin
INSERT OR IGNORE INTO users (id, username, email, password, role, tokens_limit) 
VALUES (1, 'admin', 'admin@exemplo.com', 'admin123', 'admin', 1000000);

-- Inserir usuários assinantes de exemplo
INSERT OR IGNORE INTO users (username, email, password, role, subscription_plan, tokens_limit, created_by)
VALUES ('assinante1', 'assinante1@exemplo.com', 'senha123', 'subscriber', 'basic', 100000, 1);

INSERT OR IGNORE INTO users (username, email, password, role, subscription_plan, tokens_limit, created_by)
VALUES ('assinante2', 'assinante2@exemplo.com', 'senha123', 'subscriber', 'standard', 200000, 1);

INSERT OR IGNORE INTO users (username, email, password, role, subscription_plan, tokens_limit, created_by)
VALUES ('assinante3', 'assinante3@exemplo.com', 'senha123', 'subscriber', 'premium', 500000, 1);

-- Inserir um chat de exemplo
INSERT OR IGNORE INTO chats (user_id, title)
SELECT id, 'Meu primeiro chat' FROM users WHERE username = 'assinante1' LIMIT 1;

-- Inserir algumas mensagens de exemplo com contagem de tokens
INSERT OR IGNORE INTO messages (chat_id, role, content, tokens_used)
SELECT c.id, 'user', 'Olá, como você está?', 10
FROM chats c 
JOIN users u ON c.user_id = u.id 
WHERE u.username = 'assinante1' 
LIMIT 1;

INSERT OR IGNORE INTO messages (chat_id, role, content, tokens_used)
SELECT c.id, 'assistant', 'Olá! Estou bem, obrigado por perguntar. Como posso ajudar você hoje?', 25
FROM chats c 
JOIN users u ON c.user_id = u.id 
WHERE u.username = 'assinante1' 
LIMIT 1;

-- Inserir configurações para os usuários
INSERT OR IGNORE INTO user_settings (user_id, theme, language)
SELECT id, 'dark', 'pt-BR' FROM users WHERE username = 'admin';

INSERT OR IGNORE INTO user_settings (user_id, theme, language)
SELECT id, 'dark', 'pt-BR' FROM users WHERE username = 'assinante1';

-- Inserir registros de uso para exemplo
INSERT OR IGNORE INTO usage_logs (user_id, month, year, tokens_used)
SELECT id, strftime('%m', 'now'), strftime('%Y', 'now'), 35 FROM users WHERE username = 'assinante1';

-- Atualizar contagem de tokens usados para o usuário
UPDATE users 
SET tokens_used = (
    SELECT SUM(tokens_used) 
    FROM messages m 
    JOIN chats c ON m.chat_id = c.id 
    WHERE c.user_id = users.id
)
WHERE username = 'assinante1'; 