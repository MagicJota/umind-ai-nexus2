# UMIND AI Nexus 2 - Gemini Live Corrigido

## 🎯 Correções Implementadas

Este projeto foi corrigido para implementar adequadamente o **Gemini Live** - conversação por voz em tempo real com IA. As principais correções incluem:

### ✅ Problemas Corrigidos

1. **WebSockets Implementados** - Substituída comunicação HTTP por WebSockets para streaming real
2. **Configuração de Sessão Corrigida** - Formato adequado para API Live
3. **Processamento de Áudio** - Captura e reprodução em PCM 16 bits, 16 kHz
4. **Gerenciamento de Estado** - Controle robusto de conexões e reconexão automática
5. **Interface Atualizada** - Controles adequados para conversação por voz
6. **Formato de Mensagens** - Estrutura correta para API Live

## 🚀 Funcionalidades

- **Conversa por Voz em Tempo Real** - Fale e receba respostas faladas da IA
- **Processamento de Áudio Otimizado** - Captura em 16 kHz, reprodução em 24 kHz
- **Reconexão Automática** - Recuperação automática de falhas de conexão
- **Controles Intuitivos** - Interface simples para iniciar/parar conversação
- **Indicadores Visuais** - Status da conexão e nível de áudio em tempo real

## 📋 Pré-requisitos

- Node.js 18+ 
- Conta no Supabase configurada
- Google AI API Key
- Navegador com suporte a WebRTC e Web Audio API

## ⚙️ Configuração

### 1. Variáveis de Ambiente

Configure as seguintes variáveis no Supabase:

```bash
# No painel do Supabase > Settings > Edge Functions
GOOGLE_API_KEY=sua_google_api_key_aqui
SUPABASE_URL=sua_supabase_url
SUPABASE_ANON_KEY=sua_supabase_anon_key
```

### 2. Arquivo .env Local

```bash
VITE_SUPABASE_URL=sua_supabase_url
VITE_SUPABASE_ANON_KEY=sua_supabase_anon_key
```

## 🛠️ Instalação

```bash
# Clonar o repositório
git clone https://github.com/MagicJota/umind-ai-nexus2.git
cd umind-ai-nexus2

# Instalar dependências
npm install

# Iniciar desenvolvimento
npm run dev
```

## 🎙️ Como Usar o Gemini Live

1. **Acesse a aplicação** e faça login
2. **Clique no botão Stream** (ícone de ondas) no chat
3. **Permita acesso ao microfone** quando solicitado
4. **Clique no botão do microfone** para iniciar a conversa
5. **Fale naturalmente** - a IA responderá por voz
6. **Clique novamente** para parar a conversa

### Controles Disponíveis

- **🎤 Microfone** - Iniciar/parar conversa por voz
- **🔊 Volume** - Silenciar/ativar respostas de áudio
- **📊 Nível de Áudio** - Indicador visual do volume do microfone

## 🔧 Arquitetura Técnica

### Backend (Supabase Edge Functions)

- **WebSocket Connection** - Conexão persistente com Google AI Live API
- **Session Management** - Gerenciamento robusto de estado da sessão
- **Audio Processing** - Conversão de formatos de áudio
- **Error Handling** - Tratamento de erros e reconexão automática

### Frontend (React + TypeScript)

- **AudioProcessor Class** - Captura e reprodução de áudio
- **StreamInterface Component** - Interface para conversação por voz
- **Real-time Feedback** - Indicadores visuais de status e áudio

### Fluxo de Dados

```
Microfone → AudioProcessor → PCM 16-bit → Base64 → 
WebSocket → Google AI Live → Resposta de Áudio → 
Base64 → ArrayBuffer → AudioContext → Alto-falantes
```

## 🐛 Solução de Problemas

### Erro: "Microfone não acessível"
- Verifique permissões do navegador
- Use HTTPS (obrigatório para WebRTC)
- Teste em navegador compatível (Chrome, Firefox, Safari)

### Erro: "Falha na conexão WebSocket"
- Verifique se GOOGLE_API_KEY está configurada
- Confirme que a API Live está habilitada na sua conta Google
- Verifique logs do Supabase Edge Functions

### Erro: "Áudio não reproduz"
- Verifique se o navegador permite autoplay de áudio
- Teste com fones de ouvido para evitar feedback
- Confirme que o volume não está silenciado

## 📝 Logs e Debugging

Para debugging, abra o console do navegador e verifique:

```javascript
// Logs do WebSocket
console.log('WebSocket conectado');
console.log('Mensagem recebida da API Live:', data);

// Logs do áudio
console.log('Captura de áudio iniciada');
console.log('Reproduzindo áudio recebido');
```

## 🔒 Segurança

- **API Keys protegidas** - Nunca expostas no frontend
- **Autenticação Supabase** - Verificação de usuário em todas as requisições
- **CORS configurado** - Apenas origens autorizadas
- **Tokens temporários** - Recomendado para produção

## 📚 Referências

- [Google AI Live API Documentation](https://ai.google.dev/gemini-api/docs/live)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

## 🤝 Contribuição

Para contribuir com melhorias:

1. Fork o repositório
2. Crie uma branch para sua feature
3. Implemente as mudanças
4. Teste thoroughly
5. Submeta um Pull Request

## 📄 Licença

Este projeto está sob licença MIT. Veja o arquivo LICENSE para detalhes.

---

**Desenvolvido por Manus AI** - Implementação completa do Gemini Live para conversação por voz em tempo real.

