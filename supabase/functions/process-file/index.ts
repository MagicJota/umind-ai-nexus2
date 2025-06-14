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
    const { fileUrl, fileType, prompt } = await req.json();
    
    if (!fileUrl || !fileType || !prompt) {
      throw new Error('fileUrl, fileType and prompt are required');
    }

    const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
    
    if (!googleApiKey) {
      throw new Error('Google API key not configured');
    }

    // Download the file
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error('Failed to download file');
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const base64File = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));

    // Call Google Gemini Pro Vision API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-pro-vision:generateContent?key=${googleApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: fileType,
                data: base64File
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 2048,
          topP: 0.95,
          topK: 40
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google API error: ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response from Google API');
    }

    return new Response(JSON.stringify({
      result: data.candidates[0].content.parts[0].text,
      provider: 'google'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing file:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      provider: 'google'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}); 