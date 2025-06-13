
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
    const { query, knowledgeBaseIds, userId } = await req.json();
    console.log('Knowledge search request:', { query, knowledgeBaseIds, userId });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get accessible knowledge bases for user
    let knowledgeQuery = supabase
      .from('knowledge_bases')
      .select('id, title, content, description')
      .eq('status', 'ACTIVE');

    if (knowledgeBaseIds && knowledgeBaseIds.length > 0) {
      knowledgeQuery = knowledgeQuery.in('id', knowledgeBaseIds);
    }

    // Apply access control
    knowledgeQuery = knowledgeQuery.or(`is_public.eq.true,created_by.eq.${userId}`);

    const { data: knowledgeBases, error } = await knowledgeQuery;

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!knowledgeBases || knowledgeBases.length === 0) {
      return new Response(JSON.stringify({
        results: [],
        context: '',
        message: 'Nenhuma base de conhecimento encontrada'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Simple text-based search for now (can be enhanced with embeddings later)
    const queryLower = query.toLowerCase();
    const searchResults = knowledgeBases
      .filter(kb => 
        kb.content?.toLowerCase().includes(queryLower) ||
        kb.title?.toLowerCase().includes(queryLower) ||
        kb.description?.toLowerCase().includes(queryLower)
      )
      .map(kb => ({
        id: kb.id,
        title: kb.title,
        relevantContent: extractRelevantContent(kb.content || '', query, 200),
        score: calculateRelevanceScore(kb, query)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // Create context for AI
    const context = searchResults
      .map(result => `${result.title}: ${result.relevantContent}`)
      .join('\n\n');

    return new Response(JSON.stringify({
      results: searchResults,
      context,
      totalKnowledgeBases: knowledgeBases.length,
      searchQuery: query
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in knowledge-search:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      results: [],
      context: ''
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function extractRelevantContent(content: string, query: string, maxLength: number): string {
  const queryLower = query.toLowerCase();
  const contentLower = content.toLowerCase();
  const index = contentLower.indexOf(queryLower);
  
  if (index === -1) {
    return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
  }
  
  const start = Math.max(0, index - 50);
  const end = Math.min(content.length, start + maxLength);
  
  return (start > 0 ? '...' : '') + 
         content.substring(start, end) + 
         (end < content.length ? '...' : '');
}

function calculateRelevanceScore(kb: any, query: string): number {
  const queryLower = query.toLowerCase();
  let score = 0;
  
  // Title matches are more important
  if (kb.title?.toLowerCase().includes(queryLower)) {
    score += 10;
  }
  
  // Description matches
  if (kb.description?.toLowerCase().includes(queryLower)) {
    score += 5;
  }
  
  // Content matches
  const content = kb.content?.toLowerCase() || '';
  const matches = (content.match(new RegExp(queryLower, 'g')) || []).length;
  score += matches;
  
  return score;
}
