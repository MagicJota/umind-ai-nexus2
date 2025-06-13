
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  const googleApiKey = Deno.env.get('GOOGLE_API_KEY');

  if (!googleApiKey) {
    socket.close(1000, "Google API key not configured");
    return response;
  }

  socket.onopen = () => {
    console.log("WebSocket connection established for Google Stream");
    socket.send(JSON.stringify({
      type: 'connection_established',
      message: 'MAGUS está pronto para conversar ao vivo!'
    }));
  };

  socket.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log("Received message:", data);

      if (data.type === 'chat_message') {
        const { message, knowledgeContext } = data;
        
        // Prepare system prompt
        const systemPrompt = `Você é MAGUS, um assistente AI inteligente da UMIND SALES que conversa ao vivo com o usuário. Seja natural, direto e útil. ${knowledgeContext ? `Contexto adicional: ${knowledgeContext}` : ''}`;

        // Call Google API with streaming
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key=${googleApiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nUsuário: ${message}` }]
            }],
            generationConfig: {
              temperature: 0.8,
              maxOutputTokens: 800,
            },
          }),
        });

        if (!response.ok) {
          throw new Error('Google API error');
        }

        // Stream the response
        const reader = response.body?.getReader();
        if (reader) {
          socket.send(JSON.stringify({
            type: 'stream_start',
            message: 'MAGUS está respondendo...'
          }));

          let fullResponse = '';
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const jsonData = JSON.parse(line.slice(6));
                  if (jsonData.candidates && jsonData.candidates[0].content) {
                    const text = jsonData.candidates[0].content.parts[0].text;
                    fullResponse += text;
                    
                    socket.send(JSON.stringify({
                      type: 'stream_chunk',
                      chunk: text,
                      fullResponse
                    }));
                  }
                } catch (parseError) {
                  console.error('Error parsing chunk:', parseError);
                }
              }
            }
          }

          socket.send(JSON.stringify({
            type: 'stream_complete',
            fullResponse,
            provider: 'google'
          }));
        }
      }
    } catch (error) {
      console.error('Error in stream processing:', error);
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Erro ao processar mensagem'
      }));
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  socket.onclose = () => {
    console.log("WebSocket connection closed");
  };

  return response;
});
