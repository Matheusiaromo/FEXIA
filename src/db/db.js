/**
 * Módulo para gerenciar as operações de banco de dados SQLite para o FEXIA
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Caminho para o banco de dados
const dbPath = path.join(__dirname, 'chatgpt.db');

// Verificar se o diretório existe
if (!fs.existsSync(__dirname)) {
    fs.mkdirSync(__dirname, { recursive: true });
}

// Criar conexão com o banco de dados
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao abrir banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
        
        // Habilitar chaves estrangeiras
        db.run('PRAGMA foreign_keys = ON');
    }
});

/**
 * Funções para gerenciar usuários
 */

// Obter todos os usuários
function getAllUsers() {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM users', [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// Obter usuário por ID
function getUserById(id) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

// Obter usuário por nome de usuário
function getUserByUsername(username) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

// Criar um novo usuário
function createUser(userData) {
    return new Promise((resolve, reject) => {
        const { username, email, password, role = 'subscriber', status = 'active', subscription_plan = 'basic', tokens_limit = 5000 } = userData;
        
        const query = `
            INSERT INTO users (username, email, password, role, status, subscription_plan, tokens_limit, tokens_used, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))
        `;
        
        db.run(query, [username, email, password, role, status, subscription_plan, tokens_limit], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({
                    id: this.lastID,
                    username,
                    email,
                    role,
                    status,
                    subscription_plan,
                    tokens_used: 0,
                    tokens_limit
                });
            }
        });
    });
}

// Atualizar um usuário
function updateUser(id, userData) {
    return new Promise((resolve, reject) => {
        const fields = [];
        const values = [];
        
        for (const [key, value] of Object.entries(userData)) {
            if (value !== undefined && key !== 'id') {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }
        
        if (fields.length === 0) {
            resolve(null);
            return;
        }
        
        // Adicionar ID para a cláusula WHERE
        values.push(id);
        
        const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
        
        db.run(query, values, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ id, ...userData });
            }
        });
    });
}

// Excluir um usuário
function deleteUser(id) {
    return new Promise((resolve, reject) => {
        db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ deleted: this.changes > 0 });
            }
        });
    });
}

// Autenticar usuário
function authenticateUser(username, password) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, row) => {
            if (err) {
                reject(err);
            } else if (!row) {
                resolve({ success: false, message: 'Credenciais inválidas' });
            } else if (row.status !== 'active') {
                resolve({ success: false, message: 'Usuário inativo ou suspenso' });
            } else {
                // Atualizar último login
                db.run('UPDATE users SET last_login = datetime("now") WHERE id = ?', [row.id]);
                
                resolve({
                    success: true,
                    user: {
                        id: row.id,
                        username: row.username,
                        email: row.email,
                        role: row.role,
                        status: row.status,
                        subscription_plan: row.subscription_plan,
                        tokens_used: row.tokens_used,
                        tokens_limit: row.tokens_limit
                    }
                });
            }
        });
    });
}

// Atualizar tokens utilizados
function updateTokensUsed(userId, tokensToAdd) {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE users SET tokens_used = tokens_used + ? WHERE id = ?',
            [tokensToAdd, userId],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ updated: this.changes > 0, tokens_added: tokensToAdd });
                }
            }
        );
    });
}

// Verificar se o usuário atingiu o limite de tokens
function checkTokenLimit(userId) {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT tokens_used, tokens_limit FROM users WHERE id = ?',
            [userId],
            (err, row) => {
                if (err) {
                    reject(err);
                } else if (!row) {
                    resolve({ valid: false, message: 'Usuário não encontrado' });
                } else {
                    const hasReachedLimit = row.tokens_used >= row.tokens_limit;
                    resolve({
                        valid: !hasReachedLimit,
                        message: hasReachedLimit ? 'Limite de tokens atingido' : 'OK',
                        tokens_used: row.tokens_used,
                        tokens_limit: row.tokens_limit,
                        tokens_available: Math.max(0, row.tokens_limit - row.tokens_used)
                    });
                }
            }
        );
    });
}

// Zerar contagem de tokens de todos os usuários
function resetAllTokensUsed() {
    return new Promise((resolve, reject) => {
        db.run('UPDATE users SET tokens_used = 0', function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ updated: this.changes, message: 'Tokens zerados com sucesso.' });
            }
        });
    });
}

/**
 * Funções para gerenciar chats
 */

// Obter todos os chats de um usuário
function getUserChats(userId) {
    return new Promise((resolve, reject) => {
        db.all(
            'SELECT * FROM chats WHERE user_id = ? ORDER BY updated_at DESC', 
            [userId], 
            (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            }
        );
    });
}

// Obter um chat específico
function getChatById(chatId) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM chats WHERE id = ?', [chatId], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

// Criar um novo chat
function createChat(userId, title = 'Novo Chat') {
    return new Promise((resolve, reject) => {
        const query = `
            INSERT INTO chats (user_id, title, created_at, updated_at)
            VALUES (?, ?, datetime('now'), datetime('now'))
        `;
        
        db.run(query, [userId, title], function(err) {
            if (err) {
                reject(err);
            } else {
                const chatId = this.lastID;
                resolve({
                    id: chatId,
                    user_id: userId,
                    title,
                    tokens_used: 0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            }
        });
    });
}

// Atualizar um chat
function updateChat(chatId, data) {
    return new Promise((resolve, reject) => {
        const fields = [];
        const values = [];
        
        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined && key !== 'id' && key !== 'user_id') {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }
        
        // Adicionar updated_at
        fields.push('updated_at = datetime("now")');
        
        // Adicionar chatId para a cláusula WHERE
        values.push(chatId);
        
        const query = `UPDATE chats SET ${fields.join(', ')} WHERE id = ?`;
        
        db.run(query, values, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ id: chatId, ...data, updated: this.changes > 0 });
            }
        });
    });
}

// Excluir um chat
function deleteChat(chatId) {
    return new Promise((resolve, reject) => {
        db.run('DELETE FROM chats WHERE id = ?', [chatId], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ deleted: this.changes > 0 });
            }
        });
    });
}

/**
 * Funções para gerenciar mensagens
 */

// Obter todas as mensagens de um chat
function getChatMessages(chatId) {
    return new Promise((resolve, reject) => {
        db.all(
            'SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at',
            [chatId],
            (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            }
        );
    });
}

// Adicionar uma mensagem a um chat
function addMessage(chatId, role, content, tokensUsed = 0) {
    return new Promise((resolve, reject) => {
        const query = `
            INSERT INTO messages (chat_id, role, content, tokens_used, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))
        `;
        
        db.run(query, [chatId, role, content, tokensUsed], function(err) {
            if (err) {
                reject(err);
            } else {
                // Atualizar a data de atualização do chat
                db.run('UPDATE chats SET updated_at = datetime("now"), tokens_used = tokens_used + ? WHERE id = ?', [tokensUsed, chatId]);
                
                resolve({
                    id: this.lastID,
                    chat_id: chatId,
                    role,
                    content,
                    tokens_used: tokensUsed,
                    created_at: new Date().toISOString()
                });
            }
        });
    });
}

/**
 * Funções para gerenciar logs de uso
 */

// Registrar uso de tokens
function logTokenUsage(userId, tokensUsed) {
    return new Promise((resolve, reject) => {
        const now = new Date();
        const month = now.getMonth() + 1; // 1-12
        const year = now.getFullYear();
        
        // Verificar se já existe um registro para este mês/ano
        db.get(
            'SELECT id, tokens_used FROM usage_logs WHERE user_id = ? AND month = ? AND year = ?',
            [userId, month, year],
            (err, row) => {
                if (err) {
                    reject(err);
                } else if (row) {
                    // Atualizar registro existente
                    db.run(
                        'UPDATE usage_logs SET tokens_used = tokens_used + ?, updated_at = datetime("now") WHERE id = ?',
                        [tokensUsed, row.id],
                        function(err) {
                            if (err) {
                                reject(err);
                            } else {
                                resolve({
                                    id: row.id,
                                    user_id: userId,
                                    month,
                                    year,
                                    tokens_used: row.tokens_used + tokensUsed
                                });
                            }
                        }
                    );
                } else {
                    // Criar novo registro
                    db.run(
                        'INSERT INTO usage_logs (user_id, month, year, tokens_used, created_at, updated_at) VALUES (?, ?, ?, ?, datetime("now"), datetime("now"))',
                        [userId, month, year, tokensUsed],
                        function(err) {
                            if (err) {
                                reject(err);
                            } else {
                                resolve({
                                    id: this.lastID,
                                    user_id: userId,
                                    month,
                                    year,
                                    tokens_used: tokensUsed
                                });
                            }
                        }
                    );
                }
            }
        );
    });
}

// Obter logs de uso para um usuário
function getUserUsageLogs(userId) {
    return new Promise((resolve, reject) => {
        db.all(
            'SELECT * FROM usage_logs WHERE user_id = ? ORDER BY year DESC, month DESC',
            [userId],
            (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            }
        );
    });
}

// Exportar todas as funções
module.exports = {
    getAllUsers,
    getUserById,
    getUserByUsername,
    createUser,
    updateUser,
    deleteUser,
    authenticateUser,
    updateTokensUsed,
    checkTokenLimit,
    resetAllTokensUsed,
    getUserChats,
    getChatById,
    createChat,
    updateChat,
    deleteChat,
    getChatMessages,
    addMessage,
    logTokenUsage,
    getUserUsageLogs
}; 