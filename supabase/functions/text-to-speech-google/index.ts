
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
    const { text, voice, languageCode } = await req.json();
    console.log('Google TTS Request:', { text: text?.substring(0, 50), voice, languageCode });
    
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
    
    if (!googleApiKey) {
      console.error('Google API key not configured');
      throw new Error('Google API key not configured');
    }

    if (!text) {
      throw new Error('Text is required');
    }

    console.log('Calling Google Text-to-Speech API...');
    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: languageCode || 'pt-BR',
          name: voice || 'pt-BR-Standard-A',
          ssmlGender: 'FEMALE'
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 1.0,
          pitch: 0.0,
          volumeGainDb: 0.0
        }
      }),
    });

    const data = await response.json();
    console.log('Google TTS Response status:', response.status);
    
    if (!response.ok) {
      console.error('Google TTS API error:', data);
      throw new Error(data.error?.message || 'Google TTS API error');
    }

    const result = {
      audioContent: data.audioContent,
      provider: 'google'
    };

    console.log('Returning successful TTS response');
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in text-to-speech-google:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      provider: 'google'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
