# FEXIA - Assistente de IA Personalizado

FEXIA é um sistema frontend para plataformas de IA, permitindo integração rápida com diferentes APIs de modelos de linguagem como OpenAI GPT, Anthropic Claude ou sua própria solução de IA personalizada.

## Características

- Interface moderna e responsiva para desktop e dispositivos móveis
- Sistema de autenticação com níveis de acesso (administrador e usuário)
- Histórico de conversas e gerenciamento de chats
- Painel administrativo para gerenciamento de usuários
- Rastreamento de uso de tokens (opcional)
- Customizável e de fácil integração com APIs de IA

## Instruções de Uso

### Credenciais de Teste

- **Admin:** usuário: `admin` / senha: `admin123`
- **Usuário:** usuário: `teste` / senha: `teste123`

### Hierarquia do Projeto

```
FEXIA/
├── index.html          # Página de login
├── chat.html           # Interface de chat do usuário
├── admin.html          # Painel administrativo
├── public/
│   ├── assets/
│   │   ├── css/        # Folhas de estilo
│   │   ├── js/         # Arquivos JavaScript
│   │   └── images/     # Imagens e ícones
```

## Integração com IA

O sistema FEXIA está atualmente configurado para integração com n8n via webhook. Para outras integrações, você pode modificar a função `simulateAssistantResponse()` no arquivo `public/assets/js/chat.js`.

### Configuração Atual - Webhook n8n

A integração atual utiliza o seguinte webhook:
```
https://webhook.omatheusdev.com/webhook/FEXIA-IFxJvGOOfzF09nlg
```

Os dados são enviados como `multipart/form-data` incluindo:
- `chat_id`: ID da conversa atual
- `user_id`: ID do usuário atual
- `message`: Mensagem do usuário
- `history`: JSON com histórico das últimas 10 mensagens (opcional)

A resposta esperada do webhook deve estar no seguinte formato:
```json
[
  {
    "conteudoJSON": {
      "output": "Texto da resposta do assistente",
      "tokens_used": 123
    }
  }
]
```

### Passo a Passo para Outras Integrações

1. Localize a função `simulateAssistantResponse()` no arquivo `public/assets/js/chat.js`
2. Modifique o código de acordo com a API que deseja integrar
3. Adapte o formato de mensagens conforme necessário
4. Processe a resposta e atualize a interface

### Exemplo de integração com OpenAI

```javascript
async simulateAssistantResponse(userMessage) {
    const currentChat = this.getChatById(this.currentChatId);
    if (!currentChat) return;
    
    // Mostrar indicador de digitação
    this.showTypingIndicator();
    
    try {
        // Chamada para a API da OpenAI
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer SEU_TOKEN_API'
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    // Você pode incluir o histórico de conversa para contexto
                    ...currentChat.messages.map(msg => ({
                        role: msg.role,
                        content: msg.content
                    })),
                    {
                        role: "user", 
                        content: userMessage
                    }
                ]
            })
        });
        
        const data = await response.json();
        
        if (data.choices && data.choices.length > 0) {
            // Remover indicador de digitação
            this.removeTypingIndicator();
            
            const assistantResponseText = data.choices[0].message.content;
            
            const assistantMessage = {
                id: Date.now().toString(),
                role: 'assistant',
                content: assistantResponseText,
                timestamp: new Date().toISOString(),
                tokens: data.usage.completion_tokens || this.estimateTokenCount(assistantResponseText)
            };
            
            currentChat.messages.push(assistantMessage);
            this.renderMessage(assistantMessage);
            
            // Atualizar contagem de tokens com valor real
            const totalTokens = data.usage.total_tokens || this.updateTokenUsage(userMessage, assistantResponseText);
            
            // Atualizar exibição de tokens
            this.updateTokensDisplay();
            
            // Rolar para o final
            this.scrollToBottom();
        }
    } catch (error) {
        console.error('Erro ao se comunicar com a API:', error);
        this.removeTypingIndicator();
        
        // Exibir mensagem de erro
        const errorMessage = {
            id: Date.now().toString(),
            role: 'assistant',
            content: 'Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente mais tarde.',
            timestamp: new Date().toISOString()
        };
        
        currentChat.messages.push(errorMessage);
        this.renderMessage(errorMessage);
        this.scrollToBottom();
    }
}
```

## Ajustes Recentes

- Integração com webhook n8n para processamento de IA personalizada
- Corrigido o botão de toggle para sidebar no mobile
- Melhorado o contraste nos horários das mensagens
- Removida a exibição de tokens nas mensagens e lista de chats
- Adicionados botões de exclusão em cada item da lista de chats
- Corrigida a função de edição de usuário no painel administrativo
- Corrigida a funcionalidade do perfil de usuário
- Adicionada documentação detalhada sobre integração com IA
- Interface modernizada para melhor experiência do usuário

## Notas Técnicas

- O sistema utiliza localStorage para persistir dados (em um ambiente de produção, você deve implementar um backend completo)
- A contagem de tokens é estimada no frontend (para fins de MVP)
- O sistema é projetado para ser facilmente extensível e personalizável

## Licença

[MIT License](https://opensource.org/licenses/MIT) 