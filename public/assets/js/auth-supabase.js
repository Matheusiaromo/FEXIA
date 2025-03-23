/**
 * auth-supabase.js - Sistema de autenticação para o FEXIA com Supabase
 * 
 * Este arquivo controla o sistema de login e registro de usuários usando Supabase.
 */

// Configuração do Supabase - SUBSTITUA PELOS SEUS VALORES
const SUPABASE_URL = 'https://olfqmikvuhsahjlitkzn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sZnFtaWt2dWhzYWhqbGl0a3puIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3NjkwNzcsImV4cCI6MjA1ODM0NTA3N30.yUkovgoNIBiXN8ZCZCgJ7ZFvuAooVKTzaKxxcNAoVt0';

// Inicializa o cliente Supabase
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Elementos globais
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginToggle = document.getElementById('login-toggle');
const registerToggle = document.getElementById('register-toggle');

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
 * Cria um novo usuário via Supabase
 * @param {Event} e - Evento de submissão do formulário
 */
async function createUser(e) {
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
    
    try {
        // Registrar usuário no Supabase Auth
        const { data, error } = await supabaseClient.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
                data: {
                    username: formData.username,
                }
            }
        });
        
        if (error) {
            showError('Erro ao criar conta: ' + error.message);
            return;
        }
        
        // Verificar se foi enviado email de confirmação
        if (data?.user?.identities?.length === 0) {
            showError('Este email já está registrado. Verifique sua caixa de entrada para confirmar seu cadastro ou tente outro email.');
            return;
        }
        
        alert('Usuário criado com sucesso! Verifique seu email para confirmar seu cadastro.');
        toggleForm('login');
        
    } catch (err) {
        showError('Erro ao criar usuário: ' + err.message);
    }
}

/**
 * Realiza a autenticação do usuário via Supabase
 * @param {Event} e - Evento de submissão do formulário
 */
async function authenticateUser(e) {
    e.preventDefault();
    
    const email = document.getElementById('username').value; // Usamos o campo de "username" para email
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showError('Preencha todos os campos');
        return;
    }
    
    try {
        // Autenticar usuário no Supabase
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            showError('Credenciais inválidas: ' + error.message);
            return;
        }
        
        // Obter dados do perfil do usuário
        const { data: profileData, error: profileError } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();
            
        if (profileError) {
            console.error('Erro ao obter perfil:', profileError);
        }
        
        const userData = profileData || {
            id: data.user.id,
            email: data.user.email,
            role: 'subscriber',
            username: data.user.user_metadata.username || email.split('@')[0]
        };
        
        // Atualizar último login
        await supabaseClient
            .from('profiles')
            .update({ last_login: new Date().toISOString() })
            .eq('id', data.user.id);
        
        // Redirecionar conforme o papel do usuário
        if (userData.role === 'admin') {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'chat.html';
        }
    } catch (err) {
        showError('Erro ao fazer login: ' + err.message);
    }
}

/**
 * Realiza logout do usuário
 */
async function logout() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
            console.error('Erro ao fazer logout:', error);
        }
        
        // Remover qualquer sessão local para garantir que o logout seja completo
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.removeItem('supabase.auth.token');
        
        // Redirecionar para a página de login
        window.location.replace('index.html');
    } catch (err) {
        console.error('Erro ao fazer logout:', err);
        // Forçar redirecionamento com replace para evitar loops
        window.location.replace('index.html');
    }
}

/**
 * Verifica se o usuário já está autenticado e redireciona se necessário
 */
async function checkAuthState() {
    try {
        const { data } = await supabaseClient.auth.getSession();
        
        if (data?.session) {
            const { data: profileData } = await supabaseClient
                .from('profiles')
                .select('role')
                .eq('id', data.session.user.id)
                .single();
                
            // Redirecionar usuário já logado
            if (window.location.pathname.includes('index.html')) {
                if (profileData?.role === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'chat.html';
                }
            }
        }
    } catch (err) {
        console.error('Erro ao verificar estado de autenticação:', err);
    }
}

// Inicializar eventos quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    // Verificar estado da autenticação
    checkAuthState();
    
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