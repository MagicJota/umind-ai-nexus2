import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');

  if (!claudeApiKey) {
    console.error("Claude API key not configured");
    socket.close(1000, "Claude API key not configured");
    return response;
  }

  socket.onopen = () => {
    console.log("WebSocket connection established for Claude Stream");
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

        console.log('Calling Claude API with streaming...');

        // Call Claude API with streaming
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${claudeApiKey}`,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
            'x-api-key': claudeApiKey
          },
          body: JSON.stringify({
            model: 'claude-3-sonnet-20240229',
            system: systemPrompt,
            messages: [{
              role: 'user',
              content: message
            }],
            max_tokens: 1000,
            temperature: 0.7,
            top_p: 0.95,
            stream: true
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Claude API error:', errorText);
          throw new Error('Claude API error: ' + errorText);
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
                    if (jsonData.type === 'content_block_delta' && jsonData.delta?.text) {
                      const text = jsonData.delta.text;
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
            provider: 'claude'
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