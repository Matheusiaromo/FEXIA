/**
 * api.js - Funções para simulação de API com localStorage
 * 
 * Este arquivo contém funções para simular interações com uma API
 * usando localStorage para persistência de dados
 */

// Classe principal para simulação de API
class LocalStorageAPI {
    constructor() {
        this.authAPI = new AuthAPI();
        this.userAPI = new UserAPI();
        this.chatAPI = new ChatAPI();
        this.statsAPI = new StatsAPI();
    }
}

// API para autenticação
class AuthAPI {
    /**
     * Autenticar usuário
     * 
     * @param {string} username - Nome de usuário
     * @param {string} password - Senha
     * @returns {Promise} - Promise com os dados do usuário
     */
    async login(username, password) {
        return new Promise((resolve) => {
            // Simular delay de rede
            setTimeout(() => {
                // Buscar usuários
                const users = JSON.parse(localStorage.getItem('fexia_users')) || [];
                
                // Encontrar usuário com credenciais correspondentes
                const user = users.find(u => 
                    u.username === username && 
                    u.password === password && 
                    u.status === 'active'
                );
                
                if (user) {
                    // Atualizar último login
                    user.last_login = new Date().toISOString();
                    localStorage.setItem('fexia_users', JSON.stringify(users));
                    
                    // Remover senha antes de retornar
                    const userData = { ...user };
                    delete userData.password;
                    
                    resolve({
                        success: true,
                        user: userData
                    });
                } else {
                    resolve({
                        success: false,
                        error: 'Credenciais inválidas'
                    });
                }
            }, 300);
        });
    }
    
    /**
     * Registrar novo usuário
     * 
     * @param {object} userData - Dados do usuário
     * @returns {Promise} - Promise com resultado do registro
     */
    async register(userData) {
        return new Promise((resolve) => {
            // Simular delay de rede
            setTimeout(() => {
                // Validar dados
                if (!userData.username || !userData.email || !userData.password) {
                    resolve({
                        success: false,
                        error: 'Dados incompletos'
                    });
                    return;
                }
                
                // Buscar usuários existentes
                const users = JSON.parse(localStorage.getItem('fexia_users')) || [];
                
                // Verificar se o usuário já existe
                const userExists = users.some(user => 
                    user.username === userData.username || 
                    user.email === userData.email
                );
                
                if (userExists) {
                    resolve({
                        success: false,
                        error: 'Nome de usuário ou email já existente'
                    });
                    return;
                }
                
                // Criar novo usuário
                const newUser = {
                    id: Date.now(),
                    username: userData.username,
                    email: userData.email,
                    password: userData.password,
                    role: 'subscriber',
                    status: 'active',
                    tokens_used: 0,
                    tokens_limit: 10000,
                    subscription_plan: 'basic',
                    created_at: new Date().toISOString(),
                    last_login: null
                };
                
                // Adicionar à lista de usuários
                users.push(newUser);
                localStorage.setItem('fexia_users', JSON.stringify(users));
                
                // Criar armazenamento para chats
                localStorage.setItem(`fexia_chats_${newUser.id}`, JSON.stringify([]));
                
                resolve({
                    success: true,
                    user_id: newUser.id
                });
            }, 300);
        });
    }
}

// API para gerenciar usuários
class UserAPI {
    /**
     * Obter todos os usuários (admin)
     * 
     * @returns {Promise} - Promise com a lista de usuários
     */
    async getAllUsers() {
        return new Promise((resolve) => {
            setTimeout(() => {
                const users = JSON.parse(localStorage.getItem('fexia_users')) || [];
                
                // Remover senhas
                const safeUsers = users.map(user => {
                    const { password, ...userData } = user;
                    return userData;
                });
                
                resolve({
                    success: true,
                    users: safeUsers
                });
            }, 300);
        });
    }
    
    /**
     * Obter usuário por ID
     * 
     * @param {number} userId - ID do usuário
     * @returns {Promise} - Promise com os dados do usuário
     */
    async getUserById(userId) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const users = JSON.parse(localStorage.getItem('fexia_users')) || [];
                const user = users.find(u => u.id === userId);
                
                if (user) {
                    // Remover senha
                    const { password, ...userData } = user;
                    
                    resolve({
                        success: true,
                        user: userData
                    });
                } else {
                    resolve({
                        success: false,
                        error: 'Usuário não encontrado'
                    });
                }
            }, 300);
        });
    }
    
    /**
     * Atualizar perfil do usuário
     * 
     * @param {number} userId - ID do usuário
     * @param {object} userData - Novos dados do usuário
     * @returns {Promise} - Promise com resultado da atualização
     */
    async updateProfile(userId, userData) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const users = JSON.parse(localStorage.getItem('fexia_users')) || [];
                const userIndex = users.findIndex(u => u.id === userId);
                
                if (userIndex === -1) {
                    resolve({
                        success: false,
                        error: 'Usuário não encontrado'
                    });
                    return;
                }
                
                // Atualizar dados do usuário (exceto campos protegidos)
                const updatedUser = { ...users[userIndex] };
                
                if (userData.username) updatedUser.username = userData.username;
                if (userData.email) updatedUser.email = userData.email;
                if (userData.password) updatedUser.password = userData.password;
                
                // Salvar alterações
                users[userIndex] = updatedUser;
                localStorage.setItem('fexia_users', JSON.stringify(users));
                
                // Remover senha antes de retornar
                const { password, ...safeUser } = updatedUser;
                
                resolve({
                    success: true,
                    user: safeUser
                });
            }, 300);
        });
    }
}

// API para gerenciar chats
class ChatAPI {
    /**
     * Obter chats do usuário
     * 
     * @param {number} userId - ID do usuário
     * @returns {Promise} - Promise com a lista de chats
     */
    async getUserChats(userId) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const chats = JSON.parse(localStorage.getItem(`fexia_chats_${userId}`)) || [];
                
                resolve({
                    success: true,
                    chats: chats
                });
            }, 300);
        });
    }
}

// API para estatísticas (apenas simulação)
class StatsAPI {
    /**
     * Obter estatísticas do sistema (admin)
     * 
     * @returns {Promise} - Promise com as estatísticas
     */
    async getSystemStats() {
        return new Promise((resolve) => {
            setTimeout(() => {
                const users = JSON.parse(localStorage.getItem('fexia_users')) || [];
                
                // Calcular estatísticas
                const stats = {
                    total_users: users.length,
                    active_users: users.filter(u => u.status === 'active').length,
                    total_tokens: users.reduce((sum, user) => sum + (user.tokens_used || 0), 0),
                    premium_users: users.filter(u => u.subscription_plan !== 'basic').length
                };
                
                resolve({
                    success: true,
                    stats: stats
                });
            }, 300);
        });
    }
}

// Criar e exportar instância da API
const api = new LocalStorageAPI(); 