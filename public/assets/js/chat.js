// Configuração do Supabase - SUBSTITUA PELOS SEUS VALORES
const SUPABASE_URL = 'https://olfqmikvuhsahjlitkzn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sZnFtaWt2dWhzYWhqbGl0a3puIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3NjkwNzcsImV4cCI6MjA1ODM0NTA3N30.yUkovgoNIBiXN8ZCZCgJ7ZFvuAooVKTzaKxxcNAoVt0';

// URL do webhook
const WEBHOOK_URL = 'https://n8n.uni-ae.online/webhook/FEXIA-IFxJvGOOfzF09nlg';

// Inicializa o cliente Supabase
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Verificar se o usuário está logado
let currentUser = null;

// Verificar sessão atual
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
        
        if (currentUser.role === 'admin') {
            // Se for um admin, redirecionar para a página de administração
            window.location.href = 'admin.html';
            return;
        }
        
        // Inicializar o chat manager
        const chatManager = new ChatManager();
        
    } catch (err) {
        console.error('Erro ao verificar autenticação:', err);
        window.location.href = 'index.html';
    }
}

// Chamar verificação de sessão quando a página carregar
document.addEventListener('DOMContentLoaded', checkSession);

// Classes para gerenciar os dados do chat
class ChatManager {
    constructor() {
        // Elementos DOM do chat
        this.chatList = document.getElementById('chat-list');
        this.chatMessages = document.getElementById('chat-messages');
        this.chatTitle = document.getElementById('current-chat-title');
        this.chatForm = document.getElementById('chat-form');
        this.chatInput = document.getElementById('chat-input');
        
        // Elementos DOM dos botões
        this.newChatBtn = document.getElementById('new-chat-btn');
        this.deleteChatBtn = document.getElementById('delete-chat-btn');
        this.editTitleBtn = document.getElementById('edit-title-btn');
        this.logoutBtn = document.getElementById('logout-btn');
        this.profileBtn = document.getElementById('profile-btn');
        this.toggleSidebarBtn = document.getElementById('toggle-sidebar');
        
        // Dados do chat
        this.chats = [];
        this.currentChatId = null;
        this.messageHistory = [];
        
        // Verificar se elementos existem antes de acessá-los
        if (document.querySelector('.username') && currentUser && currentUser.username) {
            // Atualizar nome de usuário na interface
            document.querySelector('.username').textContent = currentUser.username;
        }
        
        // Carregar chats do usuário
        this.loadChats().then(() => {
            // Inicializar interface
            this.initUI();
            this.bindEvents();
            
            // Verificar se o usuário ainda tem tokens disponíveis
            this.checkTokenAvailability();
            this.updateTokensDisplay();
        });
    }
    
    // Carregar chats do usuário do Supabase
    async loadChats() {
        try {
            const { data, error } = await supabaseClient
                .from('chats')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('updated_at', { ascending: false });
                
            if (error) {
                console.error('Erro ao carregar chats:', error);
                return;
            }
            
            this.chats = data || [];
            
            // Verificar se há um chat atual salvo
            const savedChatId = localStorage.getItem(`fexia_current_chat_${currentUser.id}`);
            if (savedChatId) {
                this.currentChatId = savedChatId;
            }
            
        } catch (err) {
            console.error('Erro ao carregar chats:', err);
        }
    }
    
    // Verificar disponibilidade de tokens
    checkTokenAvailability() {
        const tokensUsed = currentUser.tokens_used || 0;
        const tokensLimit = currentUser.tokens_limit || 0;
        
        // Verificar se o usuário atingiu o limite
        if (tokensLimit > 0 && tokensUsed >= tokensLimit) {
            // Desabilitar formulário
            this.chatForm.classList.add('disabled');
            this.chatInput.disabled = true;
            
            // Mostrar mensagem
            const limitMessage = document.createElement('div');
            limitMessage.className = 'message-warning';
            limitMessage.innerHTML = `
                <h3>Limite de tokens atingido</h3>
                <p>Você atingiu seu limite de ${tokensLimit} tokens. Entre em contato com o administrador para mais informações.</p>
            `;
            this.chatMessages.appendChild(limitMessage);
            this.scrollToBottom();
        } else {
            // Formulário habilitado
            this.chatForm.classList.remove('disabled');
            this.chatInput.disabled = false;
        }
    }
    
    // Calcular número aproximado de tokens
    estimateTokenCount(text) {
        // Em uma implementação real, seria usado um tokenizador adequado
        // Para exemplo simples, consideramos aproximadamente 1 token para cada 4 caracteres
        return Math.ceil(text.length / 4) || 1;
    }
    
    // Atualizar contador de tokens
    async updateTokenUsage(userMessage, assistantMessage, tokensUsed) {
        try {
            // Atualizar contagem no chat atual
            const currentChat = this.getChatById(this.currentChatId);
            if (currentChat) {
                currentChat.tokens_used = (currentChat.tokens_used || 0) + tokensUsed;
                
                // Atualizar no Supabase
                const { error: chatError } = await supabaseClient
                    .from('chats')
                    .update({ tokens_used: currentChat.tokens_used })
                    .eq('id', currentChat.id);
                    
                if (chatError) {
                    console.error('Erro ao atualizar tokens do chat:', chatError);
                }
            }
            
            // Atualizar tokens do usuário
            const newTokensUsed = (currentUser.tokens_used || 0) + tokensUsed;
            
            // Atualizar no Supabase
            const { error: profileError } = await supabaseClient
                .from('profiles')
                .update({ tokens_used: newTokensUsed })
                .eq('id', currentUser.id);
                
            if (profileError) {
                console.error('Erro ao atualizar tokens do usuário:', profileError);
            } else {
                // Atualizar valor local
                currentUser.tokens_used = newTokensUsed;
            }
            
            // Atualizar exibição de tokens
            this.updateTokensDisplay();
            
        } catch (err) {
            console.error('Erro ao atualizar uso de tokens:', err);
        }
    }
    
    // Atualizar informações de uso mensal
    updateMonthlyUsage(tokens) {
        const now = new Date();
        const month = now.getMonth();
        const year = now.getFullYear();
        const monthKey = `${year}-${month+1}`;
        
        // Obter histórico mensal ou inicializar
        const monthlyUsage = JSON.parse(localStorage.getItem(`fexia_monthly_usage_${currentUser.id}`)) || {};
        
        // Atualizar uso do mês atual
        if (!monthlyUsage[monthKey]) {
            monthlyUsage[monthKey] = tokens;
        } else {
            monthlyUsage[monthKey] += tokens;
        }
        
        // Salvar histórico atualizado
        localStorage.setItem(`fexia_monthly_usage_${currentUser.id}`, JSON.stringify(monthlyUsage));
    }
    
    // Inicializar interface do usuário
    initUI() {
        // Renderizar lista de chats
        this.renderChatList();
        
        // Verificar se há um chat atual
        if (this.currentChatId) {
            this.loadChat(this.currentChatId);
        } else if (this.chats.length > 0) {
            // Carregar o chat mais recente
            this.loadChat(this.chats[0].id);
        } else {
            // Criar um novo chat se não houver nenhum
            this.createNewChat();
        }
        
        // Ajustar altura da textarea
        this.adjustTextareaHeight();
    }
    
    // Atualizar exibição de tokens
    updateTokensDisplay() {
        const tokenInfo = document.getElementById('token-info');
        if (!tokenInfo) return;
        
        const tokensUsed = currentUser.tokens_used || 0;
        const tokensLimit = currentUser.tokens_limit || 0;
        const planName = this.formatPlanName(currentUser.subscription_plan);
        
        // Calcular porcentagem
        let percentage = 0;
        if (tokensLimit > 0) {
            percentage = Math.min(Math.round((tokensUsed / tokensLimit) * 100), 100);
        }
        
        // Atualizar informações
        tokenInfo.innerHTML = `
            <div class="token-plan">${planName}</div>
            <div class="token-count">${tokensUsed.toLocaleString()} / ${tokensLimit.toLocaleString()}</div>
            <div class="token-progress">
                <div class="token-bar" style="width: ${percentage}%"></div>
            </div>
        `;
    }
    
    // Formatar nome do plano
    formatPlanName(plan) {
        if (!plan) return 'Básico';
        
        switch (plan.toLowerCase()) {
            case 'premium':
                return 'Premium';
            case 'enterprise':
                return 'Enterprise';
            case 'pro':
                return 'Profissional';
            default:
                return 'Básico';
        }
    }
    
    // Configurar eventos
    bindEvents() {
        // Evento para enviar mensagem
        this.chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });
        
        // Evento para criar novo chat
        this.newChatBtn.addEventListener('click', () => {
            this.createNewChat();
        });
        
        // Evento para deletar chat
        this.deleteChatBtn.addEventListener('click', () => {
            this.deleteCurrentChat();
        });
        
        // Evento para editar título do chat
        this.editTitleBtn.addEventListener('click', () => {
            this.showRenameModal();
        });
        
        // Evento para logout
        this.logoutBtn.addEventListener('click', () => {
            this.logout();
        });
        
        // Evento para mostrar perfil
        this.profileBtn.addEventListener('click', () => {
            this.showProfileModal();
        });
        
        // Evento para alternar sidebar
        this.toggleSidebarBtn.addEventListener('click', () => {
            document.querySelector('.chat-container').classList.toggle('sidebar-collapsed');
        });
        
        // Eventos para textarea
        this.chatInput.addEventListener('keydown', (e) => {
            // Enter para enviar, Shift+Enter para quebra de linha
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
            
            // Ajustar altura ao digitar
            this.adjustTextareaHeight();
        });
        
        this.chatInput.addEventListener('input', () => {
            this.adjustTextareaHeight();
        });
        
        // Eventos do modal de renomear
        const renameModal = document.getElementById('rename-modal');
        const renameForm = document.getElementById('rename-form');
        const closeButtons = renameModal.querySelectorAll('.btn-close, .modal-cancel');
        
        renameForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newTitle = document.getElementById('chat-title').value.trim();
            if (newTitle) {
                this.renameCurrentChat(newTitle);
                renameModal.style.display = 'none';
            } else {
                alert('O título não pode estar vazio.');
            }
        });
        
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                renameModal.style.display = 'none';
            });
        });
        
        // Eventos do modal de perfil
        const profileModal = document.getElementById('profile-modal');
        const profileForm = document.getElementById('profile-form');
        const profileCloseButtons = profileModal.querySelectorAll('.btn-close, .modal-cancel');
        const tabButtons = profileModal.querySelectorAll('.tab');
        
        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateProfile();
        });
        
        profileCloseButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                profileModal.style.display = 'none';
            });
        });
        
        tabButtons.forEach(tab => {
            tab.addEventListener('click', () => {
                // Desativar todas as abas
                tabButtons.forEach(t => t.classList.remove('active'));
                
                // Esconder todos os conteúdos
                const tabContents = profileModal.querySelectorAll('.tab-content');
                tabContents.forEach(content => {
                    content.style.display = 'none';
                });
                
                // Ativar aba clicada
                tab.classList.add('active');
                
                // Mostrar conteúdo correspondente
                const tabId = tab.getAttribute('data-tab');
                document.getElementById(tabId).style.display = 'block';
            });
        });
    }
    
    // Exibir modal de perfil
    showProfileModal() {
        const profileModal = document.getElementById('profile-modal');
        const usernameField = document.getElementById('profile-username');
        const emailField = document.getElementById('profile-email');
        const planInfo = document.querySelector('.plan-info');
        const usageHistory = document.querySelector('.usage-history');
        
        // Preencher campos do formulário
        usernameField.value = currentUser.username || '';
        emailField.value = currentUser.email || '';
        
        // Preencher informações do plano
        const planName = this.formatPlanName(currentUser.subscription_plan);
        const tokensUsed = currentUser.tokens_used || 0;
        const tokensLimit = currentUser.tokens_limit || 0;
        const percentUsed = tokensLimit > 0 ? Math.min(Math.round((tokensUsed / tokensLimit) * 100), 100) : 0;
        
        planInfo.innerHTML = `
            <div class="plan-header">
                <h4>${planName}</h4>
                <span class="plan-badge">${currentUser.subscription_plan || 'basic'}</span>
            </div>
            <div class="plan-details">
                <div class="plan-usage-info">
                    <span>Tokens Utilizados</span>
                    <div class="plan-progress">
                        <div class="plan-progress-bar" style="width: ${percentUsed}%"></div>
                    </div>
                    <span>${tokensUsed.toLocaleString()} / ${tokensLimit.toLocaleString()} tokens (${percentUsed}%)</span>
                </div>
            </div>
        `;
        
        // Preencher histórico de uso
        const monthlyUsage = JSON.parse(localStorage.getItem(`fexia_monthly_usage_${currentUser.id}`)) || {};
        const months = Object.keys(monthlyUsage).sort().reverse();
        
        if (months.length > 0) {
            let historyHTML = '';
            
            months.forEach(month => {
                const [year, monthNum] = month.split('-');
                const date = new Date(year, monthNum - 1);
                const monthName = date.toLocaleDateString('pt-BR', { month: 'long' });
                const formattedDate = `${monthName} de ${year}`;
                
                historyHTML += `
                    <div class="usage-item">
                        <div class="usage-date">${formattedDate}</div>
                        <div class="usage-tokens">${monthlyUsage[month].toLocaleString()} tokens</div>
                    </div>
                `;
            });
            
            usageHistory.innerHTML = historyHTML;
        } else {
            usageHistory.innerHTML = '<div class="no-data">Nenhum histórico de uso encontrado.</div>';
        }
        
        // Exibir modal
        profileModal.style.display = 'block';
    }
    
    // Atualizar perfil do usuário
    updateProfile() {
        const profileForm = document.getElementById('profile-form');
        const username = profileForm.querySelector('#profile-username').value.trim();
        const email = profileForm.querySelector('#profile-email').value.trim();
        const currentPassword = profileForm.querySelector('#profile-current-password').value;
        const newPassword = profileForm.querySelector('#profile-new-password').value;
        const confirmPassword = profileForm.querySelector('#profile-confirm-password').value;
        
        // Validar dados
        if (!username || username.length < 3) {
            alert('O nome de usuário deve ter pelo menos 3 caracteres.');
            return;
        }
        
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            alert('Email inválido.');
            return;
        }
        
        // Verificar disponibilidade do nome de usuário e email
        const users = JSON.parse(localStorage.getItem('fexia_users')) || [];
        const otherUsers = users.filter(u => u.id !== currentUser.id);
        
        if (username !== currentUser.username && 
            otherUsers.some(u => u.username === username)) {
            alert('Nome de usuário já está em uso.');
            return;
        }
        
        if (email !== currentUser.email && 
            otherUsers.some(u => u.email === email)) {
            alert('Email já está em uso.');
            return;
        }
        
        // Verificar se deseja alterar a senha
        if (currentPassword || newPassword || confirmPassword) {
            // Validar senha atual
            const userIndex = users.findIndex(u => u.id === currentUser.id);
            if (userIndex === -1 || users[userIndex].password !== currentPassword) {
                alert('Senha atual incorreta.');
                return;
            }
            
            // Validar nova senha
            if (!newPassword || newPassword.length < 6) {
                alert('A nova senha deve ter pelo menos 6 caracteres.');
                return;
            }
            
            // Confirmar nova senha
            if (newPassword !== confirmPassword) {
                alert('As senhas não coincidem.');
                return;
            }
            
            // Atualizar senha
            users[userIndex].password = newPassword;
        }
        
        // Atualizar dados do usuário
        const userIndex = users.findIndex(u => u.id === currentUser.id);
        if (userIndex !== -1) {
            users[userIndex].username = username;
            users[userIndex].email = email;
            localStorage.setItem('fexia_users', JSON.stringify(users));
        }
        
        // Atualizar usuário atual
        currentUser.username = username;
        currentUser.email = email;
        localStorage.setItem('fexia_current_user', JSON.stringify(currentUser));
        
        // Atualizar interface
        document.querySelector('.username').textContent = username;
        
        // Fechar modal
        document.getElementById('profile-modal').style.display = 'none';
        
        // Exibir mensagem de sucesso
        alert('Perfil atualizado com sucesso!');
    }
    
    // Renderizar lista de chats
    renderChatList() {
        if (!this.chatList) return;
        
        // Limpar lista
        this.chatList.innerHTML = '';
        
        // Ordenar chats por data de atualização (mais recente primeiro)
        const sortedChats = [...this.chats].sort((a, b) => {
            const dateA = new Date(a.updated_at || a.created_at);
            const dateB = new Date(b.updated_at || b.created_at);
            return dateB - dateA;
        });
        
        // Renderizar cada chat
        sortedChats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            if (chat.id === this.currentChatId) {
                chatItem.classList.add('active');
            }
            
            // Formatar data
            const date = new Date(chat.updated_at || chat.created_at);
            const formattedDate = date.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit'
            });
            
            chatItem.innerHTML = `
                <div class="chat-item-content">
                    <div class="chat-item-title">${chat.title || 'Novo Chat'}</div>
                    <div class="chat-item-date">${formattedDate}</div>
                </div>
            `;
            
            // Adicionar evento de clique
            chatItem.addEventListener('click', () => {
                this.loadChat(chat.id);
            });
            
            this.chatList.appendChild(chatItem);
        });
        
        // Mostrar mensagem se não houver chats
        if (sortedChats.length === 0) {
            this.chatList.innerHTML = '<div class="no-chats">Nenhuma conversa encontrada</div>';
        }
    }
    
    // Excluir chat por ID
    deleteChatById(chatId) {
        const chatIndex = this.chats.findIndex(chat => chat.id === chatId);
        
        if (chatIndex !== -1) {
            // Remover chat
            this.chats.splice(chatIndex, 1);
            
            // Salvar chats
            this.saveChats();
            
            // Verificar se era o chat atual
            if (chatId === this.currentChatId) {
                if (this.chats.length > 0) {
                    // Carregar o próximo chat disponível
                    this.loadChat(this.chats[0].id);
                } else {
                    // Criar um novo chat se não houver mais chats
                    this.createNewChat();
                }
            }
        }
    }
    
    // Obter chat por ID
    getChatById(chatId) {
        return this.chats.find(chat => chat.id === chatId);
    }
    
    // Carregar chat
    async loadChat(chatId) {
        try {
            this.currentChatId = chatId;
            localStorage.setItem(`fexia_current_chat_${currentUser.id}`, chatId);
            
            // Limpar histórico de mensagens
            this.messageHistory = [];
            
            // Marcar o chat ativo na lista
            const chatItems = document.querySelectorAll('.chat-item');
            chatItems.forEach(item => {
                item.classList.remove('active');
                if (item.dataset.id === chatId) {
                    item.classList.add('active');
                }
            });
            
            const currentChat = this.getChatById(chatId);
            if (currentChat) {
                this.chatTitle.textContent = currentChat.title;
                
                // Carregar mensagens do Supabase
                const { data, error } = await supabaseClient
                    .from('messages')
                    .select('*')
                    .eq('chat_id', chatId)
                    .order('timestamp', { ascending: true });
                    
                if (error) {
                    console.error('Erro ao carregar mensagens:', error);
                    return;
                }
                
                // Reconstruir histórico de mensagens para o webhook
                if (data && data.length > 0) {
                    data.forEach(msg => {
                        this.messageHistory.push({
                            role: msg.role,
                            content: msg.content
                        });
                    });
                }
                
                this.renderMessages(data || []);
            }
            
        } catch (err) {
            console.error('Erro ao carregar chat:', err);
        }
    }
    
    // Criar novo chat
    async createNewChat() {
        try {
            // Criar chat no Supabase
            const { data, error } = await supabaseClient
                .from('chats')
                .insert([
                    {
                        user_id: currentUser.id,
                        title: 'Nova Conversa',
                        tokens_used: 0
                    }
                ])
                .select();
                
            if (error) {
                console.error('Erro ao criar chat:', error);
                return;
            }
            
            const newChat = data[0];
            
            // Adicionar à lista local
            this.chats.unshift(newChat);
            
            // Renderizar lista de chats
            this.renderChatList();
            
            // Carregar o novo chat
            this.loadChat(newChat.id);
            
        } catch (err) {
            console.error('Erro ao criar chat:', err);
        }
    }
    
    // Excluir chat atual
    async deleteCurrentChat() {
        if (!this.currentChatId) return;
        
        try {
            // Excluir do Supabase
            const { error } = await supabaseClient
                .from('chats')
                .delete()
                .eq('id', this.currentChatId);
                
            if (error) {
                console.error('Erro ao excluir chat:', error);
                return;
            }
            
            // Remover da lista local
            this.chats = this.chats.filter(chat => chat.id !== this.currentChatId);
            
            // Se ainda houver outros chats, carregar o primeiro
            if (this.chats.length > 0) {
                this.loadChat(this.chats[0].id);
            } else {
                // Caso contrário, criar um novo
                this.createNewChat();
            }
            
            // Atualizar lista de chats
            this.renderChatList();
            
        } catch (err) {
            console.error('Erro ao excluir chat:', err);
        }
    }
    
    // Exibir modal para renomear chat
    showRenameModal() {
        if (!this.currentChatId) return;
        
        const chat = this.getChatById(this.currentChatId);
        if (!chat) return;
        
        // Preencher campo com título atual
        const titleInput = document.getElementById('chat-title');
        titleInput.value = chat.title || '';
        
        // Exibir modal
        const renameModal = document.getElementById('rename-modal');
        renameModal.style.display = 'block';
        
        // Focar no campo de título
        titleInput.focus();
    }
    
    // Renomear chat atual
    async renameCurrentChat(newTitle) {
        if (!this.currentChatId || !newTitle) return;
        
        try {
            // Atualizar no Supabase
            const { error } = await supabaseClient
                .from('chats')
                .update({ title: newTitle })
                .eq('id', this.currentChatId);
                
            if (error) {
                console.error('Erro ao renomear chat:', error);
                return;
            }
            
            // Atualizar localmente
            const chat = this.getChatById(this.currentChatId);
            if (chat) {
                chat.title = newTitle;
                this.chatTitle.textContent = newTitle;
            }
            
            // Atualizar lista de chats
            this.renderChatList();
            
        } catch (err) {
            console.error('Erro ao renomear chat:', err);
        }
    }
    
    // Enviar mensagem
    async sendMessage() {
        const messageText = this.chatInput.value.trim();
        if (!messageText || !this.currentChatId) return;
        
        try {
            // Adicionar mensagem à história de conversa
            this.messageHistory.push({
                role: 'user',
                content: messageText
            });
            
            // Adicionar mensagem do usuário
            const userMessage = {
                role: 'user',
                content: messageText,
                timestamp: new Date().toISOString()
            };
            
            // Salvar mensagem do usuário no Supabase
            const { data: userData, error: userError } = await supabaseClient
                .from('messages')
                .insert([
                    {
                        chat_id: this.currentChatId,
                        role: 'user',
                        content: messageText
                    }
                ])
                .select();
                
            if (userError) {
                console.error('Erro ao salvar mensagem do usuário:', userError);
                return;
            }
            
            // Renderizar mensagem do usuário
            this.renderMessage(userData[0]);
            
            // Limpar input e resetar altura
            this.chatInput.value = '';
            this.adjustTextareaHeight();
            
            // Mostrar indicador de digitação
            this.showTypingIndicator();
            
            // Enviar mensagem para o webhook
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: this.currentChatId,
                    user_id: currentUser.id,
                    message: messageText,
                    history: JSON.stringify(this.messageHistory)
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Processar resposta do webhook
            const responseData = await response.json();
            
            if (responseData && responseData.length > 0 && responseData[0].conteudoJSON) {
                const assistantContent = responseData[0].conteudoJSON.output;
                const tokensUsed = responseData[0].conteudoJSON.tokens_used;
                
                // Adicionar resposta à história de conversa
                this.messageHistory.push({
                    role: 'assistant',
                    content: assistantContent
                });
                
                // Salvar resposta do assistente no Supabase
                const { data: assistantData, error: assistantError } = await supabaseClient
                    .from('messages')
                    .insert([
                        {
                            chat_id: this.currentChatId,
                            role: 'assistant',
                            content: assistantContent
                        }
                    ])
                    .select();
                    
                if (assistantError) {
                    console.error('Erro ao salvar resposta do assistente:', assistantError);
                    return;
                }
                
                // Remover indicador de digitação
                this.removeTypingIndicator();
                
                // Renderizar resposta do assistente
                this.renderMessage(assistantData[0]);
                
                // Atualizar uso de tokens
                await this.updateTokenUsage(messageText, assistantContent, tokensUsed);
            } else {
                throw new Error('Formato de resposta inválido do webhook');
            }
            
        } catch (err) {
            console.error('Erro ao enviar mensagem:', err);
            this.removeTypingIndicator();
            
            // Mostrar mensagem de erro
            const errorMessage = document.createElement('div');
            errorMessage.className = 'message message-assistant';
            errorMessage.innerHTML = `
                <div class="message-content">Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.</div>
                <div class="message-meta">
                    <span class="message-time">Agora</span>
                </div>
            `;
            this.chatMessages.appendChild(errorMessage);
            this.scrollToBottom();
        }
    }
    
    // Mostrar indicador de digitação
    showTypingIndicator() {
        // Remover indicador existente
        this.removeTypingIndicator();
        
        // Criar indicador
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'message assistant typing-indicator';
        typingIndicator.innerHTML = `
            <div class="message-content">
                <div class="typing-animation">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        
        // Adicionar ao chat
        this.chatMessages.appendChild(typingIndicator);
        this.scrollToBottom();
    }
    
    // Remover indicador de digitação
    removeTypingIndicator() {
        const typingIndicator = this.chatMessages.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    // Renderizar todas as mensagens
    renderMessages(messages) {
        // Limpar mensagens
        this.chatMessages.innerHTML = '';
        
        // Renderizar cada mensagem
        if (messages && messages.length > 0) {
            messages.forEach(message => {
                this.renderMessage(message);
            });
        } else {
            // Mostrar mensagem de boas-vindas
            const welcomeMessage = document.createElement('div');
            welcomeMessage.className = 'welcome-message';
            welcomeMessage.innerHTML = `
                <h2>Bem-vindo ao FEXIA!</h2>
                <p>Seu assistente de IA personalizado. Como posso ajudar você hoje?</p>
            `;
            this.chatMessages.appendChild(welcomeMessage);
        }
        
        // Rolar para o final
        this.scrollToBottom();
    }
    
    // Renderizar uma mensagem
    renderMessage(message) {
        if (!message || !message.content) return;
        
        // Criar elemento de mensagem
        const messageElement = document.createElement('div');
        messageElement.className = `message message-${message.role}`;
        
        // Formatar conteúdo (substituir quebras de linha por <br>)
        const formattedContent = message.content.replace(/\n/g, '<br>');
        
        // Formatar data/hora
        let timeString = 'Agora';
        if (message.timestamp) {
            const date = new Date(message.timestamp);
            timeString = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }
        
        // Adicionar conteúdo
        messageElement.innerHTML = `
            <div class="message-content">${formattedContent}</div>
            <div class="message-meta">
                <span class="message-time">${timeString}</span>
            </div>
        `;
        
        // Adicionar ao chat
        this.chatMessages.appendChild(messageElement);
        
        // Rolar para o final
        this.scrollToBottom();
    }
    
    // Ajustar altura da textarea
    adjustTextareaHeight() {
        this.chatInput.style.height = 'auto';
        this.chatInput.style.height = (this.chatInput.scrollHeight) + 'px';
        if (this.chatInput.scrollHeight > 200) {
            this.chatInput.style.height = '200px';
            this.chatInput.style.overflowY = 'auto';
        } else {
            this.chatInput.style.overflowY = 'hidden';
        }
    }
    
    // Rolar para o final do chat
    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    
    // Salvar chats no localStorage
    saveChats() {
        localStorage.setItem(`fexia_chats_${currentUser.id}`, JSON.stringify(this.chats));
    }
    
    // Fazer logout
    async logout() {
        try {
            const { error } = await supabaseClient.auth.signOut();
            if (error) {
                console.error('Erro ao fazer logout:', error);
            }
            
            // Remover dados locais
            localStorage.removeItem(`fexia_current_chat_${currentUser.id}`);
            
            // Redirecionar para a página de login
            window.location.replace('index.html');
            
        } catch (err) {
            console.error('Erro ao fazer logout:', err);
            window.location.replace('index.html');
        }
    }
}

// Inicializar gerenciador de chat quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    const chatManager = new ChatManager();
}); 