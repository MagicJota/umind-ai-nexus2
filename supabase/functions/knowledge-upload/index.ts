import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received knowledge upload request');
    const { fileContent, fileName, fileType, title, description, userId } = await req.json();
    console.log('Knowledge upload request:', { fileName, fileType, title, userId });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let extractedContent = fileContent;

    // Process different file types
    if (fileType === 'application/pdf') {
      extractedContent = await extractTextFromPDF(fileContent);
    } else if (fileType.startsWith('image/')) {
      if (openaiApiKey) {
        extractedContent = await extractTextFromImage(fileContent, openaiApiKey);
      } else {
        throw new Error('OpenAI API key not configured for image processing');
      }
    } else if (fileType.includes('text/') || fileType.includes('json')) {
      // Text files are already in the right format
      extractedContent = fileContent;
    }

    console.log('Content extracted, creating knowledge base entry');

    // Create knowledge base entry
    const { data, error } = await supabase
      .from('knowledge_bases')
      .insert({
        title: title || fileName,
        description: description || `Arquivo ${fileName} processado automaticamente`,
        content: extractedContent,
        file_name: fileName,
        file_type: fileType,
        file_size: new Blob([fileContent]).size,
        type: 'DOCUMENT',
        status: 'ACTIVE',
        created_by: userId,
        is_public: false
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    console.log('Knowledge base entry created successfully');

    return new Response(JSON.stringify({
      success: true,
      knowledgeBase: data,
      extractedContent: extractedContent.substring(0, 500) + (extractedContent.length > 500 ? '...' : ''),
      message: 'Arquivo processado e adicionado à base de conhecimento'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in knowledge-upload:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function extractTextFromPDF(base64Content: string): Promise<string> {
  // Simple PDF text extraction - in production, you'd use a proper PDF parser
  try {
    const pdfContent = atob(base64Content);
    // This is a very basic extraction - for production use pdf-parse or similar
    return 'Conteúdo do PDF processado - implementar parser PDF completo';
  } catch (error) {
    console.error('PDF extraction error:', error);
    return 'Erro ao processar PDF';
  }
}

async function extractTextFromImage(base64Content: string, openaiApiKey: string): Promise<string> {
  try {
    console.log('Calling OpenAI Vision API for image processing');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extraia todo o texto desta imagem. Se houver tabelas, preserve a estrutura. Retorne apenas o texto extraído.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Content}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const data = await response.json();
    console.log('OpenAI Vision API response received');
    return data.choices[0].message.content || 'Não foi possível extrair texto da imagem';
  } catch (error) {
    console.error('Error in OCR:', error);
    throw new Error(`Erro ao processar imagem com OCR: ${error.message}`);
  }
}
