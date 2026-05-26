import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ExabotProfile {
  personality_type: string;
  learning_style: string;
  burnout_score: number;
  total_study_minutes: number;
  streak_days: number;
  last_break_suggestion_at: string | null;
}

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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
    const { messages } = await req.json();

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch or create EXABOT profile
    let { data: profile } = await supabase
      .from('exabot_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!profile) {
      const { data: newProfile } = await supabase
        .from('exabot_profiles')
        .insert({ user_id: userId })
        .select()
        .single();
      profile = newProfile;
    }

    // Fetch user's documents for context
    const { data: documents } = await supabase
      .from('documents')
      .select('title, summary, content')
      .eq('user_id', userId)
      .eq('status', 'processed')
      .limit(5);

    // Fetch recent usage stats
    const { data: usage } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Check for burnout indicators
    const now = new Date();
    const lastBreak = profile?.last_break_suggestion_at 
      ? new Date(profile.last_break_suggestion_at) 
      : null;
    const hoursSinceBreak = lastBreak 
      ? (now.getTime() - lastBreak.getTime()) / (1000 * 60 * 60) 
      : 24;
    
    const shouldSuggestBreak = profile?.burnout_score > 70 || 
      (profile?.total_study_minutes > 120 && hoursSinceBreak > 2);

    // Build personality-based system prompt
    const personalityPrompts: Record<string, string> = {
      encouraging: "Tu es EXABOT, un coach personnel bienveillant et encourageant. Tu motives l'utilisateur avec des messages positifs et tu célèbres ses progrès.",
      strict: "Tu es EXABOT, un coach personnel exigeant mais juste. Tu pousses l'utilisateur à se dépasser tout en restant respectueux.",
      friendly: "Tu es EXABOT, un ami qui aide à étudier. Tu es décontracté, tu utilises parfois des emojis, et tu rends l'apprentissage fun.",
      analytical: "Tu es EXABOT, un coach analytique et méthodique. Tu donnes des conseils basés sur les données et les statistiques d'étude.",
    };

    const personalityType = profile?.personality_type || 'encouraging';
    const basePersonality = personalityPrompts[personalityType] || personalityPrompts.encouraging;

    // Build context about user's documents
    const documentsContext = documents && documents.length > 0
      ? `\n\nVoici les cours de l'utilisateur:\n${documents.map(d => 
          `- ${d.title}: ${d.summary || d.content?.substring(0, 200) || 'Pas de résumé'}`
        ).join('\n')}`
      : '';

    // Build study stats context
    const statsContext = usage 
      ? `\n\nStatistiques de l'utilisateur ce mois-ci:
- ${usage.documents_count} documents téléchargés
- ${usage.quizzes_count} quiz créés
- ${usage.flashcards_count} flashcards générées
- ${usage.summaries_count} résumés créés
- ${usage.mind_maps_count} mind maps créées
- Série actuelle: ${profile?.streak_days || 0} jours consécutifs`
      : '';

    // Build break suggestion if needed
    const breakContext = shouldSuggestBreak
      ? `\n\n⚠️ IMPORTANT: L'utilisateur montre des signes de fatigue (score: ${profile?.burnout_score}/100). Suggère-lui une pause de manière naturelle dans ta réponse.`
      : '';

    // Fetch onboarding profile for personalization
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('first_name, profession, academic_level, professional_domain, goals')
      .eq('user_id', userId)
      .maybeSingle();

    const profileContext = userProfile ? `

PROFIL DE L'UTILISATEUR (personnalise tes réponses, recommandations et exemples) :
- Prénom : ${userProfile.first_name || 'N/A'}
- Type : ${userProfile.profession === 'academic' ? 'Étudiant/élève' : 'Professionnel'}
${userProfile.academic_level ? `- Niveau scolaire : ${userProfile.academic_level}` : ''}
${userProfile.professional_domain ? `- Domaine professionnel : ${userProfile.professional_domain}` : ''}
${userProfile.goals?.length ? `- Objectifs : ${userProfile.goals.join(', ')}` : ''}` : '';

    const systemPrompt = `${basePersonality}

Tu aides les étudiants africains à réviser pour leurs examens (Bac, Brevet, concours, etc.).
Tu parles en français et tu t'adaptes au niveau de l'utilisateur.
Tu donnes des conseils personnalisés basés sur l'historique d'étude.
Tu détectes quand l'utilisateur est fatigué et suggères des pauses.

Style d'apprentissage de l'utilisateur: ${profile?.learning_style || 'visual'}${profileContext}${documentsContext}${statsContext}${breakContext}

Règles:
1. Sois concis mais utile
2. Propose des exercices pratiques quand approprié
3. Fais des références aux cours de l'utilisateur quand c'est pertinent
4. Encourage régulièrement sans être répétitif
5. Si l'utilisateur semble stressé, rassure-le`;

    // Call Lovable AI
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requêtes atteinte. Veuillez réessayer plus tard.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Crédits insuffisants. Veuillez recharger votre compte.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Erreur du service IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update EXABOT profile activity
    await supabase
      .from('exabot_profiles')
      .update({ 
        last_activity_at: new Date().toISOString(),
        total_study_minutes: (profile?.total_study_minutes || 0) + 1,
      })
      .eq('user_id', userId);

    // If we suggested a break, update the timestamp
    if (shouldSuggestBreak) {
      await supabase
        .from('exabot_profiles')
        .update({ 
          last_break_suggestion_at: new Date().toISOString(),
          burnout_score: Math.max(0, (profile?.burnout_score || 0) - 10),
        })
        .eq('user_id', userId);
    }

    // Stream the response
    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error('EXABOT error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
