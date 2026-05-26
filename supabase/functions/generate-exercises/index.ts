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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin (bypass premium check)
    const { data: isAdminResult } = await supabase.rpc('is_admin', { _user_id: user.id });
    const isAdmin = isAdminResult === true;

    // Check premium status if not admin
    if (!isAdmin) {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      const isPremium = subscription && 
        (subscription.plan === 'monthly' || subscription.plan === 'yearly') &&
        (!subscription.expires_at || new Date(subscription.expires_at) > new Date());

      if (!isPremium) {
        return new Response(JSON.stringify({ 
          error: 'Premium subscription required',
          isPremium: false 
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const { documentId, difficulty, exerciseType, concept, generateVariant } = await req.json();

    // Fetch document content
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (docError || !document) {
      return new Response(JSON.stringify({ error: 'Document not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check how many variants already exist for this concept
    let variantNumber = 1;
    if (generateVariant && concept) {
      const { count } = await supabase
        .from('exercises')
        .select('*', { count: 'exact', head: true })
        .eq('document_id', documentId)
        .eq('concept', concept);
      variantNumber = (count || 0) + 1;
    }

    const difficultyPrompts: Record<string, string> = {
      easy: "Niveau facile : questions directes, concepts de base, peu de calculs complexes.",
      medium: "Niveau moyen : questions nécessitant réflexion, application des concepts, quelques étapes de résolution.",
      hard: "Niveau difficile : questions avancées, synthèse de plusieurs concepts, résolution multi-étapes.",
      expert: "Niveau expert : questions de type concours/olympiades, raisonnement approfondi requis."
    };

    const typePrompts: Record<string, string> = {
      practice: "Exercices d'entraînement classiques avec questions variées.",
      drill: "Exercices de drill : répétition intensive sur un concept spécifique.",
      application: "Exercices d'application : mise en situation concrète des concepts.",
      synthesis: "Exercices de synthèse : combinaison de plusieurs notions du cours."
    };

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Personalization based on user profile
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('first_name, profession, academic_level, professional_domain, goals')
      .eq('user_id', user.id)
      .maybeSingle();

    const personalization = userProfile ? `

PROFIL DE L'UTILISATEUR (à utiliser pour adapter l'exercice) :
- Type : ${userProfile.profession === 'academic' ? 'Étudiant/élève' : 'Professionnel'}
${userProfile.academic_level ? `- Niveau scolaire : ${userProfile.academic_level}` : ''}
${userProfile.professional_domain ? `- Domaine professionnel : ${userProfile.professional_domain}` : ''}
${userProfile.goals?.length ? `- Objectifs : ${userProfile.goals.join(', ')}` : ''}
Adapte le vocabulaire, la complexité et les exemples concrets à ce profil.` : '';

    const systemPrompt = `Tu es un professeur expert en création d'exercices pédagogiques.
Tu crées des exercices pratiques basés sur le contenu du document fourni.

${difficultyPrompts[difficulty] || difficultyPrompts.medium}
${typePrompts[exerciseType] || typePrompts.practice}
${personalization}

${generateVariant ? `Ceci est la variante ${variantNumber} pour le concept "${concept}". Crée un exercice similaire mais avec des valeurs/contextes différents.` : ''}

Génère un exercice avec des questions progressives et des solutions détaillées étape par étape.`;

    const userPrompt = `Contenu du document "${document.title}":

${document.content?.substring(0, 8000) || document.summary || 'Pas de contenu disponible'}

${concept ? `Concept ciblé : ${concept}` : ''}

Génère un exercice pratique en format JSON avec cette structure exacte:
{
  "title": "Titre de l'exercice",
  "subject": "Matière",
  "time_estimate_minutes": nombre,
  "questions": [
    {
      "id": 1,
      "question": "Énoncé de la question",
      "type": "open" | "calculation" | "multiple_choice" | "true_false",
      "points": nombre,
      "choices": ["choix1", "choix2"] // si multiple_choice
    }
  ],
  "solutions": [
    {
      "question_id": 1,
      "answer": "Réponse",
      "steps": [
        {
          "step": 1,
          "explanation": "Explication de l'étape",
          "result": "Résultat intermédiaire"
        }
      ],
      "common_mistakes": ["Erreur fréquente 1"]
    }
  ],
  "hints": [
    {
      "question_id": 1,
      "hints": ["Indice 1", "Indice 2"]
    }
  ]
}

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error('Failed to generate exercises');
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '';

    // Parse JSON from response
    let exerciseData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        exerciseData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('Failed to parse exercise data');
    }

    // Save exercise to database
    const { data: exercise, error: insertError } = await supabase
      .from('exercises')
      .insert({
        user_id: user.id,
        document_id: documentId,
        title: exerciseData.title || `Exercice - ${document.title}`,
        subject: exerciseData.subject || null,
        difficulty,
        exercise_type: exerciseType,
        questions: exerciseData.questions || [],
        solutions: exerciseData.solutions || [],
        hints: exerciseData.hints || [],
        concept: concept || null,
        variant_number: variantNumber,
        time_estimate_minutes: exerciseData.time_estimate_minutes || 30,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error('Failed to save exercise');
    }

    return new Response(JSON.stringify({ exercise }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Generate exercises error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
