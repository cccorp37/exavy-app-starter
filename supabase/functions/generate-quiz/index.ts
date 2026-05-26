import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate Authorization header and extract user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Create client with user's auth context
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.user.id;
    const { documentId, questionCount = 10, difficulty = 'medium', focusArea = '', specificPart = '' } = await req.json();
    
    if (!documentId) {
      return new Response(
        JSON.stringify({ error: 'Document ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get document content - verify ownership
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('title, content')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (docError || !document?.content) {
      console.error('Document not found or no content:', docError);
      return new Response(
        JSON.stringify({ error: 'Document not found or not processed yet' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating quiz for:', document.title);

    const difficultyMap: Record<string, string> = {
      easy: 'Les questions doivent être simples et directes, testant la compréhension basique.',
      medium: 'Les questions doivent être de difficulté moyenne, testant la compréhension et l\'application.',
      hard: 'Les questions doivent être difficiles, testant l\'analyse et la synthèse des concepts.'
    };
    const difficultyPrompt = difficultyMap[difficulty] || difficultyMap.medium;

    // Personalization based on user profile
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('profession, academic_level, professional_domain, goals')
      .eq('user_id', userId)
      .maybeSingle();

    const personalization = userProfile ? `
PROFIL UTILISATEUR : ${userProfile.profession === 'academic' ? 'Étudiant' : 'Professionnel'}${userProfile.academic_level ? ` (${userProfile.academic_level})` : ''}${userProfile.professional_domain ? ` — ${userProfile.professional_domain}` : ''}.
Adapte le vocabulaire et les exemples à ce profil.` : '';

    // Build focus prompt if user specified a focus area or specific part
    let focusPrompt = '';
    if (focusArea) {
      focusPrompt += `\n\nFOCUS SPÉCIFIQUE: Concentre-toi principalement sur le thème/concept suivant: "${focusArea}". Les questions doivent principalement porter sur ce sujet.`;
    }
    if (specificPart) {
      focusPrompt += `\n\nPARTIE SPÉCIFIQUE: L'utilisateur veut des questions sur cette partie précise du document: "${specificPart}". Génère des questions uniquement sur cette section.`;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Tu es un expert en création de quiz éducatifs. Crée des QCM en français basés sur le contenu fourni.
${difficultyPrompt}${focusPrompt}
${personalization}

Format de réponse STRICTEMENT en JSON:
{
  "questions": [
    {
      "question": "La question...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Explication de la bonne réponse..."
    }
  ]
}`
          },
          {
            role: 'user',
            content: `Génère exactement ${questionCount} questions QCM basées sur ce contenu:\n\n${document.content.substring(0, 15000)}`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI error:', errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requêtes atteinte, réessayez plus tard.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error('Failed to generate quiz');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response
    let questions = [];
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        questions = parsed.questions || [];
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('Failed to parse quiz questions');
    }

    // Save quiz to database
    const { data: quiz, error: insertError } = await supabase
      .from('quizzes')
      .insert({
        document_id: documentId,
        user_id: userId,
        title: `Quiz: ${document.title}`,
        difficulty,
        questions
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error('Failed to save quiz');
    }

    console.log('Quiz generated with', questions.length, 'questions');

    return new Response(
      JSON.stringify({ success: true, quiz }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating quiz:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate quiz';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
