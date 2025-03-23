/**
 * Perfil do Usuário
 * Gerencia a exibição e atualização do perfil
 */

document.addEventListener('DOMContentLoaded', () => {
    // Verificar se o usuário está logado
    const currentUser = JSON.parse(localStorage.getItem('fexia_current_user'));
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }

    // Preencher dados do perfil
    document.getElementById('profile-username').textContent = currentUser.username;
    document.getElementById('profile-email').textContent = currentUser.email;
    document.getElementById('profile-role').textContent = 
        currentUser.role === 'admin' ? 'Administrador' : 'Assinante';
    document.getElementById('profile-plan').textContent = formatPlan(currentUser.subscription_plan);
    
    // Exibir contagem de tokens no formato (usado/limite)
    document.getElementById('token-count').textContent = 
        `${currentUser.tokens_used}/${currentUser.tokens_limit}`;
    
    // Atualizar barra de progresso de tokens
    updateTokenProgressBar(currentUser.tokens_used, currentUser.tokens_limit);
    
    // Event listeners
    document.getElementById('logout-button').addEventListener('click', logout);
    document.getElementById('edit-profile-btn').addEventListener('click', showEditProfileModal);
    document.getElementById('change-password-btn').addEventListener('click', showChangePasswordModal);
    
    // Remover a seção de histórico de uso (não será mais exibida)
    const usageHistorySection = document.getElementById('usage-history-section');
    if (usageHistorySection) {
        usageHistorySection.remove();
    }
});

/**
 * Atualiza a barra de progresso de tokens
 * @param {number} used - Quantidade de tokens usados
 * @param {number} limit - Limite de tokens
 */
function updateTokenProgressBar(used, limit) {
    const progressBar = document.getElementById('token-progress');
    const percentage = Math.min(100, Math.round((used / limit) * 100));
    
    progressBar.style.width = `${percentage}%`;
    
    // Mudar cor baseado no uso
    if (percentage >= 90) {
        progressBar.classList.add('danger');
        progressBar.classList.remove('warning', 'success');
    } else if (percentage >= 70) {
        progressBar.classList.add('warning');
        progressBar.classList.remove('danger', 'success');
    } else {
        progressBar.classList.add('success');
        progressBar.classList.remove('danger', 'warning');
    }
}

/**
 * Formata o nome do plano para exibição
 * @param {string} plan - Nome do plano
 * @returns {string} - Nome formatado
 */
function formatPlan(plan) {
    switch (plan) {
        case 'basic':
            return 'Básico';
        case 'standard':
            return 'Padrão';
        case 'premium':
            return 'Premium';
        default:
            return plan;
    }
}

/**
 * Mostra o modal para edição de perfil
 */
function showEditProfileModal() {
    // Obter usuário atual
    const currentUser = JSON.parse(localStorage.getItem('fexia_current_user'));
    
    // Preencher os campos do formulário
    document.getElementById('edit-username').value = currentUser.username;
    document.getElementById('edit-email').value = currentUser.email;
    
    // Exibir modal
    const modal = document.getElementById('edit-profile-modal');
    modal.style.display = 'block';
    
    // Event listeners para o modal
    document.getElementById('close-edit-modal').addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    document.getElementById('edit-profile-form').addEventListener('submit', (e) => {
        e.preventDefault();
        updateProfile();
    });
    
    // Fechar modal clicando fora dele
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

/**
 * Atualiza os dados do perfil
 */
function updateProfile() {
    // Obter usuário atual
    const currentUser = JSON.parse(localStorage.getItem('fexia_current_user'));
    
    // Obter valores do formulário
    const username = document.getElementById('edit-username').value.trim();
    const email = document.getElementById('edit-email').value.trim();
    
    // Validar campos
    if (!username || !email) {
        showAlert('Por favor, preencha todos os campos.', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showAlert('Por favor, insira um email válido.', 'error');
        return;
    }
    
    // Verificar se houve alterações
    if (username === currentUser.username && email === currentUser.email) {
        showAlert('Nenhuma alteração foi feita.', 'info');
        document.getElementById('edit-profile-modal').style.display = 'none';
        return;
    }
    
    // Atualizar no localStorage (no backend real, faria uma chamada de API)
    const users = JSON.parse(localStorage.getItem('fexia_users')) || [];
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    
    if (userIndex !== -1) {
        // Verificar se username já existe
        if (username !== currentUser.username && 
            users.some(u => u.username === username)) {
            showAlert('Nome de usuário já existe.', 'error');
            return;
        }
        
        // Verificar se email já existe
        if (email !== currentUser.email && 
            users.some(u => u.email === email)) {
            showAlert('Email já está em uso.', 'error');
            return;
        }
        
        // Atualizar usuário na "base de dados"
        users[userIndex].username = username;
        users[userIndex].email = email;
        localStorage.setItem('fexia_users', JSON.stringify(users));
        
        // Atualizar usuário atual
        currentUser.username = username;
        currentUser.email = email;
        localStorage.setItem('fexia_current_user', JSON.stringify(currentUser));
        
        // Atualizar interface
        document.getElementById('profile-username').textContent = username;
        document.getElementById('profile-email').textContent = email;
        
        // Fechar modal
        document.getElementById('edit-profile-modal').style.display = 'none';
        
        // Mostrar mensagem de sucesso
        showAlert('Perfil atualizado com sucesso!', 'success');
    } else {
        showAlert('Erro ao atualizar perfil. Tente novamente.', 'error');
    }
}

/**
 * Mostra o modal para alterar senha
 */
function showChangePasswordModal() {
    // Exibir modal
    const modal = document.getElementById('change-password-modal');
    modal.style.display = 'block';
    
    // Event listeners para o modal
    document.getElementById('close-password-modal').addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    document.getElementById('change-password-form').addEventListener('submit', (e) => {
        e.preventDefault();
        changePassword();
    });
    
    // Fechar modal clicando fora dele
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

/**
 * Altera a senha do usuário
 */
function changePassword() {
    // Obter usuário atual
    const currentUser = JSON.parse(localStorage.getItem('fexia_current_user'));
    
    // Obter valores do formulário
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    // Validar campos
    if (!currentPassword || !newPassword || !confirmPassword) {
        showAlert('Por favor, preencha todos os campos.', 'error');
        return;
    }
    
    // Verificar se senha atual está correta
    if (currentPassword !== currentUser.password) {
        showAlert('Senha atual incorreta.', 'error');
        return;
    }
    
    // Verificar se nova senha tem pelo menos 6 caracteres
    if (newPassword.length < 6) {
        showAlert('A nova senha deve ter pelo menos 6 caracteres.', 'error');
        return;
    }
    
    // Verificar se senhas coincidem
    if (newPassword !== confirmPassword) {
        showAlert('As senhas não coincidem.', 'error');
        return;
    }
    
    // Atualizar no localStorage (no backend real, faria uma chamada de API)
    const users = JSON.parse(localStorage.getItem('fexia_users')) || [];
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    
    if (userIndex !== -1) {
        // Atualizar senha
        users[userIndex].password = newPassword;
        localStorage.setItem('fexia_users', JSON.stringify(users));
        
        // Atualizar usuário atual
        currentUser.password = newPassword;
        localStorage.setItem('fexia_current_user', JSON.stringify(currentUser));
        
        // Fechar modal
        document.getElementById('change-password-modal').style.display = 'none';
        
        // Limpar campos
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
        
        // Mostrar mensagem de sucesso
        showAlert('Senha alterada com sucesso!', 'success');
    } else {
        showAlert('Erro ao alterar senha. Tente novamente.', 'error');
    }
}

/**
 * Função para fazer logout
 */
function logout() {
    localStorage.removeItem('fexia_current_user');
    window.location.href = 'index.html';
}

/**
 * Valida um email
 * @param {string} email - Email a ser validado
 * @returns {boolean} - Se o email é válido
 */
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * Mostra um alerta na interface
 * @param {string} message - Mensagem a ser exibida
 * @param {string} type - Tipo de alerta (success, error, info)
 */
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alert-container') || createAlertContainer();
    
    const alert = document.createElement('div');
    alert.className = `alert-message alert-${type}`;
    alert.textContent = message;
    
    alertContainer.appendChild(alert);
    
    // Remover após 5 segundos
    setTimeout(() => {
        alert.remove();
        // Remover container se estiver vazio
        if (alertContainer.children.length === 0) {
            alertContainer.remove();
        }
    }, 5000);
}

/**
 * Cria um container de alertas se não existir
 * @returns {HTMLElement} - Container de alertas
 */
function createAlertContainer() {
    const container = document.createElement('div');
    container.id = 'alert-container';
    document.body.appendChild(container);
    return container;
} 