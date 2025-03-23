// Script para gerenciar aspectos da UI, principalmente responsividade

document.addEventListener('DOMContentLoaded', () => {
    // Verificar se estamos em um dispositivo móvel
    const isMobile = window.innerWidth <= 768;
    
    // Adicionar classe para dispositivos móveis
    if (isMobile) {
        document.body.classList.add('mobile');
        setupMobileUI();
    }
    
    // Adicionar estilo CSS para o indicador de digitação
    addTypingIndicatorStyle();
    
    // Adicionar auto-resize para o textarea
    setupTextareaAutoResize();
});

// Configuração para interface móvel
function setupMobileUI() {
    // Criar botão de menu para dispositivos móveis
    const chatHeader = document.querySelector('.chat-header');
    
    if (chatHeader) {
        const menuButton = document.createElement('button');
        menuButton.className = 'menu-toggle';
        menuButton.innerHTML = '<i class="fas fa-bars"></i>';
        chatHeader.prepend(menuButton);
        
        // Adicionar evento para mostrar/esconder sidebar
        menuButton.addEventListener('click', () => {
            const sidebar = document.querySelector('.sidebar');
            sidebar.classList.toggle('show');
        });
        
        // Fechar sidebar ao clicar em um chat (em dispositivos móveis)
        document.querySelectorAll('.chat-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelector('.sidebar').classList.remove('show');
            });
        });
        
        // Fechar sidebar ao clicar no botão Novo Chat (em dispositivos móveis)
        document.getElementById('new-chat-btn').addEventListener('click', () => {
            document.querySelector('.sidebar').classList.remove('show');
        });
    }
}

// Adicionar estilo CSS para o indicador de digitação
function addTypingIndicatorStyle() {
    // Criar elemento de estilo
    const style = document.createElement('style');
    style.textContent = `
        .typing-indicator {
            display: inline-block;
            padding: 15px 20px;
        }
        
        .typing-indicator span {
            display: inline-block;
            width: 8px;
            height: 8px;
            margin-right: 5px;
            background-color: var(--primary-color);
            border-radius: 50%;
            opacity: 0.6;
            animation: typing 1.4s infinite both;
        }
        
        .typing-indicator span:nth-child(2) {
            animation-delay: 0.2s;
        }
        
        .typing-indicator span:nth-child(3) {
            animation-delay: 0.4s;
        }
        
        @keyframes typing {
            0% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
            100% { transform: translateY(0); }
        }
    `;
    
    // Adicionar à cabeça do documento
    document.head.appendChild(style);
}

// Configurar auto-resize para textarea
function setupTextareaAutoResize() {
    const textarea = document.getElementById('chat-input');
    
    if (textarea) {
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            const newHeight = Math.min(this.scrollHeight, 150);
            this.style.height = newHeight + 'px';
        });
        
        // Inicializar com a altura correta
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    }
}

// Detectar mudanças de tamanho da janela para ajuste responsivo
window.addEventListener('resize', () => {
    const isMobile = window.innerWidth <= 768;
    
    // Adicionar ou remover classe mobile dependendo do tamanho
    document.body.classList.toggle('mobile', isMobile);
    
    // Se mudar de mobile para desktop, remover classe show da sidebar
    if (!isMobile) {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.remove('show');
        }
    }
}); 