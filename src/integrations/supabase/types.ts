export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      daily_tips_shown: {
        Row: {
          created_at: string
          id: string
          shown_at: string
          tip_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          shown_at?: string
          tip_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          shown_at?: string
          tip_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          content: string | null
          created_at: string
          file_name: string | null
          file_path: string | null
          file_size: number | null
          file_type: string
          id: string
          language: string | null
          metadata: Json | null
          mime_type: string | null
          status: string
          summary: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type: string
          id?: string
          language?: string | null
          metadata?: Json | null
          mime_type?: string | null
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string
          id?: string
          language?: string | null
          metadata?: Json | null
          mime_type?: string | null
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exabot_profiles: {
        Row: {
          burnout_score: number | null
          created_at: string
          id: string
          last_activity_at: string | null
          last_break_suggestion_at: string | null
          learning_style: string | null
          optimal_study_times: Json | null
          personality_type: string | null
          streak_days: number | null
          study_preferences: Json | null
          total_study_minutes: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          burnout_score?: number | null
          created_at?: string
          id?: string
          last_activity_at?: string | null
          last_break_suggestion_at?: string | null
          learning_style?: string | null
          optimal_study_times?: Json | null
          personality_type?: string | null
          streak_days?: number | null
          study_preferences?: Json | null
          total_study_minutes?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          burnout_score?: number | null
          created_at?: string
          id?: string
          last_activity_at?: string | null
          last_break_suggestion_at?: string | null
          learning_style?: string | null
          optimal_study_times?: Json | null
          personality_type?: string | null
          streak_days?: number | null
          study_preferences?: Json | null
          total_study_minutes?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          concept: string | null
          created_at: string
          difficulty: string
          document_id: string | null
          exercise_type: string
          hints: Json | null
          id: string
          questions: Json
          solutions: Json
          subject: string | null
          time_estimate_minutes: number | null
          title: string
          updated_at: string
          user_id: string
          variant_number: number | null
        }
        Insert: {
          concept?: string | null
          created_at?: string
          difficulty?: string
          document_id?: string | null
          exercise_type?: string
          hints?: Json | null
          id?: string
          questions?: Json
          solutions?: Json
          subject?: string | null
          time_estimate_minutes?: number | null
          title: string
          updated_at?: string
          user_id: string
          variant_number?: number | null
        }
        Update: {
          concept?: string | null
          created_at?: string
          difficulty?: string
          document_id?: string | null
          exercise_type?: string
          hints?: Json | null
          id?: string
          questions?: Json
          solutions?: Json
          subject?: string | null
          time_estimate_minutes?: number | null
          title?: string
          updated_at?: string
          user_id?: string
          variant_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_decks: {
        Row: {
          created_at: string
          document_id: string
          id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_decks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          back: string
          created_at: string
          deck_id: string
          difficulty: string | null
          ease_factor: number | null
          front: string
          id: string
          interval_days: number | null
          next_review_at: string | null
          repetitions: number | null
          user_id: string
        }
        Insert: {
          back: string
          created_at?: string
          deck_id: string
          difficulty?: string | null
          ease_factor?: number | null
          front: string
          id?: string
          interval_days?: number | null
          next_review_at?: string | null
          repetitions?: number | null
          user_id: string
        }
        Update: {
          back?: string
          created_at?: string
          deck_id?: string
          difficulty?: string | null
          ease_factor?: number | null
          front?: string
          id?: string
          interval_days?: number | null
          next_review_at?: string | null
          repetitions?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "flashcard_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_item_downloads: {
        Row: {
          created_at: string
          download_url: string
          item_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          download_url: string
          item_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          download_url?: string
          item_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_item_downloads_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "marketplace_items"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_items: {
        Row: {
          category: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_published: boolean
          price_fcfa: number
          price_usd: number | null
          title: string
          type: Database["public"]["Enums"]["marketplace_item_type"]
          updated_at: string
        }
        Insert: {
          category?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          price_fcfa?: number
          price_usd?: number | null
          title: string
          type?: Database["public"]["Enums"]["marketplace_item_type"]
          updated_at?: string
        }
        Update: {
          category?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          price_fcfa?: number
          price_usd?: number | null
          title?: string
          type?: Database["public"]["Enums"]["marketplace_item_type"]
          updated_at?: string
        }
        Relationships: []
      }
      marketplace_purchases: {
        Row: {
          amount_fcfa: number
          completed_at: string | null
          created_at: string
          id: string
          item_id: string
          payment_method: string | null
          payment_reference: string | null
          status: Database["public"]["Enums"]["marketplace_purchase_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_fcfa: number
          completed_at?: string | null
          created_at?: string
          id?: string
          item_id: string
          payment_method?: string | null
          payment_reference?: string | null
          status?: Database["public"]["Enums"]["marketplace_purchase_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_fcfa?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          item_id?: string
          payment_method?: string | null
          payment_reference?: string | null
          status?: Database["public"]["Enums"]["marketplace_purchase_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_purchases_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "marketplace_items"
            referencedColumns: ["id"]
          },
        ]
      }
      mind_maps: {
        Row: {
          created_at: string
          document_id: string
          id: string
          nodes: Json
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          nodes?: Json
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          nodes?: Json
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mind_maps_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_exams: {
        Row: {
          ai_feedback: Json | null
          completed_at: string | null
          created_at: string
          difficulty: string | null
          document_id: string | null
          duration_minutes: number | null
          exam_type: string
          grading_scale: Json | null
          id: string
          instructions: string | null
          questions: Json
          started_at: string | null
          status: string | null
          subject: string | null
          title: string
          total_points: number | null
          updated_at: string
          user_answers: Json | null
          user_id: string
          user_score: number | null
        }
        Insert: {
          ai_feedback?: Json | null
          completed_at?: string | null
          created_at?: string
          difficulty?: string | null
          document_id?: string | null
          duration_minutes?: number | null
          exam_type: string
          grading_scale?: Json | null
          id?: string
          instructions?: string | null
          questions?: Json
          started_at?: string | null
          status?: string | null
          subject?: string | null
          title: string
          total_points?: number | null
          updated_at?: string
          user_answers?: Json | null
          user_id: string
          user_score?: number | null
        }
        Update: {
          ai_feedback?: Json | null
          completed_at?: string | null
          created_at?: string
          difficulty?: string | null
          document_id?: string | null
          duration_minutes?: number | null
          exam_type?: string
          grading_scale?: Json | null
          id?: string
          instructions?: string | null
          questions?: Json
          started_at?: string | null
          status?: string | null
          subject?: string | null
          title?: string
          total_points?: number | null
          updated_at?: string
          user_answers?: Json | null
          user_id?: string
          user_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mock_exams_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          color: string | null
          content: string | null
          created_at: string
          id: string
          is_pinned: boolean | null
          project_id: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          project_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          project_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      offline_content: {
        Row: {
          compressed_data: string | null
          content_id: string
          content_type: string
          created_at: string
          file_size: number | null
          id: string
          last_synced_at: string | null
          updated_at: string
          user_id: string
          version: number | null
        }
        Insert: {
          compressed_data?: string | null
          content_id: string
          content_type: string
          created_at?: string
          file_size?: number | null
          id?: string
          last_synced_at?: string | null
          updated_at?: string
          user_id: string
          version?: number | null
        }
        Update: {
          compressed_data?: string | null
          content_id?: string
          content_type?: string
          created_at?: string
          file_size?: number | null
          id?: string
          last_synced_at?: string | null
          updated_at?: string
          user_id?: string
          version?: number | null
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          verified: boolean | null
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          verified?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      pawapay_transactions: {
        Row: {
          amount: string
          callback_received: boolean | null
          completed_at: string | null
          created_at: string
          currency: string
          deposit_id: string
          failure_reason: string | null
          id: string
          phone_number: string
          provider: string
          status: string
          subscription_plan: string
          user_id: string
        }
        Insert: {
          amount: string
          callback_received?: boolean | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          deposit_id: string
          failure_reason?: string | null
          id?: string
          phone_number: string
          provider: string
          status?: string
          subscription_plan: string
          user_id: string
        }
        Update: {
          amount?: string
          callback_received?: boolean | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          deposit_id?: string
          failure_reason?: string | null
          id?: string
          phone_number?: string
          provider?: string
          status?: string
          subscription_plan?: string
          user_id?: string
        }
        Relationships: []
      }
      presentations: {
        Row: {
          created_at: string
          design_settings: Json | null
          document_id: string | null
          export_format: string | null
          id: string
          slides: Json
          speaker_notes: Json | null
          theme: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          design_settings?: Json | null
          document_id?: string | null
          export_format?: string | null
          id?: string
          slides?: Json
          speaker_notes?: Json | null
          theme?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          design_settings?: Json | null
          document_id?: string | null
          export_format?: string | null
          id?: string
          slides?: Json
          speaker_notes?: Json | null
          theme?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "presentations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          academic_level: string | null
          created_at: string
          first_name: string
          goals: string[] | null
          id: string
          last_name: string
          onboarding_completed: boolean
          profession: string
          professional_domain: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          academic_level?: string | null
          created_at?: string
          first_name?: string
          goals?: string[] | null
          id?: string
          last_name?: string
          onboarding_completed?: boolean
          profession?: string
          professional_domain?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          academic_level?: string | null
          created_at?: string
          first_name?: string
          goals?: string[] | null
          id?: string
          last_name?: string
          onboarding_completed?: boolean
          profession?: string
          professional_domain?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_documents: {
        Row: {
          created_at: string
          document_id: string
          id: string
          is_pinned: boolean | null
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          is_pinned?: boolean | null
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          is_pinned?: boolean | null
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          category: string | null
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_archived: boolean | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quizzes: {
        Row: {
          created_at: string
          difficulty: string
          document_id: string
          id: string
          questions: Json
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulty?: string
          document_id: string
          id?: string
          questions?: Json
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          difficulty?: string
          document_id?: string
          id?: string
          questions?: Json
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number | null
          created_at: string
          expires_at: string | null
          id: string
          payment_reference: string | null
          plan: Database["public"]["Enums"]["subscription_plan"]
          started_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          payment_reference?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          payment_reference?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      summaries: {
        Row: {
          created_at: string
          document_id: string
          id: string
          key_concepts: Json | null
          long_summary: string | null
          short_summary: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          key_concepts?: Json | null
          long_summary?: string | null
          short_summary?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          key_concepts?: Json | null
          long_summary?: string | null
          short_summary?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "summaries_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_response: string | null
          created_at: string
          email: string
          id: string
          message: string
          phone: string | null
          responded_at: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          phone?: string | null
          responded_at?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          phone?: string | null
          responded_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          position: number | null
          priority: string | null
          project_id: string | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number | null
          priority?: string | null
          project_id?: string | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number | null
          priority?: string | null
          project_id?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_tracking: {
        Row: {
          created_at: string
          documents_count: number
          flashcards_count: number
          id: string
          mind_maps_count: number
          period_start: string
          quizzes_count: number
          summaries_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          documents_count?: number
          flashcards_count?: number
          id?: string
          mind_maps_count?: number
          period_start?: string
          quizzes_count?: number
          summaries_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          documents_count?: number
          flashcards_count?: number
          id?: string
          mind_maps_count?: number
          period_start?: string
          quizzes_count?: number
          summaries_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_by: string | null
          blocked_until: string | null
          created_at: string
          id: string
          is_permanent: boolean | null
          reason: string | null
          user_id: string
        }
        Insert: {
          blocked_by?: string | null
          blocked_until?: string | null
          created_at?: string
          id?: string
          is_permanent?: boolean | null
          reason?: string | null
          user_id: string
        }
        Update: {
          blocked_by?: string | null
          blocked_until?: string | null
          created_at?: string
          id?: string
          is_permanent?: boolean | null
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          email: string | null
          id: string
          last_report_sent_at: string | null
          updated_at: string
          user_id: string
          weekly_reports_enabled: boolean
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          last_report_sent_at?: string | null
          updated_at?: string
          user_id: string
          weekly_reports_enabled?: boolean
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          last_report_sent_at?: string | null
          updated_at?: string
          user_id?: string
          weekly_reports_enabled?: boolean
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          email: string | null
          id: string
          ip_address: string | null
          last_active_at: string
          logged_in_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          email?: string | null
          id?: string
          ip_address?: string | null
          last_active_at?: string
          logged_in_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          email?: string | null
          id?: string
          ip_address?: string | null
          last_active_at?: string
          logged_in_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      weekly_stats: {
        Row: {
          created_at: string
          documents_created: number
          flashcards_created: number
          goals_achieved: number
          goals_set: number
          id: string
          mind_maps_created: number
          quizzes_created: number
          study_time_minutes: number
          summaries_created: number
          user_id: string
          week_end: string
          week_start: string
        }
        Insert: {
          created_at?: string
          documents_created?: number
          flashcards_created?: number
          goals_achieved?: number
          goals_set?: number
          id?: string
          mind_maps_created?: number
          quizzes_created?: number
          study_time_minutes?: number
          summaries_created?: number
          user_id: string
          week_end: string
          week_start: string
        }
        Update: {
          created_at?: string
          documents_created?: number
          flashcards_created?: number
          goals_achieved?: number
          goals_set?: number
          id?: string
          mind_maps_created?: number
          quizzes_created?: number
          study_time_minutes?: number
          summaries_created?: number
          user_id?: string
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_usage_limit: {
        Args: { p_resource_type: string; p_user_id: string }
        Returns: Json
      }
      cleanup_expired_otp_codes: { Args: never; Returns: undefined }
      cleanup_old_sessions: { Args: never; Returns: undefined }
      get_marketplace_download_url: {
        Args: { p_item_id: string }
        Returns: string
      }
      get_plan_limits: {
        Args: { plan_type: Database["public"]["Enums"]["subscription_plan"] }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_usage: {
        Args: { p_resource_type: string; p_user_id: string }
        Returns: undefined
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_user_blocked: { Args: { _user_id: string }; Returns: boolean }
      record_user_session: {
        Args: { p_user_agent: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      marketplace_item_type: "ebook" | "training"
      marketplace_purchase_status: "pending" | "completed" | "failed"
      subscription_plan: "free" | "monthly" | "yearly"
      subscription_status: "active" | "expired" | "cancelled" | "pending"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      marketplace_item_type: ["ebook", "training"],
      marketplace_purchase_status: ["pending", "completed", "failed"],
      subscription_plan: ["free", "monthly", "yearly"],
      subscription_status: ["active", "expired", "cancelled", "pending"],
    },
  },
} as const
