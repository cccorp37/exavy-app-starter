import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExamQuestion {
  id: string;
  type: 'qcm' | 'open' | 'calculation' | 'essay' | 'true_false';
  question: string;
  points: number;
  options?: string[];
  correctAnswer?: string | number;
  gradingCriteria?: string;
  difficulty: 'easy' | 'medium' | 'hard';
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
    const { 
      documentId, 
      examType, 
      subject, 
      difficulty, 
      durationMinutes,
      questionCount 
    } = await req.json();

    if (!documentId) {
      return new Response(
        JSON.stringify({ error: 'documentId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if user is admin (bypass premium check)
    const { data: isAdminResult } = await supabase.rpc('is_admin', { _user_id: userId });
    const isAdmin = isAdminResult === true;

    // Check premium subscription if not admin
    if (!isAdmin) {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('plan, status, expires_at')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      const isPremium = subscription?.plan === 'monthly' || subscription?.plan === 'yearly';
      if (!isPremium) {
        return new Response(
          JSON.stringify({ error: 'Premium subscription required', isPremium: false }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch document content - verify ownership
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('title, content, summary')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (docError || !document) {
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contentToUse = document.content || document.summary || '';
    if (contentToUse.length < 100) {
      return new Response(
        JSON.stringify({ error: 'Document content too short for exam generation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build exam format based on type
    const examFormats: Record<string, string> = {
      bac: `Format Baccalauréat français:
- Durée: 4 heures
- 3 parties: compréhension (8 pts), analyse (6 pts), production (6 pts)
- Questions de type dissertation, commentaire de texte, exercices`,
      brevet: `Format Brevet des collèges:
- Durée: 2 heures
- 2 parties: analyse de document (20 pts), rédaction (20 pts)
- Questions directes et exercices pratiques`,
      concours: `Format Concours d'entrée:
- Questions à choix multiples
- Questions ouvertes courtes
- Problèmes à résoudre avec méthode`,
      custom: `Format personnalisé:
- Mix de QCM et questions ouvertes
- Exercices pratiques
- Barème flexible`,
    };

    const format = examFormats[examType] || examFormats.custom;
    const numQuestions = questionCount || 10;

    // Personalization based on user profile
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('first_name, profession, academic_level, professional_domain, goals')
      .eq('user_id', userId)
      .maybeSingle();

    const personalization = userProfile ? `

PROFIL DE L'UTILISATEUR :
- Type : ${userProfile.profession === 'academic' ? 'Étudiant/élève' : 'Professionnel'}
${userProfile.academic_level ? `- Niveau scolaire : ${userProfile.academic_level}` : ''}
${userProfile.professional_domain ? `- Domaine professionnel : ${userProfile.professional_domain}` : ''}
${userProfile.goals?.length ? `- Objectifs : ${userProfile.goals.join(', ')}` : ''}
Adapte la formulation, la complexité et les contextes à ce profil.` : '';

    const systemPrompt = `Tu es un générateur d'examens professionnel pour les étudiants africains francophones.
Tu crées des sujets d'examen réalistes basés sur le contenu fourni.

${format}
${personalization}

RÈGLES STRICTES:
1. Génère exactement ${numQuestions} questions
2. Respecte le niveau de difficulté: ${difficulty || 'medium'}
3. Chaque question doit avoir un barème clair
4. Inclus la correction et les critères de notation pour chaque question
5. Varie les types de questions (QCM, questions ouvertes, calculs, etc.)
6. Le total des points doit être de 20

IMPORTANT: Tu dois répondre UNIQUEMENT avec un JSON valide, sans texte avant ou après.`;

    const userPrompt = `Génère un sujet d'examen de type "${examType}" pour la matière "${subject || 'général'}" basé sur ce contenu:

${contentToUse.substring(0, 8000)}

Réponds avec ce format JSON exact:
{
  "title": "Titre de l'examen",
  "instructions": "Consignes générales pour l'examen",
  "totalPoints": 20,
  "questions": [
    {
      "id": "q1",
      "type": "qcm|open|calculation|essay|true_false",
      "question": "Texte de la question",
      "points": 2,
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A ou texte de la réponse",
      "gradingCriteria": "Critères de notation détaillés",
      "difficulty": "easy|medium|hard"
    }
  ],
  "gradingScale": {
    "A": "18-20",
    "B": "16-18", 
    "C": "14-16",
    "D": "10-14",
    "E": "0-10"
  }
}`;

    // Call Lovable AI with tool calling for structured output
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
          { role: 'user', content: userPrompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_exam',
              description: 'Generate a structured mock exam',
              parameters: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  instructions: { type: 'string' },
                  totalPoints: { type: 'number' },
                  questions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        type: { type: 'string', enum: ['qcm', 'open', 'calculation', 'essay', 'true_false'] },
                        question: { type: 'string' },
                        points: { type: 'number' },
                        options: { type: 'array', items: { type: 'string' } },
                        correctAnswer: { type: 'string' },
                        gradingCriteria: { type: 'string' },
                        difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
                      },
                      required: ['id', 'type', 'question', 'points', 'difficulty'],
                    },
                  },
                  gradingScale: { type: 'object' },
                },
                required: ['title', 'instructions', 'questions'],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'generate_exam' } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requêtes atteinte' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Erreur du service IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    console.log('AI Response:', JSON.stringify(aiResponse, null, 2));

    // Extract the exam data from tool call
    let examData;
    if (aiResponse.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) {
      examData = JSON.parse(aiResponse.choices[0].message.tool_calls[0].function.arguments);
    } else if (aiResponse.choices?.[0]?.message?.content) {
      // Try to parse from content if no tool call
      const content = aiResponse.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        examData = JSON.parse(jsonMatch[0]);
      }
    }

    if (!examData || !examData.questions) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate exam structure' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save the exam to database
    const { data: savedExam, error: saveError } = await supabase
      .from('mock_exams')
      .insert({
        user_id: userId,
        document_id: documentId,
        title: examData.title || `Examen - ${document.title}`,
        exam_type: examType,
        subject: subject,
        duration_minutes: durationMinutes || 120,
        total_points: examData.totalPoints || 20,
        questions: examData.questions,
        grading_scale: examData.gradingScale || {},
        instructions: examData.instructions,
        difficulty: difficulty || 'medium',
        status: 'draft',
      })
      .select()
      .single();

    if (saveError) {
      console.error('Save error:', saveError);
      return new Response(
        JSON.stringify({ error: 'Failed to save exam' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        exam: savedExam,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Generate mock exam error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
