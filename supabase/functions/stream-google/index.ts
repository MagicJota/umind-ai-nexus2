
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
    console.error("Google API key not configured");
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
        
        if (!message) {
          throw new Error('Message is required');
        }
        
        // Prepare system prompt
        const systemPrompt = `Você é MAGUS, uma inteligência artificial avançada da UMIND SALES. Seja natural, direto e útil em todas as suas capacidades. ${knowledgeContext ? `Contexto adicional: ${knowledgeContext}` : ''}`;

        console.log('Calling Google Streaming API...');

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
          const errorData = await response.text();
          console.error('Google API error:', errorData);
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
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = new TextDecoder().decode(value);
              const lines = chunk.split('\n').filter(line => line.trim());
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const jsonData = JSON.parse(line.slice(6));
                    if (jsonData.candidates && jsonData.candidates[0]?.content?.parts?.[0]?.text) {
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
          } finally {
            reader.releaseLock();
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
        message: 'Erro ao processar mensagem: ' + error.message
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
