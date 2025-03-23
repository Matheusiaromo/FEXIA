-- Configuração das Tabelas para FEXIA no Supabase
-- Copie e cole este arquivo no SQL Editor do Supabase

-- Tabela de perfis de usuários (extensão da tabela auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  role TEXT DEFAULT 'subscriber' CHECK (role IN ('admin', 'subscriber')),
  status TEXT DEFAULT 'active',
  tokens_used INTEGER DEFAULT 0,
  tokens_limit INTEGER DEFAULT 10000,
  subscription_plan TEXT DEFAULT 'basic',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- Configuração de permissões RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas para a tabela profiles
-- Permite que usuários leiam apenas seus próprios dados
CREATE POLICY "Usuários podem ver seus próprios perfis" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

-- Permite que usuários atualizem apenas seus próprios dados
CREATE POLICY "Usuários podem atualizar seus próprios perfis" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Tabela para armazenar conversas de chat
CREATE TABLE public.chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  title TEXT DEFAULT 'Nova Conversa',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  tokens_used INTEGER DEFAULT 0
);

-- Configuração de permissões para chats
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Políticas para a tabela chats
CREATE POLICY "Usuários podem ver seus próprios chats" 
  ON public.chats 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios chats" 
  ON public.chats 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios chats" 
  ON public.chats 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem excluir seus próprios chats" 
  ON public.chats 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Tabela para armazenar mensagens de chat
CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID REFERENCES public.chats ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant')),
  content TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Configuração de permissões para mensagens
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Políticas para a tabela messages
CREATE POLICY "Usuários podem ver mensagens dos seus próprios chats" 
  ON public.messages 
  FOR SELECT 
  USING (auth.uid() IN (
    SELECT user_id FROM public.chats WHERE id = messages.chat_id
  ));

CREATE POLICY "Usuários podem inserir mensagens nos seus próprios chats" 
  ON public.messages 
  FOR INSERT 
  WITH CHECK (auth.uid() IN (
    SELECT user_id FROM public.chats WHERE id = messages.chat_id
  ));

-- Trigger para atualizar o campo updated_at nos chats quando novas mensagens são adicionadas
CREATE OR REPLACE FUNCTION update_chat_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chats
  SET updated_at = NOW()
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_timestamp_trigger
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION update_chat_timestamp();

-- Função para criar um perfil automático quando um novo usuário se registra
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (new.id, new.raw_user_meta_data->>'username', new.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil quando um novo usuário é criado
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Inserir usuário administrador de exemplo (substitua o UUID por um real após criar o usuário)
-- Você deve criar esse usuário manualmente primeiro, depois pegar o UUID gerado
-- INSERT INTO public.profiles (id, username, email, role, status, tokens_limit, subscription_plan)
-- VALUES ('uuid-do-admin-aqui', 'admin', 'admin@fexia.com', 'admin', 'active', 100000, 'premium');

-- Adicionar índice para melhorar performance
CREATE INDEX idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX idx_chats_user_id ON public.chats(user_id); 