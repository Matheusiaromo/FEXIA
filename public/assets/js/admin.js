/**
 * admin.js - Painel administrativo do FEXIA
 * 
 * Este arquivo contém as funções para o painel administrativo,
 * permitindo gerenciar usuários, visualizar estatísticas e configurar o sistema.
 */

// Configuração do Supabase - SUBSTITUA PELOS SEUS VALORES
const SUPABASE_URL = 'https://olfqmikvuhsahjlitkzn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sZnFtaWt2dWhzYWhqbGl0a3puIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3NjkwNzcsImV4cCI6MjA1ODM0NTA3N30.yUkovgoNIBiXN8ZCZCgJ7ZFvuAooVKTzaKxxcNAoVt0';

// Inicializa o cliente Supabase
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Verificar sessão atual
let currentUser = null;

async function checkSession() {
    try {
        const { data, error } = await supabaseClient.auth.getSession();
        
        if (error) {
            console.error('Erro ao verificar sessão:', error);
            window.location.href = 'index.html';
            return;
        }
        
        if (!data.session) {
            window.location.href = 'index.html';
            return;
        }
        
        // Obter dados do perfil
        const { data: profileData, error: profileError } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', data.session.user.id)
            .single();
            
        if (profileError) {
            console.error('Erro ao obter perfil:', profileError);
            window.location.href = 'index.html';
            return;
        }
        
        // Salvar dados do usuário atual
        currentUser = profileData;
        
        // Verificar se o usuário é admin
        if (currentUser.role !== 'admin') {
            console.log('Usuário não é administrador. Redirecionando...');
            window.location.href = 'chat.html';
            return;
        }
        
        // Inicializar o painel de administração
        new AdminPanel();
        
    } catch (err) {
        console.error('Erro ao verificar autenticação:', err);
        window.location.href = 'index.html';
    }
}

// Chamar verificação de sessão quando a página carregar
document.addEventListener('DOMContentLoaded', checkSession);

// Classe para gerenciar o painel administrativo
class AdminPanel {
    constructor() {
        this.users = [];
        this.chats = [];
        this.stats = {
            total_users: 0,
            active_users: 0,
            total_tokens: 0,
            premium_users: 0,
            total_chats: 0
        };
        
        // Elementos DOM
        this.toggleSidebarBtn = document.getElementById('toggle-sidebar');
        this.menuItems = document.querySelectorAll('.menu-item');
        this.contentTabs = document.querySelectorAll('.content-tab');
        this.logoutBtn = document.getElementById('logout-btn');
        
        // Elementos de estatísticas
        this.totalUsersEl = document.getElementById('total-users');
        this.activeUsersEl = document.getElementById('active-users');
        this.totalChatsEl = document.getElementById('total-chats');
        this.totalTokensEl = document.getElementById('total-tokens');
        
        // Elementos da tabela de usuários
        this.usersTableBody = document.getElementById('users-table-body');
        this.userSearchInput = document.getElementById('user-search');
        
        // Inicializar interface
        this.initUI();
        this.bindEvents();
        
        // Carregar dados
        this.loadData();
    }
    
    // Inicializar interface
    initUI() {
        // Exibir nome do administrador
        if (document.querySelector('.username') && currentUser) {
            document.querySelector('.username').textContent = currentUser.username || 'Admin';
        }
    }
    
    // Carregar todos os dados
    async loadData() {
        try {
            await Promise.all([
                this.loadUsers(),
                this.loadChats()
            ]);
            
            this.calculateStats();
            this.updateStatsDisplay();
            this.renderUsersTable();
            this.initCharts();
            
        } catch (err) {
            console.error('Erro ao carregar dados:', err);
        }
    }
    
    // Vincular eventos
    bindEvents() {
        // Alternar menu lateral
        if (this.toggleSidebarBtn) {
            this.toggleSidebarBtn.addEventListener('click', () => {
                document.querySelector('.admin-container').classList.toggle('sidebar-collapsed');
            });
        }
        
        // Itens do menu
        this.menuItems.forEach(item => {
            item.addEventListener('click', () => {
                const tabId = item.getAttribute('data-tab');
                this.activateTab(tabId);
            });
        });
        
        // Botão de logout
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }
        
        // Busca de usuários
        if (this.userSearchInput) {
            this.userSearchInput.addEventListener('input', () => {
                this.filterUsers(this.userSearchInput.value.trim().toLowerCase());
            });
        }
        
        // Botão para ver todos os usuários
        const viewAllUsersBtn = document.getElementById('view-all-users');
        if (viewAllUsersBtn) {
            viewAllUsersBtn.addEventListener('click', () => {
                this.activateTab('users');
            });
        }
    }
    
    // Ativar tab específica
    activateTab(tabId) {
        // Desativar todos os itens do menu
        this.menuItems.forEach(item => {
            item.classList.remove('active');
        });
        
        // Esconder todas as seções de conteúdo
        this.contentTabs.forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Ativar item do menu correspondente
        const menuItem = document.querySelector(`.menu-item[data-tab="${tabId}"]`);
        if (menuItem) {
            menuItem.classList.add('active');
        }
        
        // Exibir tab de conteúdo correspondente
        const contentTab = document.getElementById(`${tabId}-tab`);
        if (contentTab) {
            contentTab.classList.add('active');
        }
    }
    
    // Logout
    async logout() {
        try {
            const { error } = await supabaseClient.auth.signOut();
            if (error) {
                console.error('Erro ao fazer logout:', error);
            }
            
            window.location.href = 'index.html';
        } catch (err) {
            console.error('Erro ao fazer logout:', err);
            window.location.href = 'index.html';
        }
    }
    
    // Carregar usuários
    async loadUsers() {
        try {
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (error) {
                console.error('Erro ao carregar usuários:', error);
                return;
            }
            
            this.users = data || [];
            this.renderRecentUsersList();
            
        } catch (err) {
            console.error('Erro ao carregar usuários:', err);
        }
    }
    
    // Carregar chats
    async loadChats() {
        try {
            const { data, error } = await supabaseClient
                .from('chats')
                .select('*');
                
            if (error) {
                console.error('Erro ao carregar chats:', error);
                return;
            }
            
            this.chats = data || [];
            
        } catch (err) {
            console.error('Erro ao carregar chats:', err);
        }
    }
    
    // Calcular estatísticas
    calculateStats() {
        this.stats = {
            total_users: this.users.length,
            active_users: this.users.filter(u => u.status === 'active').length,
            total_tokens: this.users.reduce((sum, user) => sum + (user.tokens_used || 0), 0),
            premium_users: this.users.filter(u => u.subscription_plan !== 'basic').length,
            total_chats: this.chats.length
        };
    }
    
    // Atualizar exibição de estatísticas
    updateStatsDisplay() {
        if (this.totalUsersEl) {
            this.totalUsersEl.textContent = this.stats.total_users.toString();
        }
        
        if (this.activeUsersEl) {
            this.activeUsersEl.textContent = this.stats.active_users.toString();
        }
        
        if (this.totalChatsEl) {
            this.totalChatsEl.textContent = this.stats.total_chats.toString();
        }
        
        if (this.totalTokensEl) {
            this.totalTokensEl.textContent = this.stats.total_tokens.toLocaleString();
        }
    }
    
    // Renderizar lista de usuários recentes
    renderRecentUsersList() {
        const recentUsersList = document.getElementById('recent-users-list');
        if (!recentUsersList) return;
        
        recentUsersList.innerHTML = '';
        
        // Mostrar os 5 usuários mais recentes
        const recentUsers = this.users.slice(0, 5);
        
        if (recentUsers.length === 0) {
            recentUsersList.innerHTML = '<div class="no-data">Nenhum usuário encontrado</div>';
            return;
        }
        
        recentUsers.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'recent-user-item';
            
            // Formatar data de criação
            const createdDate = new Date(user.created_at);
            const formattedDate = createdDate.toLocaleDateString('pt-BR', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric' 
            });
            
            const planBadgeClass = {
                'basic': 'plan-badge-basic',
                'premium': 'plan-badge-premium',
                'enterprise': 'plan-badge-enterprise'
            }[user.subscription_plan] || 'plan-badge-basic';
            
            userItem.innerHTML = `
                <div class="user-item-header">
                    <div class="user-item-name">${user.username || 'Sem nome'}</div>
                    <div class="user-item-date">${formattedDate}</div>
                </div>
                <div class="user-item-details">
                    <div class="user-item-email">${user.email || 'Sem email'}</div>
                    <div class="user-item-plan ${planBadgeClass}">${user.subscription_plan || 'basic'}</div>
                </div>
            `;
            
            recentUsersList.appendChild(userItem);
        });
    }
    
    // Renderizar tabela de usuários
    renderUsersTable() {
        if (!this.usersTableBody) return;
        
        // Limpar conteúdo atual
        this.usersTableBody.innerHTML = '';
        
        if (this.users.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="8" class="no-data">Nenhum usuário encontrado</td>';
            this.usersTableBody.appendChild(row);
            return;
        }
        
        // Renderizar cada usuário
        this.users.forEach(user => {
            const row = document.createElement('tr');
            
            // Formatar ID do usuário
            const shortId = user.id ? user.id.substring(0, 8) + '...' : 'N/A';
            
            // Status do usuário
            const statusClass = {
                'active': 'status-active',
                'inactive': 'status-inactive',
                'suspended': 'status-suspended'
            }[user.status] || 'status-inactive';
            
            // Texto do status
            const statusText = {
                'active': 'Ativo',
                'inactive': 'Inativo',
                'suspended': 'Suspenso'
            }[user.status] || 'Inativo';
            
            // Formatar data de criação
            const createdDate = new Date(user.created_at);
            const formattedDate = createdDate.toLocaleDateString('pt-BR', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric' 
            });
            
            row.innerHTML = `
                <td title="${user.id}">${shortId}</td>
                <td>${user.username || 'Sem nome'}</td>
                <td>${user.email || 'Sem email'}</td>
                <td>${user.subscription_plan || 'basic'}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${(user.tokens_used || 0).toLocaleString()} / ${(user.tokens_limit || 0).toLocaleString()}</td>
                <td>${formattedDate}</td>
                <td>
                    <div class="table-actions">
                        <button class="action-btn edit-btn" data-id="${user.id}" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn" data-id="${user.id}" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            this.usersTableBody.appendChild(row);
        });
        
        // Adicionar eventos aos botões de ação
        this.addActionButtonEvents();
    }
    
    // Adicionar eventos aos botões de ação
    addActionButtonEvents() {
        // Botões de editar
        const editButtons = document.querySelectorAll('.edit-btn');
        editButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const userId = btn.getAttribute('data-id');
                this.editUser(userId);
            });
        });
        
        // Botões de excluir
        const deleteButtons = document.querySelectorAll('.delete-btn');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const userId = btn.getAttribute('data-id');
                this.deleteUser(userId);
            });
        });
    }
    
    // Filtrar usuários
    filterUsers(searchTerm) {
        if (!this.usersTableBody) return;
        
        const rows = this.usersTableBody.querySelectorAll('tr');
        
        rows.forEach(row => {
            const username = row.cells[1].textContent.toLowerCase();
            const email = row.cells[2].textContent.toLowerCase();
            
            if (username.includes(searchTerm) || email.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }
    
    // Editar usuário
    editUser(userId) {
        alert(`Funcionalidade de editar usuário ${userId} será implementada em breve.`);
    }
    
    // Excluir usuário
    deleteUser(userId) {
        if (confirm('Tem certeza que deseja excluir este usuário? Esta ação é irreversível.')) {
            alert(`Funcionalidade de excluir usuário ${userId} será implementada em breve.`);
        }
    }
    
    // Inicializar gráficos
    initCharts() {
        this.initTokensChart();
        this.initPlansChart();
    }
    
    // Inicializar gráfico de tokens
    initTokensChart() {
        const tokensChart = document.getElementById('tokens-chart');
        if (!tokensChart) return;
        
        // Gerar dados simulados para os últimos 30 dias
        const labels = Array.from({ length: 30 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (29 - i));
            return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        });
        
        // Dados simulados
        const data = Array.from({ length: 30 }, () => Math.floor(Math.random() * 1000));
        
        new Chart(tokensChart, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Tokens Utilizados',
                    data: data,
                    borderColor: '#19C37D',
                    backgroundColor: 'rgba(25, 195, 125, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#f1f1f1'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#f1f1f1'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#f1f1f1'
                        }
                    }
                }
            }
        });
    }
    
    // Inicializar gráfico de planos
    initPlansChart() {
        const plansChart = document.getElementById('plans-chart');
        if (!plansChart) return;
        
        // Calcular número de usuários por plano
        const basicUsers = this.users.filter(u => !u.subscription_plan || u.subscription_plan === 'basic').length;
        const premiumUsers = this.users.filter(u => u.subscription_plan === 'premium').length;
        const enterpriseUsers = this.users.filter(u => u.subscription_plan === 'enterprise').length;
        
        new Chart(plansChart, {
            type: 'doughnut',
            data: {
                labels: ['Básico', 'Premium', 'Enterprise'],
                datasets: [{
                    data: [basicUsers, premiumUsers, enterpriseUsers],
                    backgroundColor: [
                        'rgba(255, 206, 86, 0.8)',
                        'rgba(25, 195, 125, 0.8)',
                        'rgba(54, 162, 235, 0.8)'
                    ],
                    borderColor: [
                        'rgba(255, 206, 86, 1)',
                        'rgba(25, 195, 125, 1)',
                        'rgba(54, 162, 235, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#f1f1f1'
                        }
                    }
                }
            }
        });
    }
} 