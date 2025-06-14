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
    console.log('Google Request:', { messagesCount: messages?.length, hasContext: !!knowledgeContext });
    
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
    
    if (!googleApiKey) {
      console.error('Google API key not configured');
      throw new Error('Google API key not configured');
    }

    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }

    // Convert messages to Google format
    const contents = messages.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Add system instruction through the first message
    const systemPrompt = `Você é MAGUS, uma inteligência artificial avançada da UMIND SALES. Seja natural, direto e útil em todas as suas capacidades. ${knowledgeContext ? `Contexto adicional: ${knowledgeContext}` : ''}`;
    
    if (contents.length > 0) {
      contents[0].parts[0].text = `${systemPrompt}\n\nUsuário: ${contents[0].parts[0].text}`;
    }

    console.log('Calling Google API...');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${googleApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
          topP: 0.95,
          topK: 40
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      }),
    });

    const data = await response.json();
    console.log('Google Response status:', response.status);
    
    if (!response.ok) {
      console.error('Google API error:', data);
      throw new Error(data.error?.message || 'Google API error');
    }

    const result = {
      message: data.candidates[0].content.parts[0].text,
      model: 'gemini-1.5-pro',
      provider: 'google'
    };

    console.log('Returning successful response');
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chat-google:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      provider: 'google'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
