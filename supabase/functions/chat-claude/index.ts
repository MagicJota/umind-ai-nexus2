
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, knowledgeContext } = await req.json();
    console.log('Claude Request:', { messagesCount: messages?.length, hasContext: !!knowledgeContext });
    
    const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');
    
    if (!claudeApiKey) {
      console.error('Claude API key not configured');
      throw new Error('Claude API key not configured');
    }

    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }

    // Convert messages format for Claude
    const systemPrompt = `Você é MAGUS, uma inteligência artificial avançada da UMIND SALES. Seja natural, direto e útil em todas as suas capacidades. ${knowledgeContext ? `Contexto adicional: ${knowledgeContext}` : ''}`;
    
    const claudeMessages = messages.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));

    console.log('Calling Claude API with model claude-3-5-sonnet-20241022...');
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${claudeApiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        system: systemPrompt,
        messages: claudeMessages,
        max_tokens: 1000,
      }),
    });

    console.log('Claude Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error response:', errorText);
      
      // Parse error if it's JSON
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: { message: errorText } };
      }
      
      throw new Error(errorData.error?.message || `Claude API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Claude Response data received successfully');
    
    if (!data.content || !Array.isArray(data.content) || data.content.length === 0) {
      console.error('Invalid response structure from Claude:', data);
      throw new Error('Invalid response structure from Claude API');
    }

    const result = {
      message: data.content[0].text,
      model: 'claude-3-5-sonnet-20241022',
      provider: 'claude'
    };

    console.log('Returning successful Claude response');
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chat-claude:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      provider: 'claude'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
