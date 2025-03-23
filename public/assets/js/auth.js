/**
 * auth.js - Sistema de autenticação para o FEXIA
 * 
 * Este arquivo controla o sistema de login e registro de usuários.
 * Utiliza localStorage para salvar dados e sessão do usuário.
 */

// Elementos globais
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginToggle = document.getElementById('login-toggle');
const registerToggle = document.getElementById('register-toggle');

// Configuração do sistema de login
const USE_LOCALSTORAGE = true;

// Dados de usuários de exemplo (serão criados se não existirem)
const demoUsers = [
    {
        id: 1,
        username: 'admin',
        email: 'admin@fexia.com',
        password: 'admin123',
        role: 'admin',
        status: 'active',
        tokens_used: 0,
        tokens_limit: 100000,
        subscription_plan: 'premium',
        created_at: '2023-01-01T00:00:00.000Z',
        last_login: null
    },
    {
        id: 2,
        username: 'teste',
        email: 'teste@fexia.com',
        password: 'teste123',
        role: 'subscriber',
        status: 'active',
        tokens_used: 0,
        tokens_limit: 10000,
        subscription_plan: 'basic',
        created_at: '2023-01-01T00:00:00.000Z',
        last_login: null
    }
];

// Dados de chats fictícios
const demoChats = {
    2: [
        {
            id: 1,
            title: 'Conversa Exemplo 1',
            created_at: '2023-01-01T12:00:00.000Z',
            updated_at: '2023-01-01T12:30:00.000Z',
            tokens_used: 120,
            messages: [
                {
                    role: 'user',
                    content: 'Olá, como funciona o FEXIA?',
                    timestamp: '2023-01-01T12:00:00.000Z'
                },
                {
                    role: 'assistant',
                    content: 'Olá! O FEXIA é um assistente de IA personalizado que pode ajudar com diversas tarefas. Você pode fazer perguntas, pedir ajuda com textos, solicitar informações e muito mais. Como posso ajudar você hoje?',
                    timestamp: '2023-01-01T12:00:05.000Z'
                },
                {
                    role: 'user',
                    content: 'Quais são os recursos disponíveis?',
                    timestamp: '2023-01-01T12:15:00.000Z'
                },
                {
                    role: 'assistant',
                    content: 'O FEXIA oferece diversos recursos:\n\n1. Respostas a perguntas gerais\n2. Ajuda com redação e revisão de textos\n3. Sugestões e ideias criativas\n4. Assistência com planejamento\n5. Explicações sobre tópicos complexos\n\nVocê tem acesso ao plano básico, que inclui 10.000 tokens por mês. Se precisar de mais recursos, pode fazer upgrade para o plano Premium.',
                    timestamp: '2023-01-01T12:15:05.000Z'
                }
            ]
        },
        {
            id: 2,
            title: 'Dúvidas sobre tecnologia',
            created_at: '2023-01-02T14:00:00.000Z',
            updated_at: '2023-01-02T14:20:00.000Z',
            tokens_used: 85,
            messages: [
                {
                    role: 'user',
                    content: 'Qual a diferença entre inteligência artificial e machine learning?',
                    timestamp: '2023-01-02T14:00:00.000Z'
                },
                {
                    role: 'assistant',
                    content: 'Inteligência Artificial (IA) é um campo mais amplo que se refere à capacidade de máquinas simularem inteligência humana e realizarem tarefas que normalmente exigiriam inteligência humana.\n\nMachine Learning (Aprendizado de Máquina) é um subconjunto da IA que se concentra em desenvolver algoritmos que permitem aos computadores aprender a partir de dados e melhorar com a experiência, sem serem explicitamente programados para cada tarefa.\n\nDito de forma simples: toda implementação de Machine Learning é uma forma de IA, mas nem toda IA envolve Machine Learning.',
                    timestamp: '2023-01-02T14:00:10.000Z'
                }
            ]
        }
    ]
};

/**
 * Inicializa dados de demonstração se não existirem
 */
function initDemoData() {
    // Verificar se já existem usuários
    if (!localStorage.getItem('fexia_users')) {
        localStorage.setItem('fexia_users', JSON.stringify(demoUsers));
    }
    
    // Inicializar chats do usuário teste
    if (!localStorage.getItem('fexia_chats_2')) {
        localStorage.setItem('fexia_chats_2', JSON.stringify(demoChats[2]));
    }
}

/**
 * Alterna entre os formulários de login e registro
 * @param {string} form - Formulário a ser exibido ('login' ou 'register')
 */
function toggleForm(form) {
    if (form === 'login') {
        loginForm.parentElement.style.display = 'block';
        registerForm.parentElement.style.display = 'none';
    } else if (form === 'register') {
        loginForm.parentElement.style.display = 'none';
        registerForm.parentElement.style.display = 'block';
    }
}

/**
 * Exibe uma mensagem de erro
 * @param {string} message - Mensagem de erro a ser exibida
 */
function showError(message) {
    alert(message); // Simplificado para usar alert
}

/**
 * Valida os dados do formulário de registro
 * @param {object} formData - Dados do formulário a serem validados
 * @returns {boolean} - Verdadeiro se válido, falso caso contrário
 */
function validateRegisterForm(formData) {
    const username = formData.username.trim();
    const email = formData.email.trim();
    const password = formData.password;
    const confirmPassword = formData.confirmPassword;
    
    if (!username || username.length < 3) {
        showError('O nome de usuário deve ter pelo menos 3 caracteres');
        return false;
    }
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError('Email inválido');
        return false;
    }
    
    if (!password || password.length < 6) {
        showError('A senha deve ter pelo menos 6 caracteres');
        return false;
    }
    
    if (password !== confirmPassword) {
        showError('As senhas não coincidem');
        return false;
    }
    
    return true;
}

/**
 * Cria um novo usuário
 * @param {Event} e - Evento de submissão do formulário
 */
function createUser(e) {
    e.preventDefault();
    
    const formData = {
        username: document.getElementById('reg-username').value,
        email: document.getElementById('reg-email').value,
        password: document.getElementById('reg-password').value,
        confirmPassword: document.getElementById('reg-confirm-password').value
    };
    
    // Validar formulário
    if (!validateRegisterForm(formData)) {
        return;
    }
    
    // Buscar usuários existentes
    const users = JSON.parse(localStorage.getItem('fexia_users')) || [];
    
    // Verificar se o usuário já existe
    const userExists = users.some(user => 
        user.username === formData.username || 
        user.email === formData.email
    );
    
    if (userExists) {
        showError('Nome de usuário ou email já existente');
        return;
    }
    
    // Criar novo usuário
    const newUser = {
        id: Date.now(),
        username: formData.username,
        email: formData.email,
        password: formData.password,
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
    
    // Criar chats vazios para o novo usuário
    localStorage.setItem(`fexia_chats_${newUser.id}`, JSON.stringify([]));
    
    alert('Usuário criado com sucesso! Faça login para continuar.');
    toggleForm('login');
}

/**
 * Realiza a autenticação do usuário
 * @param {Event} e - Evento de submissão do formulário
 */
function authenticateUser(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showError('Preencha todos os campos');
        return;
    }
    
    // Buscar usuários
    const users = JSON.parse(localStorage.getItem('fexia_users')) || [];
    
    // Procurar usuário com credenciais correspondentes
    const user = users.find(u => 
        u.username === username && 
        u.password === password && 
        u.status === 'active'
    );
    
    if (user) {
        // Atualizar último login
        user.last_login = new Date().toISOString();
        localStorage.setItem('fexia_users', JSON.stringify(users));
        
        // Salvar usuário atual sem a senha
        const userData = { ...user };
        delete userData.password;
        localStorage.setItem('fexia_current_user', JSON.stringify(userData));
        
        // Redirecionar conforme o papel do usuário
        if (userData.role === 'admin') {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'chat.html';
        }
    } else {
        showError('Credenciais inválidas');
    }
}

/**
 * Realiza logout do usuário
 */
function logout() {
    localStorage.removeItem('fexia_current_user');
    localStorage.removeItem('fexia_current_chat');
    window.location.href = 'index.html';
}

// Inicializar eventos quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar dados de demonstração
    initDemoData();
    
    // Configurar alternância entre formulários
    if (registerToggle) {
        registerToggle.addEventListener('click', function(e) {
            e.preventDefault();
            toggleForm('register');
        });
    }
    
    if (loginToggle) {
        loginToggle.addEventListener('click', function(e) {
            e.preventDefault();
            toggleForm('login');
        });
    }
    
    // Configurar envio de formulários
    if (loginForm) {
        loginForm.addEventListener('submit', authenticateUser);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', createUser);
    }
}); 