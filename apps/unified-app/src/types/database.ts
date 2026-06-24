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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_auth_uid: string
          created_at: string
          id: string
          payload: Json | null
        }
        Insert: {
          action: string
          admin_auth_uid: string
          created_at?: string
          id?: string
          payload?: Json | null
        }
        Update: {
          action?: string
          admin_auth_uid?: string
          created_at?: string
          id?: string
          payload?: Json | null
        }
        Relationships: []
      }
      admin_backup_files: {
        Row: {
          created_at: string | null
          created_by: string | null
          filename: string
          id: string
          size_bytes: number | null
          storage_path: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          filename: string
          id?: string
          size_bytes?: number | null
          storage_path: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          filename?: string
          id?: string
          size_bytes?: number | null
          storage_path?: string
          type?: string | null
        }
        Relationships: []
      }
      admin_locations: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          radius_meters: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          radius_meters?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          radius_meters?: number | null
        }
        Relationships: []
      }
      admin_totp_secrets: {
        Row: {
          backup_codes: string[] | null
          enabled: boolean | null
          secret_encrypted: string
          user_id: string
        }
        Insert: {
          backup_codes?: string[] | null
          enabled?: boolean | null
          secret_encrypted: string
          user_id: string
        }
        Update: {
          backup_codes?: string[] | null
          enabled?: boolean | null
          secret_encrypted?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_totp_secrets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      admins: {
        Row: {
          auth_user_id: string | null
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          name: string
          password_hash: string | null
          phone: string | null
          role: string | null
          roles: string[] | null
          updated_at: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          name: string
          password_hash?: string | null
          phone?: string | null
          role?: string | null
          roles?: string[] | null
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string
          password_hash?: string | null
          phone?: string | null
          role?: string | null
          roles?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      agent_availability: {
        Row: {
          active_chat_count: number
          agent_id: string
          id: string
          is_available: boolean
          is_online: boolean
          last_seen_at: string
          max_concurrent_chats: number
        }
        Insert: {
          active_chat_count?: number
          agent_id: string
          id?: string
          is_available?: boolean
          is_online?: boolean
          last_seen_at?: string
          max_concurrent_chats?: number
        }
        Update: {
          active_chat_count?: number
          agent_id?: string
          id?: string
          is_available?: boolean
          is_online?: boolean
          last_seen_at?: string
          max_concurrent_chats?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_availability_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
        ]
      }
      allowed_onboarding_emails: {
        Row: {
          created_at: string | null
          email: string
          id: string
          role: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          role?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          role?: string | null
        }
        Relationships: []
      }
      attendance_approval_requests: {
        Row: {
          attendance_id: string | null
          created_at: string | null
          id: string
          officer_id: string | null
          status: string | null
        }
        Insert: {
          attendance_id?: string | null
          created_at?: string | null
          id?: string
          officer_id?: string | null
          status?: string | null
        }
        Update: {
          attendance_id?: string | null
          created_at?: string | null
          id?: string
          officer_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_approval_requests_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_exceptions: {
        Row: {
          check_in_time: string | null
          created_at: string
          id: string
          officer_id: string
          reason: string | null
          shift_id: string | null
          status: string
        }
        Insert: {
          check_in_time?: string | null
          created_at?: string
          id?: string
          officer_id: string
          reason?: string | null
          shift_id?: string | null
          status?: string
        }
        Update: {
          check_in_time?: string | null
          created_at?: string
          id?: string
          officer_id?: string
          reason?: string | null
          shift_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_exceptions_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_exceptions_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          category: string | null
          description: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          status: string | null
          target_entity: string | null
          timestamp: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          category?: string | null
          description?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          status?: string | null
          target_entity?: string | null
          timestamp?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          category?: string | null
          description?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          status?: string | null
          target_entity?: string | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_notifications: {
        Row: {
          audience_area: string | null
          audience_estimated_count: number | null
          audience_officer_ids: string[] | null
          audience_plan_id: string | null
          audience_plan_name: string | null
          audience_type: string
          audience_user_ids: string[] | null
          audience_user_names: string[] | null
          created_at: string | null
          created_by_id: string
          created_by_name: string
          deep_link_url: string | null
          delivery_rate: number | null
          event_type: string
          failed_tokens: string[] | null
          id: string
          image_url: string | null
          is_auto_generated: boolean | null
          is_draft: boolean | null
          is_scheduled: boolean | null
          linked_plan_id: string | null
          linked_request_id: string | null
          linked_ticket_id: string | null
          message: string
          open_rate: number | null
          priority: string
          processing_ms: number | null
          scheduled_at: string | null
          sent_at: string | null
          status: string
          tags: string[] | null
          timezone: string | null
          title: string
          total_delivered: number | null
          total_failed: number | null
          total_opened: number | null
          total_sent: number | null
          total_targeted: number | null
          updated_at: string | null
        }
        Insert: {
          audience_area?: string | null
          audience_estimated_count?: number | null
          audience_officer_ids?: string[] | null
          audience_plan_id?: string | null
          audience_plan_name?: string | null
          audience_type: string
          audience_user_ids?: string[] | null
          audience_user_names?: string[] | null
          created_at?: string | null
          created_by_id: string
          created_by_name: string
          deep_link_url?: string | null
          delivery_rate?: number | null
          event_type?: string
          failed_tokens?: string[] | null
          id?: string
          image_url?: string | null
          is_auto_generated?: boolean | null
          is_draft?: boolean | null
          is_scheduled?: boolean | null
          linked_plan_id?: string | null
          linked_request_id?: string | null
          linked_ticket_id?: string | null
          message: string
          open_rate?: number | null
          priority?: string
          processing_ms?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          tags?: string[] | null
          timezone?: string | null
          title: string
          total_delivered?: number | null
          total_failed?: number | null
          total_opened?: number | null
          total_sent?: number | null
          total_targeted?: number | null
          updated_at?: string | null
        }
        Update: {
          audience_area?: string | null
          audience_estimated_count?: number | null
          audience_officer_ids?: string[] | null
          audience_plan_id?: string | null
          audience_plan_name?: string | null
          audience_type?: string
          audience_user_ids?: string[] | null
          audience_user_names?: string[] | null
          created_at?: string | null
          created_by_id?: string
          created_by_name?: string
          deep_link_url?: string | null
          delivery_rate?: number | null
          event_type?: string
          failed_tokens?: string[] | null
          id?: string
          image_url?: string | null
          is_auto_generated?: boolean | null
          is_draft?: boolean | null
          is_scheduled?: boolean | null
          linked_plan_id?: string | null
          linked_request_id?: string | null
          linked_ticket_id?: string | null
          message?: string
          open_rate?: number | null
          priority?: string
          processing_ms?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          tags?: string[] | null
          timezone?: string | null
          title?: string
          total_delivered?: number | null
          total_failed?: number | null
          total_opened?: number | null
          total_sent?: number | null
          total_targeted?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_notifications_audience_plan_id_fkey"
            columns: ["audience_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_notifications_linked_plan_id_fkey"
            columns: ["linked_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      canned_responses: {
        Row: {
          body: string
          category: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          shortcut: string | null
          title: string
          use_count: number
        }
        Insert: {
          body: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          shortcut?: string | null
          title: string
          use_count?: number
        }
        Update: {
          body?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          shortcut?: string | null
          title?: string
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "canned_responses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          message_type: string
          read_at: string | null
          sender_id: string | null
          sender_name: string
          sender_type: string
          session_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          message_type?: string
          read_at?: string | null
          sender_id?: string | null
          sender_name: string
          sender_type: string
          session_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          message_type?: string
          read_at?: string | null
          sender_id?: string | null
          sender_name?: string
          sender_type?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          accepted_at: string | null
          account_number: string | null
          agent_id: string | null
          agent_name: string | null
          channel: string
          created_at: string
          csat_comment: string | null
          csat_score: number | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          linked_ticket_id: string | null
          started_at: string
          status: Database["public"]["Enums"]["chat_status"]
          wait_time_seconds: number | null
        }
        Insert: {
          accepted_at?: string | null
          account_number?: string | null
          agent_id?: string | null
          agent_name?: string | null
          channel?: string
          created_at?: string
          csat_comment?: string | null
          csat_score?: number | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          linked_ticket_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["chat_status"]
          wait_time_seconds?: number | null
        }
        Update: {
          accepted_at?: string | null
          account_number?: string | null
          agent_id?: string | null
          agent_name?: string | null
          channel?: string
          created_at?: string
          csat_comment?: string | null
          csat_score?: number | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          linked_ticket_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["chat_status"]
          wait_time_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_sessions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_sessions_linked_ticket_id_fkey"
            columns: ["linked_ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_conversations: {
        Row: {
          created_at: string | null
          id: string
          messages: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          messages?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          messages?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      chatbot_learning_logs: {
        Row: {
          created_at: string | null
          id: string
          query: string | null
          response: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          query?: string | null
          response?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          query?: string | null
          response?: string | null
        }
        Relationships: []
      }
      collection_assignment_events: {
        Row: {
          actor_id: string | null
          actor_role: string | null
          assigned_officer_id: string | null
          claimed_by_officer_id: string | null
          created_at: string | null
          customer_id: string
          id: string
          notes: string | null
          status: string
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string | null
          assigned_officer_id?: string | null
          claimed_by_officer_id?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          notes?: string | null
          status: string
        }
        Update: {
          actor_id?: string | null
          actor_role?: string | null
          assigned_officer_id?: string | null
          claimed_by_officer_id?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_assignment_events_assigned_officer_id_fkey"
            columns: ["assigned_officer_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_assignment_events_claimed_by_officer_id_fkey"
            columns: ["claimed_by_officer_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_assignment_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      company_info: {
        Row: {
          about: string | null
          address: string | null
          city: string | null
          company_name: string | null
          country: string | null
          created_at: string | null
          email_primary: string | null
          email_support: string | null
          id: string
          phone_primary: string | null
          phone_secondary: string | null
          state: string | null
          tagline: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          about?: string | null
          address?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          email_primary?: string | null
          email_support?: string | null
          id?: string
          phone_primary?: string | null
          phone_secondary?: string | null
          state?: string | null
          tagline?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          about?: string | null
          address?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          email_primary?: string | null
          email_support?: string | null
          id?: string
          phone_primary?: string | null
          phone_secondary?: string | null
          state?: string | null
          tagline?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      company_knowledge: {
        Row: {
          category: string | null
          content: string | null
          created_at: string | null
          id: string
          title: string | null
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          title?: string | null
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          title?: string | null
        }
        Relationships: []
      }
      complaint_number_sequences: {
        Row: {
          last_number: number
          year: number
        }
        Insert: {
          last_number?: number
          year: number
        }
        Update: {
          last_number?: number
          year?: number
        }
        Relationships: []
      }
      customer_complaints: {
        Row: {
          account_number: string | null
          assigned_to: string | null
          complaint_number: string
          complaint_type: string
          created_at: string
          customer_id: string | null
          customer_name: string
          description: string
          id: string
          linked_ticket_id: string | null
          resolution: string | null
          resolved_at: string | null
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          assigned_to?: string | null
          complaint_number: string
          complaint_type: string
          created_at?: string
          customer_id?: string | null
          customer_name: string
          description: string
          id?: string
          linked_ticket_id?: string | null
          resolution?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          assigned_to?: string | null
          complaint_number?: string
          complaint_type?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          description?: string
          id?: string
          linked_ticket_id?: string | null
          resolution?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_complaints_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_complaints_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_complaints_linked_ticket_id_fkey"
            columns: ["linked_ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_interactions: {
        Row: {
          agent_id: string | null
          created_at: string
          customer_id: string
          direction: string
          duration_minutes: number | null
          id: string
          interaction_type: string
          linked_chat_id: string | null
          linked_ticket_id: string | null
          notes: string | null
          subject: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          customer_id: string
          direction?: string
          duration_minutes?: number | null
          id?: string
          interaction_type: string
          linked_chat_id?: string | null
          linked_ticket_id?: string | null
          notes?: string | null
          subject?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          customer_id?: string
          direction?: string
          duration_minutes?: number | null
          id?: string
          interaction_type?: string
          linked_chat_id?: string | null
          linked_ticket_id?: string | null
          notes?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_interactions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_interactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_interactions_linked_chat_id_fkey"
            columns: ["linked_chat_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_interactions_linked_ticket_id_fkey"
            columns: ["linked_ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_categories: {
        Row: {
          color: string
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          category: string | null
          category_id: string | null
          created_at: string | null
          created_by: string | null
          helpful_count: number
          id: string
          is_featured: boolean
          is_published: boolean | null
          not_helpful_count: number
          order_index: number | null
          published_at: string | null
          question: string
          tags: string[]
          updated_at: string | null
          updated_by: string | null
          view_count: number
        }
        Insert: {
          answer: string
          category?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          helpful_count?: number
          id?: string
          is_featured?: boolean
          is_published?: boolean | null
          not_helpful_count?: number
          order_index?: number | null
          published_at?: string | null
          question: string
          tags?: string[]
          updated_at?: string | null
          updated_by?: string | null
          view_count?: number
        }
        Update: {
          answer?: string
          category?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          helpful_count?: number
          id?: string
          is_featured?: boolean
          is_published?: boolean | null
          not_helpful_count?: number
          order_index?: number | null
          published_at?: string | null
          question?: string
          tags?: string[]
          updated_at?: string | null
          updated_by?: string | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "faqs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "faq_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faqs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faqs_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
        ]
      }
      general_settings: {
        Row: {
          animations_enabled: boolean | null
          attendance_tracking_enabled: boolean | null
          auto_assign_requests: boolean | null
          auto_backup: boolean | null
          backup_compression: boolean | null
          backup_encryption: boolean | null
          backup_frequency: string | null
          backup_location: string | null
          backup_retention_days: number | null
          backup_time: string | null
          cache_timeout_minutes: number | null
          color_scheme: string | null
          compact_mode: boolean | null
          company_address: string | null
          company_city: string | null
          company_country: string | null
          company_email: string | null
          company_gstin: string | null
          company_name: string | null
          company_phone: string | null
          company_state: string | null
          company_website: string | null
          created_at: string | null
          currency: string | null
          currency_symbol: string | null
          dark_mode_enabled: boolean | null
          dashboard_layout: string | null
          date_format: string | null
          debug_mode: boolean | null
          easebuzz_key: string | null
          easybuzz_merchant_id: string | null
          enable_email_notifications: boolean | null
          enable_sms_notifications: boolean | null
          enable_whatsapp_notifications: boolean | null
          error_reporting: boolean | null
          feature_ai_chatbot: boolean | null
          feature_auto_invoice: boolean | null
          feature_flags: Json | null
          feature_whatsapp: boolean | null
          font_size: number | null
          from_address: string | null
          id: string
          language: string | null
          location_tracking_enabled: boolean | null
          location_update_interval_minutes: number | null
          maintenance_mode: boolean | null
          notif_email_provider: string | null
          notif_in_app: boolean | null
          notif_push: boolean | null
          notif_templates_enabled: boolean | null
          notif_whatsapp_provider: string | null
          officer_tracking_enabled: boolean | null
          payment_gateway: string | null
          performance_monitoring: boolean | null
          query_optimization: boolean | null
          razorpay_key_id: string | null
          session_timeout_minutes: number | null
          shift_management_enabled: boolean | null
          show_avatars: boolean | null
          show_notification_badges: boolean | null
          sms_api_key: string | null
          sms_provider: string | null
          sms_sender_id: string | null
          smtp_host: string | null
          smtp_port: number | null
          smtp_user: string | null
          theme_mode: string | null
          time_format: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          animations_enabled?: boolean | null
          attendance_tracking_enabled?: boolean | null
          auto_assign_requests?: boolean | null
          auto_backup?: boolean | null
          backup_compression?: boolean | null
          backup_encryption?: boolean | null
          backup_frequency?: string | null
          backup_location?: string | null
          backup_retention_days?: number | null
          backup_time?: string | null
          cache_timeout_minutes?: number | null
          color_scheme?: string | null
          compact_mode?: boolean | null
          company_address?: string | null
          company_city?: string | null
          company_country?: string | null
          company_email?: string | null
          company_gstin?: string | null
          company_name?: string | null
          company_phone?: string | null
          company_state?: string | null
          company_website?: string | null
          created_at?: string | null
          currency?: string | null
          currency_symbol?: string | null
          dark_mode_enabled?: boolean | null
          dashboard_layout?: string | null
          date_format?: string | null
          debug_mode?: boolean | null
          easebuzz_key?: string | null
          easybuzz_merchant_id?: string | null
          enable_email_notifications?: boolean | null
          enable_sms_notifications?: boolean | null
          enable_whatsapp_notifications?: boolean | null
          error_reporting?: boolean | null
          feature_ai_chatbot?: boolean | null
          feature_auto_invoice?: boolean | null
          feature_flags?: Json | null
          feature_whatsapp?: boolean | null
          font_size?: number | null
          from_address?: string | null
          id?: string
          language?: string | null
          location_tracking_enabled?: boolean | null
          location_update_interval_minutes?: number | null
          maintenance_mode?: boolean | null
          notif_email_provider?: string | null
          notif_in_app?: boolean | null
          notif_push?: boolean | null
          notif_templates_enabled?: boolean | null
          notif_whatsapp_provider?: string | null
          officer_tracking_enabled?: boolean | null
          payment_gateway?: string | null
          performance_monitoring?: boolean | null
          query_optimization?: boolean | null
          razorpay_key_id?: string | null
          session_timeout_minutes?: number | null
          shift_management_enabled?: boolean | null
          show_avatars?: boolean | null
          show_notification_badges?: boolean | null
          sms_api_key?: string | null
          sms_provider?: string | null
          sms_sender_id?: string | null
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          theme_mode?: string | null
          time_format?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          animations_enabled?: boolean | null
          attendance_tracking_enabled?: boolean | null
          auto_assign_requests?: boolean | null
          auto_backup?: boolean | null
          backup_compression?: boolean | null
          backup_encryption?: boolean | null
          backup_frequency?: string | null
          backup_location?: string | null
          backup_retention_days?: number | null
          backup_time?: string | null
          cache_timeout_minutes?: number | null
          color_scheme?: string | null
          compact_mode?: boolean | null
          company_address?: string | null
          company_city?: string | null
          company_country?: string | null
          company_email?: string | null
          company_gstin?: string | null
          company_name?: string | null
          company_phone?: string | null
          company_state?: string | null
          company_website?: string | null
          created_at?: string | null
          currency?: string | null
          currency_symbol?: string | null
          dark_mode_enabled?: boolean | null
          dashboard_layout?: string | null
          date_format?: string | null
          debug_mode?: boolean | null
          easebuzz_key?: string | null
          easybuzz_merchant_id?: string | null
          enable_email_notifications?: boolean | null
          enable_sms_notifications?: boolean | null
          enable_whatsapp_notifications?: boolean | null
          error_reporting?: boolean | null
          feature_ai_chatbot?: boolean | null
          feature_auto_invoice?: boolean | null
          feature_flags?: Json | null
          feature_whatsapp?: boolean | null
          font_size?: number | null
          from_address?: string | null
          id?: string
          language?: string | null
          location_tracking_enabled?: boolean | null
          location_update_interval_minutes?: number | null
          maintenance_mode?: boolean | null
          notif_email_provider?: string | null
          notif_in_app?: boolean | null
          notif_push?: boolean | null
          notif_templates_enabled?: boolean | null
          notif_whatsapp_provider?: string | null
          officer_tracking_enabled?: boolean | null
          payment_gateway?: string | null
          performance_monitoring?: boolean | null
          query_optimization?: boolean | null
          razorpay_key_id?: string | null
          session_timeout_minutes?: number | null
          shift_management_enabled?: boolean | null
          show_avatars?: boolean | null
          show_notification_badges?: boolean | null
          sms_api_key?: string | null
          sms_provider?: string | null
          sms_sender_id?: string | null
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          theme_mode?: string | null
          time_format?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      geofence_events: {
        Row: {
          event_type: string
          geofence_id: string
          id: string
          latitude: number | null
          longitude: number | null
          occurred_at: string | null
          officer_id: string
        }
        Insert: {
          event_type: string
          geofence_id: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          occurred_at?: string | null
          officer_id: string
        }
        Update: {
          event_type?: string
          geofence_id?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          occurred_at?: string | null
          officer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "geofence_events_geofence_id_fkey"
            columns: ["geofence_id"]
            isOneToOne: false
            referencedRelation: "geofences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geofence_events_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
        ]
      }
      geofence_officer_assignments: {
        Row: {
          created_at: string
          geofence_id: string
          id: string
          officer_id: string
        }
        Insert: {
          created_at?: string
          geofence_id: string
          id?: string
          officer_id: string
        }
        Update: {
          created_at?: string
          geofence_id?: string
          id?: string
          officer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "geofence_officer_assignments_geofence_id_fkey"
            columns: ["geofence_id"]
            isOneToOne: false
            referencedRelation: "geofences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geofence_officer_assignments_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
        ]
      }
      geofences: {
        Row: {
          address: string
          alert_on_enter: boolean | null
          alert_on_exit: boolean | null
          city: string
          color: string | null
          created_at: string
          created_by: string | null
          geometry: Json
          id: string
          is_active: boolean
          name: string
          state: string
          updated_at: string
        }
        Insert: {
          address?: string
          alert_on_enter?: boolean | null
          alert_on_exit?: boolean | null
          city?: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          geometry: Json
          id?: string
          is_active?: boolean
          name: string
          state?: string
          updated_at?: string
        }
        Update: {
          address?: string
          alert_on_enter?: boolean | null
          alert_on_exit?: boolean | null
          city?: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          geometry?: Json
          id?: string
          is_active?: boolean
          name?: string
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "geofences_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_assignment_requests: {
        Row: {
          created_at: string | null
          id: string
          item_id: string | null
          requested_by: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id?: string | null
          requested_by?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string | null
          requested_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_assignment_requests_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_assignments: {
        Row: {
          assigned_to_id: string | null
          assigned_to_type: string | null
          assignment_date: string | null
          created_at: string | null
          id: string
          item_id: string | null
          quantity: number | null
          service_request_id: string | null
          status: string | null
        }
        Insert: {
          assigned_to_id?: string | null
          assigned_to_type?: string | null
          assignment_date?: string | null
          created_at?: string | null
          id?: string
          item_id?: string | null
          quantity?: number | null
          service_request_id?: string | null
          status?: string | null
        }
        Update: {
          assigned_to_id?: string | null
          assigned_to_type?: string | null
          assignment_date?: string | null
          created_at?: string | null
          id?: string
          item_id?: string | null
          quantity?: number | null
          service_request_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_assignments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_assignments_service_request_id_fkey"
            columns: ["service_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_categories: {
        Row: {
          created_at: string | null
          description: string | null
          icon_bg_color: string | null
          icon_color: string | null
          icon_name: string | null
          id: string
          item_count: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon_bg_color?: string | null
          icon_color?: string | null
          icon_name?: string | null
          id?: string
          item_count?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon_bg_color?: string | null
          icon_color?: string | null
          icon_name?: string | null
          id?: string
          item_count?: number | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory_history: {
        Row: {
          action_type: string
          created_at: string | null
          id: string
          item_id: string | null
          item_name: string | null
          item_sku: string | null
          notes: string | null
          performed_by: string | null
          performed_by_uid: string | null
          quantity_after: number
          quantity_before: number
          quantity_delta: number
        }
        Insert: {
          action_type: string
          created_at?: string | null
          id?: string
          item_id?: string | null
          item_name?: string | null
          item_sku?: string | null
          notes?: string | null
          performed_by?: string | null
          performed_by_uid?: string | null
          quantity_after?: number
          quantity_before?: number
          quantity_delta?: number
        }
        Update: {
          action_type?: string
          created_at?: string | null
          id?: string
          item_id?: string | null
          item_name?: string | null
          item_sku?: string | null
          notes?: string | null
          performed_by?: string | null
          performed_by_uid?: string | null
          quantity_after?: number
          quantity_before?: number
          quantity_delta?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_history_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          assigned_quantity: number | null
          available_quantity: number | null
          brand: string | null
          category: string | null
          category_id: string | null
          category_name: string | null
          created_at: string | null
          created_by: string | null
          damaged_quantity: number | null
          description: string | null
          id: string
          location: string | null
          low_stock_threshold: number | null
          model: string | null
          name: string
          notes: string | null
          quantity: number | null
          sku: string | null
          sold_quantity: number | null
          status: string | null
          stock_status: string | null
          total_quantity: number | null
          total_value: number | null
          unit_cost: number | null
          updated_at: string | null
        }
        Insert: {
          assigned_quantity?: number | null
          available_quantity?: number | null
          brand?: string | null
          category?: string | null
          category_id?: string | null
          category_name?: string | null
          created_at?: string | null
          created_by?: string | null
          damaged_quantity?: number | null
          description?: string | null
          id?: string
          location?: string | null
          low_stock_threshold?: number | null
          model?: string | null
          name: string
          notes?: string | null
          quantity?: number | null
          sku?: string | null
          sold_quantity?: number | null
          status?: string | null
          stock_status?: string | null
          total_quantity?: number | null
          total_value?: number | null
          unit_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          assigned_quantity?: number | null
          available_quantity?: number | null
          brand?: string | null
          category?: string | null
          category_id?: string | null
          category_name?: string | null
          created_at?: string | null
          created_by?: string | null
          damaged_quantity?: number | null
          description?: string | null
          id?: string
          location?: string | null
          low_stock_threshold?: number | null
          model?: string | null
          name?: string
          notes?: string | null
          quantity?: number | null
          sku?: string | null
          sold_quantity?: number | null
          status?: string | null
          stock_status?: string | null
          total_quantity?: number | null
          total_value?: number | null
          unit_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_requests: {
        Row: {
          created_at: string | null
          id: string
          item_id: string | null
          notes: string | null
          officer_id: string | null
          quantity: number
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id?: string | null
          notes?: string | null
          officer_id?: string | null
          quantity?: number
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string | null
          notes?: string | null
          officer_id?: string | null
          quantity?: number
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_requests_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_stock_update_requests: {
        Row: {
          created_at: string | null
          id: string
          item_id: string | null
          requested_quantity: number | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id?: string | null
          requested_quantity?: number | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string | null
          requested_quantity?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_stock_update_requests_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string | null
          id: string
          item_id: string | null
          quantity: number
          transaction_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id?: string | null
          quantity: number
          transaction_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string | null
          quantity?: number
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_history: {
        Row: {
          amount: number | null
          created_at: string | null
          id: string
          invoice_number: string | null
          metadata: Json | null
          pdf_url: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          id?: string
          invoice_number?: string | null
          metadata?: Json | null
          pdf_url?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          id?: string
          invoice_number?: string | null
          metadata?: Json | null
          pdf_url?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value?: Json | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          due_date: string | null
          id: string
          invoice_number: string | null
          issue_date: string | null
          notes: string | null
          paid_at: string | null
          pdf_url: string | null
          status: string | null
          subscription_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          issue_date?: string | null
          notes?: string | null
          paid_at?: string | null
          pdf_url?: string | null
          status?: string | null
          subscription_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          issue_date?: string | null
          notes?: string | null
          paid_at?: string | null
          pdf_url?: string | null
          status?: string | null
          subscription_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      knowledge_ingestion_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          source: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          source?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          source?: string | null
          status?: string | null
        }
        Relationships: []
      }
      leave_balances: {
        Row: {
          id: string
          leave_type: string
          officer_id: string
          total_days: number
          used_days: number
        }
        Insert: {
          id?: string
          leave_type: string
          officer_id: string
          total_days?: number
          used_days?: number
        }
        Update: {
          id?: string
          leave_type?: string
          officer_id?: string
          total_days?: number
          used_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          created_at: string | null
          days: number | null
          end_date: string | null
          half_day_period: string | null
          id: string
          is_half_day: boolean | null
          leave_type: string | null
          officer_id: string | null
          reason: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          days?: number | null
          end_date?: string | null
          half_day_period?: string | null
          id?: string
          is_half_day?: boolean | null
          leave_type?: string | null
          officer_id?: string | null
          reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          days?: number | null
          end_date?: string | null
          half_day_period?: string | null
          id?: string
          is_half_day?: boolean | null
          leave_type?: string | null
          officer_id?: string | null
          reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_drafts: {
        Row: {
          audience: string | null
          body: string | null
          created_at: string | null
          id: string
          title: string | null
        }
        Insert: {
          audience?: string | null
          body?: string | null
          created_at?: string | null
          id?: string
          title?: string | null
        }
        Update: {
          audience?: string | null
          body?: string | null
          created_at?: string | null
          id?: string
          title?: string | null
        }
        Relationships: []
      }
      notification_queue: {
        Row: {
          channel: string | null
          created_at: string | null
          id: string
          payload: Json | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string | null
          id?: string
          payload?: Json | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string | null
          id?: string
          payload?: Json | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notification_recipients: {
        Row: {
          created_at: string | null
          delivery_status: string | null
          failure_reason: string | null
          id: string
          notification_id: string
          push_token: string | null
          sent_at: string | null
          user_id: string
          user_name: string
          user_type: string
        }
        Insert: {
          created_at?: string | null
          delivery_status?: string | null
          failure_reason?: string | null
          id?: string
          notification_id: string
          push_token?: string | null
          sent_at?: string | null
          user_id: string
          user_name: string
          user_type: string
        }
        Update: {
          created_at?: string | null
          delivery_status?: string | null
          failure_reason?: string | null
          id?: string
          notification_id?: string
          push_token?: string | null
          sent_at?: string | null
          user_id?: string
          user_name?: string
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_recipients_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "broadcast_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_sent_history: {
        Row: {
          channel: string | null
          created_at: string | null
          id: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          audience_type: string | null
          created_at: string | null
          event_type: string | null
          id: string
          is_system: boolean | null
          message: string
          name: string
          priority: string | null
          title: string
        }
        Insert: {
          audience_type?: string | null
          created_at?: string | null
          event_type?: string | null
          id?: string
          is_system?: boolean | null
          message: string
          name: string
          priority?: string | null
          title: string
        }
        Update: {
          audience_type?: string | null
          created_at?: string | null
          event_type?: string | null
          id?: string
          is_system?: boolean | null
          message?: string
          name?: string
          priority?: string | null
          title?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          audience: string | null
          body: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          title: string
        }
        Insert: {
          audience?: string | null
          body?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          title: string
        }
        Update: {
          audience?: string | null
          body?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
        }
        Relationships: []
      }
      officer_action_logs: {
        Row: {
          action: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          officer_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          officer_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          officer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "officer_action_logs_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
        ]
      }
      officer_attendance: {
        Row: {
          attendance_date: string
          clock_in_time: string | null
          clock_out_time: string | null
          created_at: string | null
          id: string
          officer_id: string | null
          status: string | null
        }
        Insert: {
          attendance_date: string
          clock_in_time?: string | null
          clock_out_time?: string | null
          created_at?: string | null
          id?: string
          officer_id?: string | null
          status?: string | null
        }
        Update: {
          attendance_date?: string
          clock_in_time?: string | null
          clock_out_time?: string | null
          created_at?: string | null
          id?: string
          officer_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "officer_attendance_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
        ]
      }
      officer_bank_details: {
        Row: {
          account_holder_name: string | null
          account_number: string | null
          bank_name: string | null
          created_at: string
          ifsc_code: string | null
          officer_id: string
          updated_at: string
        }
        Insert: {
          account_holder_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          ifsc_code?: string | null
          officer_id: string
          updated_at?: string
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          ifsc_code?: string | null
          officer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "officer_bank_details_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: true
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
        ]
      }
      officer_contracts: {
        Row: {
          contract_type: string | null
          created_at: string | null
          end_date: string | null
          id: string
          officer_id: string | null
          start_date: string | null
          terms: Json | null
        }
        Insert: {
          contract_type?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          officer_id?: string | null
          start_date?: string | null
          terms?: Json | null
        }
        Update: {
          contract_type?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          officer_id?: string | null
          start_date?: string | null
          terms?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "officer_contracts_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
        ]
      }
      officer_credentials: {
        Row: {
          created_at: string
          login_email: string
          officer_id: string
          password_ciphertext: string
          password_set_method: string
          rotated_at: string | null
          visible_to_admin: boolean
        }
        Insert: {
          created_at?: string
          login_email: string
          officer_id: string
          password_ciphertext: string
          password_set_method?: string
          rotated_at?: string | null
          visible_to_admin?: boolean
        }
        Update: {
          created_at?: string
          login_email?: string
          officer_id?: string
          password_ciphertext?: string
          password_set_method?: string
          rotated_at?: string | null
          visible_to_admin?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "officer_credentials_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: true
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
        ]
      }
      officer_daily_activity: {
        Row: {
          avg_speed_kmh: number | null
          date: string
          first_ping_at: string | null
          geofence_violations: number | null
          id: string
          last_ping_at: string | null
          max_speed_kmh: number | null
          officer_id: string
          total_distance_km: number | null
          total_pings: number | null
          total_stops: number | null
          total_time_active_minutes: number | null
        }
        Insert: {
          avg_speed_kmh?: number | null
          date: string
          first_ping_at?: string | null
          geofence_violations?: number | null
          id?: string
          last_ping_at?: string | null
          max_speed_kmh?: number | null
          officer_id: string
          total_distance_km?: number | null
          total_pings?: number | null
          total_stops?: number | null
          total_time_active_minutes?: number | null
        }
        Update: {
          avg_speed_kmh?: number | null
          date?: string
          first_ping_at?: string | null
          geofence_violations?: number | null
          id?: string
          last_ping_at?: string | null
          max_speed_kmh?: number | null
          officer_id?: string
          total_distance_km?: number | null
          total_pings?: number | null
          total_stops?: number | null
          total_time_active_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "officer_daily_activity_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
        ]
      }
      officer_documents: {
        Row: {
          document_type: string
          file_url: string
          id: string
          mime_type: string | null
          officer_id: string
          uploaded_at: string
        }
        Insert: {
          document_type: string
          file_url: string
          id?: string
          mime_type?: string | null
          officer_id: string
          uploaded_at?: string
        }
        Update: {
          document_type?: string
          file_url?: string
          id?: string
          mime_type?: string | null
          officer_id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "officer_documents_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
        ]
      }
      officer_dwell_tracking: {
        Row: {
          latitude: number
          longitude: number
          officer_id: string
          started_at: string
        }
        Insert: {
          latitude: number
          longitude: number
          officer_id: string
          started_at: string
        }
        Update: {
          latitude?: number
          longitude?: number
          officer_id?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "officer_dwell_tracking_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: true
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
        ]
      }
      officer_dwells: {
        Row: {
          address: string | null
          arrived_at: string
          created_at: string | null
          date: string
          departed_at: string | null
          duration_minutes: number | null
          id: string
          latitude: number
          location: unknown
          longitude: number
          officer_id: string
          radius_metres: number | null
        }
        Insert: {
          address?: string | null
          arrived_at: string
          created_at?: string | null
          date: string
          departed_at?: string | null
          duration_minutes?: number | null
          id?: string
          latitude: number
          location?: unknown
          longitude: number
          officer_id: string
          radius_metres?: number | null
        }
        Update: {
          address?: string | null
          arrived_at?: string
          created_at?: string | null
          date?: string
          departed_at?: string | null
          duration_minutes?: number | null
          id?: string
          latitude?: number
          location?: unknown
          longitude?: number
          officer_id?: string
          radius_metres?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "officer_dwells_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
        ]
      }
      officer_leaves: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          leave_type: string | null
          officer_id: string | null
          reason: string | null
          start_date: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          leave_type?: string | null
          officer_id?: string | null
          reason?: string | null
          start_date?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          leave_type?: string | null
          officer_id?: string | null
          reason?: string | null
          start_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "officer_leaves_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
        ]
      }
      officer_location_events: {
        Row: {
          accuracy: number | null
          altitude: number | null
          battery_level: number | null
          event_type: string
          geofence_status: Json | null
          heading: number | null
          id: string
          is_moving: boolean | null
          latitude: number
          location: unknown
          longitude: number
          officer_id: string
          recorded_at: string
          speed: number | null
        }
        Insert: {
          accuracy?: number | null
          altitude?: number | null
          battery_level?: number | null
          event_type?: string
          geofence_status?: Json | null
          heading?: number | null
          id?: string
          is_moving?: boolean | null
          latitude: number
          location?: unknown
          longitude: number
          officer_id: string
          recorded_at?: string
          speed?: number | null
        }
        Update: {
          accuracy?: number | null
          altitude?: number | null
          battery_level?: number | null
          event_type?: string
          geofence_status?: Json | null
          heading?: number | null
          id?: string
          is_moving?: boolean | null
          latitude?: number
          location?: unknown
          longitude?: number
          officer_id?: string
          recorded_at?: string
          speed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "officer_location_events_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
        ]
      }
      officer_location_history: {
        Row: {
          id: string
          latitude: number | null
          longitude: number | null
          officer_id: string | null
          timestamp: string | null
        }
        Insert: {
          id?: string
          latitude?: number | null
          longitude?: number | null
          officer_id?: string | null
          timestamp?: string | null
        }
        Update: {
          id?: string
          latitude?: number | null
          longitude?: number | null
          officer_id?: string | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "officer_location_history_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
        ]
      }
      officer_locations: {
        Row: {
          accuracy: number | null
          altitude: number | null
          app_version: string | null
          battery_level: number | null
          device_info: Json | null
          heading: number | null
          id: string
          is_moving: boolean | null
          is_online: boolean | null
          last_seen_at: string | null
          latitude: number
          location: unknown
          longitude: number
          officer_id: string
          speed: number | null
          updated_at: string | null
        }
        Insert: {
          accuracy?: number | null
          altitude?: number | null
          app_version?: string | null
          battery_level?: number | null
          device_info?: Json | null
          heading?: number | null
          id?: string
          is_moving?: boolean | null
          is_online?: boolean | null
          last_seen_at?: string | null
          latitude: number
          location?: unknown
          longitude: number
          officer_id: string
          speed?: number | null
          updated_at?: string | null
        }
        Update: {
          accuracy?: number | null
          altitude?: number | null
          app_version?: string | null
          battery_level?: number | null
          device_info?: Json | null
          heading?: number | null
          id?: string
          is_moving?: boolean | null
          is_online?: boolean | null
          last_seen_at?: string | null
          latitude?: number
          location?: unknown
          longitude?: number
          officer_id?: string
          speed?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "officer_locations_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: true
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
        ]
      }
      officer_monthly_performance: {
        Row: {
          created_at: string | null
          id: string
          month: number | null
          officer_id: string | null
          score: number | null
          year: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          month?: number | null
          officer_id?: string | null
          score?: number | null
          year?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          month?: number | null
          officer_id?: string | null
          score?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "officer_monthly_performance_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
        ]
      }
      officer_onboarding: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          officer_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          officer_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          officer_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "officer_onboarding_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
        ]
      }
      officer_pay_period_locks: {
        Row: {
          id: string
          locked_at: string | null
          period_end: string | null
          period_start: string | null
        }
        Insert: {
          id?: string
          locked_at?: string | null
          period_end?: string | null
          period_start?: string | null
        }
        Update: {
          id?: string
          locked_at?: string | null
          period_end?: string | null
          period_start?: string | null
        }
        Relationships: []
      }
      officer_pay_run_events: {
        Row: {
          created_at: string | null
          event_type: string | null
          id: string
          pay_run_id: string | null
          payload: Json | null
        }
        Insert: {
          created_at?: string | null
          event_type?: string | null
          id?: string
          pay_run_id?: string | null
          payload?: Json | null
        }
        Update: {
          created_at?: string | null
          event_type?: string | null
          id?: string
          pay_run_id?: string | null
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "officer_pay_run_events_pay_run_id_fkey"
            columns: ["pay_run_id"]
            isOneToOne: false
            referencedRelation: "officer_pay_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      officer_pay_runs: {
        Row: {
          created_at: string | null
          id: string
          period_end: string | null
          period_start: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          status?: string | null
        }
        Relationships: []
      }
      officer_payslip_adjustment_audit: {
        Row: {
          adjustment: Json | null
          created_at: string | null
          id: string
          officer_id: string | null
          payslip_id: string | null
        }
        Insert: {
          adjustment?: Json | null
          created_at?: string | null
          id?: string
          officer_id?: string | null
          payslip_id?: string | null
        }
        Update: {
          adjustment?: Json | null
          created_at?: string | null
          id?: string
          officer_id?: string | null
          payslip_id?: string | null
        }
        Relationships: []
      }
      officer_payslip_line_items: {
        Row: {
          amount: number | null
          created_at: string | null
          id: string
          item_type: string | null
          label: string | null
          payslip_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          id?: string
          item_type?: string | null
          label?: string | null
          payslip_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          id?: string
          item_type?: string | null
          label?: string | null
          payslip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "officer_payslip_line_items_payslip_id_fkey"
            columns: ["payslip_id"]
            isOneToOne: false
            referencedRelation: "officer_payslips"
            referencedColumns: ["id"]
          },
        ]
      }
      officer_payslips: {
        Row: {
          generated_at: string | null
          id: string
          month: number | null
          net_salary: number | null
          officer_id: string | null
          payment_status: string | null
          pdf_url: string | null
          year: number | null
        }
        Insert: {
          generated_at?: string | null
          id?: string
          month?: number | null
          net_salary?: number | null
          officer_id?: string | null
          payment_status?: string | null
          pdf_url?: string | null
          year?: number | null
        }
        Update: {
          generated_at?: string | null
          id?: string
          month?: number | null
          net_salary?: number | null
          officer_id?: string | null
          payment_status?: string | null
          pdf_url?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "officer_payslips_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
        ]
      }
      officer_performance_wallet: {
        Row: {
          balance: number | null
          id: string
          officer_id: string | null
          updated_at: string | null
        }
        Insert: {
          balance?: number | null
          id?: string
          officer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          balance?: number | null
          id?: string
          officer_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "officer_performance_wallet_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
        ]
      }
      officer_role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission: string
          role_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission: string
          role_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          permission?: string
          role_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "officer_role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "officer_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      officer_roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      officer_salary_config: {
        Row: {
          basic_salary: number | null
          hra: number | null
          id: string
          officer_id: string
          other_allowances: number | null
          salary_type: string | null
          transport_allowance: number | null
          updated_at: string | null
        }
        Insert: {
          basic_salary?: number | null
          hra?: number | null
          id?: string
          officer_id: string
          other_allowances?: number | null
          salary_type?: string | null
          transport_allowance?: number | null
          updated_at?: string | null
        }
        Update: {
          basic_salary?: number | null
          hra?: number | null
          id?: string
          officer_id?: string
          other_allowances?: number | null
          salary_type?: string | null
          transport_allowance?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "officer_salary_config_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: true
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
        ]
      }
      officer_shift_requests: {
        Row: {
          created_at: string | null
          id: string
          officer_id: string | null
          payload: Json | null
          request_type: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          officer_id?: string | null
          payload?: Json | null
          request_type?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          officer_id?: string | null
          payload?: Json | null
          request_type?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "officer_shift_requests_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
        ]
      }
      officer_shifts: {
        Row: {
          created_at: string | null
          end_time: string | null
          id: string
          officer_id: string | null
          shift_date: string | null
          start_time: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          end_time?: string | null
          id?: string
          officer_id?: string | null
          shift_date?: string | null
          start_time?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          end_time?: string | null
          id?: string
          officer_id?: string | null
          shift_date?: string | null
          start_time?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "officer_shifts_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
        ]
      }
      officer_wallet_transactions: {
        Row: {
          amount: number | null
          created_at: string | null
          id: string
          reason: string | null
          wallet_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          id?: string
          reason?: string | null
          wallet_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          id?: string
          reason?: string | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "officer_wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "officer_performance_wallet"
            referencedColumns: ["id"]
          },
        ]
      }
      officers: {
        Row: {
          alternate_phone: string | null
          auth_user_id: string | null
          availability_status: string | null
          base_salary: number | null
          blood_group: string | null
          city: string | null
          created_at: string | null
          current_address: string | null
          current_latitude: number | null
          current_longitude: number | null
          date_of_birth: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employee_id: string | null
          full_name: string | null
          gender: string | null
          id: string
          is_active: boolean | null
          is_blocked: boolean | null
          is_location_tracking_enabled: boolean | null
          joining_date: string | null
          last_active_at: string | null
          last_location_update: string | null
          marital_status: string | null
          password_hash: string | null
          permanent_address: string | null
          phone: string | null
          pincode: string | null
          profile_photo_url: string | null
          region: string | null
          role_id: string | null
          roles: Json | null
          salary_config: Json | null
          state: string | null
          status: string | null
          terminated_at: string | null
          termination_reason: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          alternate_phone?: string | null
          auth_user_id?: string | null
          availability_status?: string | null
          base_salary?: number | null
          blood_group?: string | null
          city?: string | null
          created_at?: string | null
          current_address?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_id?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          is_blocked?: boolean | null
          is_location_tracking_enabled?: boolean | null
          joining_date?: string | null
          last_active_at?: string | null
          last_location_update?: string | null
          marital_status?: string | null
          password_hash?: string | null
          permanent_address?: string | null
          phone?: string | null
          pincode?: string | null
          profile_photo_url?: string | null
          region?: string | null
          role_id?: string | null
          roles?: Json | null
          salary_config?: Json | null
          state?: string | null
          status?: string | null
          terminated_at?: string | null
          termination_reason?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          alternate_phone?: string | null
          auth_user_id?: string | null
          availability_status?: string | null
          base_salary?: number | null
          blood_group?: string | null
          city?: string | null
          created_at?: string | null
          current_address?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_id?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          is_blocked?: boolean | null
          is_location_tracking_enabled?: boolean | null
          joining_date?: string | null
          last_active_at?: string | null
          last_location_update?: string | null
          marital_status?: string | null
          password_hash?: string | null
          permanent_address?: string | null
          phone?: string | null
          pincode?: string | null
          profile_photo_url?: string | null
          region?: string | null
          role_id?: string | null
          roles?: Json | null
          salary_config?: Json | null
          state?: string | null
          status?: string | null
          terminated_at?: string | null
          termination_reason?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "officers_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "officer_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "officers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      owners: {
        Row: {
          created_at: string | null
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      payment_gateways: {
        Row: {
          created_at: string | null
          credentials: Json | null
          display_name: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          logo_url: string | null
          name: string
          slug: string
          supported_methods: string[] | null
          test_mode: boolean | null
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          created_at?: string | null
          credentials?: Json | null
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          logo_url?: string | null
          name: string
          slug: string
          supported_methods?: string[] | null
          test_mode?: boolean | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          created_at?: string | null
          credentials?: Json | null
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          logo_url?: string | null
          name?: string
          slug?: string
          supported_methods?: string[] | null
          test_mode?: boolean | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      payment_notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          payment_id: string | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          payment_id?: string | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          payment_id?: string | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_receipts: {
        Row: {
          account_number: string
          amount: number
          billing_period: string | null
          company_address: string | null
          company_gstin: string | null
          company_name: string | null
          customer_id: string
          customer_name: string
          generated_at: string | null
          id: string
          next_due_date: string | null
          payment_date: string
          payment_id: string
          payment_method: string
          pdf_url: string | null
          receipt_number: string
          tax_amount: number | null
          total_amount: number
        }
        Insert: {
          account_number: string
          amount: number
          billing_period?: string | null
          company_address?: string | null
          company_gstin?: string | null
          company_name?: string | null
          customer_id: string
          customer_name: string
          generated_at?: string | null
          id?: string
          next_due_date?: string | null
          payment_date: string
          payment_id: string
          payment_method: string
          pdf_url?: string | null
          receipt_number: string
          tax_amount?: number | null
          total_amount: number
        }
        Update: {
          account_number?: string
          amount?: number
          billing_period?: string | null
          company_address?: string | null
          company_gstin?: string | null
          company_name?: string | null
          customer_id?: string
          customer_name?: string
          generated_at?: string | null
          id?: string
          next_due_date?: string | null
          payment_date?: string
          payment_id?: string
          payment_method?: string
          pdf_url?: string | null
          receipt_number?: string
          tax_amount?: number | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_receipts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_refunds: {
        Row: {
          amount: number
          created_at: string | null
          gateway_refund_id: string | null
          id: string
          initiated_by: string | null
          notes: string | null
          payment_id: string
          processed_at: string | null
          reason: string
          refund_number: string
          status: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          gateway_refund_id?: string | null
          id?: string
          initiated_by?: string | null
          notes?: string | null
          payment_id: string
          processed_at?: string | null
          reason: string
          refund_number: string
          status?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          gateway_refund_id?: string | null
          id?: string
          initiated_by?: string | null
          notes?: string | null
          payment_id?: string
          processed_at?: string | null
          reason?: string
          refund_number?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          account_number: string
          amount: number
          billing_period_end: string | null
          billing_period_start: string | null
          cash_collection_notes: string | null
          cash_denominations: Json | null
          channel: Database["public"]["Enums"]["payment_channel"]
          collected_by: string | null
          collection_latitude: number | null
          collection_longitude: number | null
          confirmed_at: string | null
          created_at: string | null
          currency: string | null
          customer_id: string
          customer_name: string
          customer_phone: string | null
          discount_amount: number | null
          due_date: string | null
          evidence_photo_url: string | null
          failure_reason: string | null
          gateway_fee: number | null
          gateway_id: string | null
          gateway_order_id: string | null
          gateway_payment_id: string | null
          gateway_raw_response: Json | null
          gateway_signature: string | null
          gateway_slug: string | null
          id: string
          initiated_at: string | null
          legacy_user_payment_id: string | null
          method: Database["public"]["Enums"]["payment_method"]
          next_due_date: string | null
          paid_at: string | null
          payment_number: string
          plan_name: string | null
          receipt_number: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          tax_amount: number | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          account_number: string
          amount: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          cash_collection_notes?: string | null
          cash_denominations?: Json | null
          channel: Database["public"]["Enums"]["payment_channel"]
          collected_by?: string | null
          collection_latitude?: number | null
          collection_longitude?: number | null
          confirmed_at?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id: string
          customer_name: string
          customer_phone?: string | null
          discount_amount?: number | null
          due_date?: string | null
          evidence_photo_url?: string | null
          failure_reason?: string | null
          gateway_fee?: number | null
          gateway_id?: string | null
          gateway_order_id?: string | null
          gateway_payment_id?: string | null
          gateway_raw_response?: Json | null
          gateway_signature?: string | null
          gateway_slug?: string | null
          id?: string
          initiated_at?: string | null
          legacy_user_payment_id?: string | null
          method: Database["public"]["Enums"]["payment_method"]
          next_due_date?: string | null
          paid_at?: string | null
          payment_number: string
          plan_name?: string | null
          receipt_number?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          tax_amount?: number | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          account_number?: string
          amount?: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          cash_collection_notes?: string | null
          cash_denominations?: Json | null
          channel?: Database["public"]["Enums"]["payment_channel"]
          collected_by?: string | null
          collection_latitude?: number | null
          collection_longitude?: number | null
          confirmed_at?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string
          customer_name?: string
          customer_phone?: string | null
          discount_amount?: number | null
          due_date?: string | null
          evidence_photo_url?: string | null
          failure_reason?: string | null
          gateway_fee?: number | null
          gateway_id?: string | null
          gateway_order_id?: string | null
          gateway_payment_id?: string | null
          gateway_raw_response?: Json | null
          gateway_signature?: string | null
          gateway_slug?: string | null
          id?: string
          initiated_at?: string | null
          legacy_user_payment_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          next_due_date?: string | null
          paid_at?: string | null
          payment_number?: string
          plan_name?: string | null
          receipt_number?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_collected_by_fkey"
            columns: ["collected_by"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "payment_gateways"
            referencedColumns: ["id"]
          },
        ]
      }
      payslips: {
        Row: {
          base: number | null
          bonuses: number | null
          created_at: string | null
          deductions: number | null
          id: string
          month: string | null
          net_pay: number | null
          officer_id: string | null
          pdf_url: string | null
        }
        Insert: {
          base?: number | null
          bonuses?: number | null
          created_at?: string | null
          deductions?: number | null
          id?: string
          month?: string | null
          net_pay?: number | null
          officer_id?: string | null
          pdf_url?: string | null
        }
        Update: {
          base?: number | null
          bonuses?: number | null
          created_at?: string | null
          deductions?: number | null
          id?: string
          month?: string | null
          net_pay?: number | null
          officer_id?: string | null
          pdf_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payslips_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_rules: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string | null
          rule: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          rule?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          rule?: Json | null
        }
        Relationships: []
      }
      plans: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          data_limit: string | null
          description: string | null
          display_name: string | null
          features: string[] | null
          id: string
          is_active: boolean | null
          is_deleted: boolean | null
          name: string
          plan_tag: string | null
          price: number | null
          router_type: string | null
          sort_order: number | null
          speed: string | null
          speed_mbps: number | null
          subscriber_count: number | null
          updated_at: string | null
          validity_days: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          data_limit?: string | null
          description?: string | null
          display_name?: string | null
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          name: string
          plan_tag?: string | null
          price?: number | null
          router_type?: string | null
          sort_order?: number | null
          speed?: string | null
          speed_mbps?: number | null
          subscriber_count?: number | null
          updated_at?: string | null
          validity_days?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          data_limit?: string | null
          description?: string | null
          display_name?: string | null
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          name?: string
          plan_tag?: string | null
          price?: number | null
          router_type?: string | null
          sort_order?: number | null
          speed?: string | null
          speed_mbps?: number | null
          subscriber_count?: number | null
          updated_at?: string | null
          validity_days?: number | null
        }
        Relationships: []
      }
      portal_notifications: {
        Row: {
          body: string | null
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          recipient_auth_id: string
          recipient_officer_id: string | null
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          recipient_auth_id: string
          recipient_officer_id?: string | null
          title: string
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          recipient_auth_id?: string
          recipient_officer_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_notifications_recipient_officer_id_fkey"
            columns: ["recipient_officer_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_ticket_attachments: {
        Row: {
          file_name: string
          file_type: string
          file_url: string
          id: string
          note_id: string | null
          size_bytes: number
          ticket_id: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          file_name: string
          file_type?: string
          file_url: string
          id?: string
          note_id?: string | null
          size_bytes?: number
          ticket_id: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          file_name?: string
          file_type?: string
          file_url?: string
          id?: string
          note_id?: string | null
          size_bytes?: number
          ticket_id?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_ticket_attachments_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "ticket_internal_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          metadata: Json | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          metadata?: Json | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          metadata?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      refresh_token_blacklist: {
        Row: {
          expires_at: string
          token_hash: string
        }
        Insert: {
          expires_at: string
          token_hash: string
        }
        Update: {
          expires_at?: string
          token_hash?: string
        }
        Relationships: []
      }
      request_activities: {
        Row: {
          created_at: string | null
          id: string
          note: string | null
          officer_id: string | null
          photo_urls: string[] | null
          request_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          note?: string | null
          officer_id?: string | null
          photo_urls?: string[] | null
          request_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          note?: string | null
          officer_id?: string | null
          photo_urls?: string[] | null
          request_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_activities_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_activities_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          address: string | null
          category: string | null
          city: string | null
          completed_at: string | null
          created_at: string | null
          created_by_admin_id: string | null
          description: string | null
          id: string
          is_escalated: boolean | null
          latitude: number | null
          location_address: string | null
          location_lat: number | null
          location_lng: number | null
          longitude: number | null
          notes: string | null
          officer_id: string | null
          plan_id: string | null
          priority: string | null
          request_type: string | null
          scheduled_at: string | null
          source: string | null
          status: string | null
          sub_category: string | null
          ticket_type: string | null
          type: string | null
          updated_at: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
          user_phone: string | null
        }
        Insert: {
          address?: string | null
          category?: string | null
          city?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by_admin_id?: string | null
          description?: string | null
          id?: string
          is_escalated?: boolean | null
          latitude?: number | null
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          longitude?: number | null
          notes?: string | null
          officer_id?: string | null
          plan_id?: string | null
          priority?: string | null
          request_type?: string | null
          scheduled_at?: string | null
          source?: string | null
          status?: string | null
          sub_category?: string | null
          ticket_type?: string | null
          type?: string | null
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          user_phone?: string | null
        }
        Update: {
          address?: string | null
          category?: string | null
          city?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by_admin_id?: string | null
          description?: string | null
          id?: string
          is_escalated?: boolean | null
          latitude?: number | null
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          longitude?: number | null
          notes?: string | null
          officer_id?: string | null
          plan_id?: string | null
          priority?: string | null
          request_type?: string | null
          scheduled_at?: string | null
          source?: string | null
          status?: string | null
          sub_category?: string | null
          ticket_type?: string | null
          type?: string | null
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          user_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_check_ins: {
        Row: {
          check_in_time: string | null
          check_out_time: string | null
          created_at: string | null
          id: string
          officer_id: string | null
          shift_id: string | null
        }
        Insert: {
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          id?: string
          officer_id?: string | null
          shift_id?: string | null
        }
        Update: {
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          id?: string
          officer_id?: string | null
          shift_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_check_ins_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_definition_officers: {
        Row: {
          created_at: string
          id: string
          officer_id: string
          shift_definition_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          officer_id: string
          shift_definition_id: string
        }
        Update: {
          created_at?: string
          id?: string
          officer_id?: string
          shift_definition_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_definition_officers_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_definition_officers_shift_definition_id_fkey"
            columns: ["shift_definition_id"]
            isOneToOne: false
            referencedRelation: "shift_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_definitions: {
        Row: {
          break_minutes: number
          created_at: string
          end_time: string
          grace_minutes: number
          id: string
          is_overnight: boolean
          name: string
          overtime_threshold_minutes: number
          start_time: string
          type: string
          updated_at: string
        }
        Insert: {
          break_minutes?: number
          created_at?: string
          end_time: string
          grace_minutes?: number
          id?: string
          is_overnight?: boolean
          name: string
          overtime_threshold_minutes?: number
          start_time: string
          type?: string
          updated_at?: string
        }
        Update: {
          break_minutes?: number
          created_at?: string
          end_time?: string
          grace_minutes?: number
          id?: string
          is_overnight?: boolean
          name?: string
          overtime_threshold_minutes?: number
          start_time?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      shift_notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          officer_id: string | null
          title: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          officer_id?: string | null
          title?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          officer_id?: string | null
          title?: string | null
        }
        Relationships: []
      }
      shift_schedules: {
        Row: {
          created_at: string | null
          end_time: string | null
          id: string
          name: string | null
          start_time: string | null
        }
        Insert: {
          created_at?: string | null
          end_time?: string | null
          id?: string
          name?: string | null
          start_time?: string | null
        }
        Update: {
          created_at?: string | null
          end_time?: string | null
          id?: string
          name?: string | null
          start_time?: string | null
        }
        Relationships: []
      }
      shifts: {
        Row: {
          approval_request_id: string | null
          attendance_status: string | null
          check_in_distance_m: number | null
          check_in_method: string | null
          check_in_time: string | null
          check_out_distance_m: number | null
          check_out_location: unknown
          check_out_method: string | null
          check_out_time: string | null
          end_time: string | null
          geofence_id: string | null
          id: string
          is_late: boolean | null
          late_by_minutes: number | null
          location: unknown
          location_mocked: boolean | null
          notes: string | null
          officer_id: string | null
          overtime_hours: number | null
          shift_date: string | null
          start_time: string | null
          status: string | null
          working_hours: number | null
        }
        Insert: {
          approval_request_id?: string | null
          attendance_status?: string | null
          check_in_distance_m?: number | null
          check_in_method?: string | null
          check_in_time?: string | null
          check_out_distance_m?: number | null
          check_out_location?: unknown
          check_out_method?: string | null
          check_out_time?: string | null
          end_time?: string | null
          geofence_id?: string | null
          id?: string
          is_late?: boolean | null
          late_by_minutes?: number | null
          location?: unknown
          location_mocked?: boolean | null
          notes?: string | null
          officer_id?: string | null
          overtime_hours?: number | null
          shift_date?: string | null
          start_time?: string | null
          status?: string | null
          working_hours?: number | null
        }
        Update: {
          approval_request_id?: string | null
          attendance_status?: string | null
          check_in_distance_m?: number | null
          check_in_method?: string | null
          check_in_time?: string | null
          check_out_distance_m?: number | null
          check_out_location?: unknown
          check_out_method?: string | null
          check_out_time?: string | null
          end_time?: string | null
          geofence_id?: string | null
          id?: string
          is_late?: boolean | null
          late_by_minutes?: number | null
          location?: unknown
          location_mocked?: boolean | null
          notes?: string | null
          officer_id?: string | null
          overtime_hours?: number | null
          shift_date?: string | null
          start_time?: string | null
          status?: string | null
          working_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "attendance_approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_geofence_id_fkey"
            columns: ["geofence_id"]
            isOneToOne: false
            referencedRelation: "geofences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_officer_id_fkey"
            columns: ["officer_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_breaches: {
        Row: {
          breach_type: string
          breached_at: string
          created_at: string
          id: string
          minutes_overdue: number | null
          notified_agents: string[]
          priority: string | null
          ticket_id: string
        }
        Insert: {
          breach_type: string
          breached_at?: string
          created_at?: string
          id?: string
          minutes_overdue?: number | null
          notified_agents?: string[]
          priority?: string | null
          ticket_id: string
        }
        Update: {
          breach_type?: string
          breached_at?: string
          created_at?: string
          id?: string
          minutes_overdue?: number | null
          notified_agents?: string[]
          priority?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_breaches_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_policies: {
        Row: {
          created_at: string
          escalate_to_level: number
          escalation_after_hours: number | null
          first_response_hours: number
          id: string
          is_active: boolean
          name: string
          notify_agent: boolean
          notify_supervisor: boolean
          priority: string
          resolution_hours: number
        }
        Insert: {
          created_at?: string
          escalate_to_level?: number
          escalation_after_hours?: number | null
          first_response_hours: number
          id?: string
          is_active?: boolean
          name: string
          notify_agent?: boolean
          notify_supervisor?: boolean
          priority: string
          resolution_hours: number
        }
        Update: {
          created_at?: string
          escalate_to_level?: number
          escalation_after_hours?: number | null
          first_response_hours?: number
          id?: string
          is_active?: boolean
          name?: string
          notify_agent?: boolean
          notify_supervisor?: boolean
          priority?: string
          resolution_hours?: number
        }
        Relationships: []
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string | null
          end_at: string | null
          id: string
          plan_id: string | null
          start_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          end_at?: string | null
          id?: string
          plan_id?: string | null
          start_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          end_at?: string | null
          id?: string
          plan_id?: string | null
          start_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          content: string | null
          created_at: string | null
          customer_name: string | null
          id: string
          is_published: boolean | null
          rating: number | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          customer_name?: string | null
          id?: string
          is_published?: boolean | null
          rating?: number | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          customer_name?: string | null
          id?: string
          is_published?: boolean | null
          rating?: number | null
        }
        Relationships: []
      }
      ticket_activity_events: {
        Row: {
          description: string
          id: string
          metadata: Json
          performed_by: string
          performed_by_role: string
          ticket_id: string
          timestamp: string
          type: string
        }
        Insert: {
          description: string
          id?: string
          metadata?: Json
          performed_by: string
          performed_by_role?: string
          ticket_id: string
          timestamp?: string
          type: string
        }
        Update: {
          description?: string
          id?: string
          metadata?: Json
          performed_by?: string
          performed_by_role?: string
          ticket_id?: string
          timestamp?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_activity_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_attachments: {
        Row: {
          created_at: string | null
          file_url: string | null
          id: string
          request_id: string | null
        }
        Insert: {
          created_at?: string | null
          file_url?: string | null
          id?: string
          request_id?: string | null
        }
        Update: {
          created_at?: string | null
          file_url?: string | null
          id?: string
          request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_comments: {
        Row: {
          author_id: string | null
          body: string | null
          created_at: string | null
          id: string
          request_id: string | null
        }
        Insert: {
          author_id?: string | null
          body?: string | null
          created_at?: string | null
          id?: string
          request_id?: string | null
        }
        Update: {
          author_id?: string | null
          body?: string | null
          created_at?: string | null
          id?: string
          request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_internal_notes: {
        Row: {
          author_id: string | null
          author_name: string
          author_role: string
          content: string
          created_at: string
          id: string
          is_internal: boolean
          ticket_id: string
        }
        Insert: {
          author_id?: string | null
          author_name: string
          author_role?: string
          content: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id: string
        }
        Update: {
          author_id?: string | null
          author_name?: string
          author_role?: string
          content?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_internal_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_internal_notes_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_number_sequences: {
        Row: {
          last_number: number
          year: number
        }
        Insert: {
          last_number?: number
          year: number
        }
        Update: {
          last_number?: number
          year?: number
        }
        Relationships: []
      }
      ticket_ratings: {
        Row: {
          created_at: string | null
          feedback: string | null
          id: string
          rating: number | null
          request_id: string | null
        }
        Insert: {
          created_at?: string | null
          feedback?: string | null
          id?: string
          rating?: number | null
          request_id?: string | null
        }
        Update: {
          created_at?: string | null
          feedback?: string | null
          id?: string
          rating?: number | null
          request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_ratings_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_sla_tracking: {
        Row: {
          created_at: string | null
          id: string
          request_id: string | null
          sla_deadline: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          request_id?: string | null
          sla_deadline?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          request_id?: string | null
          sla_deadline?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_sla_tracking_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          account_number: string | null
          address: string | null
          assigned_at: string | null
          assigned_officer_id: string | null
          assigned_officer_name: string | null
          assigned_officer_role: string | null
          city: string | null
          closed_at: string | null
          complaint_type: string
          contact_email: string | null
          contact_name: string
          contact_phone: string
          created_at: string
          created_by_admin_id: string | null
          created_by_admin_name: string
          csat_comment: string | null
          csat_score: number | null
          csat_sent_at: string | null
          customer_id: string | null
          customer_notified: boolean
          description: string
          escalation_level: number
          first_response_at: string | null
          id: string
          linked_request_id: string | null
          linked_request_number: string | null
          priority: string
          resolution_summary: string | null
          resolved_at: string | null
          sla_resolution_breached: boolean
          sla_resolution_deadline: string
          sla_response_breached: boolean
          sla_response_deadline: string
          source: string
          status: string
          sub_category: string | null
          tags: string[]
          ticket_number: string
          title: string
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          address?: string | null
          assigned_at?: string | null
          assigned_officer_id?: string | null
          assigned_officer_name?: string | null
          assigned_officer_role?: string | null
          city?: string | null
          closed_at?: string | null
          complaint_type: string
          contact_email?: string | null
          contact_name: string
          contact_phone: string
          created_at?: string
          created_by_admin_id?: string | null
          created_by_admin_name: string
          csat_comment?: string | null
          csat_score?: number | null
          csat_sent_at?: string | null
          customer_id?: string | null
          customer_notified?: boolean
          description: string
          escalation_level?: number
          first_response_at?: string | null
          id?: string
          linked_request_id?: string | null
          linked_request_number?: string | null
          priority: string
          resolution_summary?: string | null
          resolved_at?: string | null
          sla_resolution_breached?: boolean
          sla_resolution_deadline: string
          sla_response_breached?: boolean
          sla_response_deadline: string
          source?: string
          status?: string
          sub_category?: string | null
          tags?: string[]
          ticket_number: string
          title: string
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          address?: string | null
          assigned_at?: string | null
          assigned_officer_id?: string | null
          assigned_officer_name?: string | null
          assigned_officer_role?: string | null
          city?: string | null
          closed_at?: string | null
          complaint_type?: string
          contact_email?: string | null
          contact_name?: string
          contact_phone?: string
          created_at?: string
          created_by_admin_id?: string | null
          created_by_admin_name?: string
          csat_comment?: string | null
          csat_score?: number | null
          csat_sent_at?: string | null
          customer_id?: string | null
          customer_notified?: boolean
          description?: string
          escalation_level?: number
          first_response_at?: string | null
          id?: string
          linked_request_id?: string | null
          linked_request_number?: string | null
          priority?: string
          resolution_summary?: string | null
          resolved_at?: string | null
          sla_resolution_breached?: boolean
          sla_resolution_deadline?: string
          sla_response_breached?: boolean
          sla_response_deadline?: string
          source?: string
          status?: string
          sub_category?: string | null
          tags?: string[]
          ticket_number?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_officer_id_fkey"
            columns: ["assigned_officer_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_created_by_admin_id_fkey"
            columns: ["created_by_admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_linked_request_id_fkey"
            columns: ["linked_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_qr_codes: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string | null
          qr_image_url: string | null
          upi_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          qr_image_url?: string | null
          upi_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          qr_image_url?: string | null
          upi_id?: string | null
        }
        Relationships: []
      }
      user_action_logs: {
        Row: {
          action: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_action_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_fcm_tokens: {
        Row: {
          area: string | null
          id: string
          is_active: boolean | null
          plan_id: string | null
          platform: string | null
          token: string
          updated_at: string | null
          user_id: string | null
          user_type: string | null
        }
        Insert: {
          area?: string | null
          id?: string
          is_active?: boolean | null
          plan_id?: string | null
          platform?: string | null
          token: string
          updated_at?: string | null
          user_id?: string | null
          user_type?: string | null
        }
        Update: {
          area?: string | null
          id?: string
          is_active?: boolean | null
          plan_id?: string | null
          platform?: string | null
          token?: string
          updated_at?: string | null
          user_id?: string | null
          user_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_fcm_tokens_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_fcm_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_audit_history: {
        Row: {
          created_at: string | null
          event_type: string | null
          id: string
          payload: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          notification_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          notification_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          notification_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_payments: {
        Row: {
          amount: number | null
          collection_timestamp: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          gateway: string | null
          gateway_transaction_id: string | null
          id: string
          invoice_id: string | null
          invoice_url: string | null
          notes: string | null
          payment_method: string | null
          payment_status: string | null
          plan_id: string | null
          plan_name: string | null
          refund_amount: number | null
          transaction_id: string | null
          updated_at: string | null
          user_id: string | null
          user_name: string | null
          user_phone: string | null
        }
        Insert: {
          amount?: number | null
          collection_timestamp?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          gateway?: string | null
          gateway_transaction_id?: string | null
          id?: string
          invoice_id?: string | null
          invoice_url?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          plan_id?: string | null
          plan_name?: string | null
          refund_amount?: number | null
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_name?: string | null
          user_phone?: string | null
        }
        Update: {
          amount?: number | null
          collection_timestamp?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          gateway?: string | null
          gateway_transaction_id?: string | null
          id?: string
          invoice_id?: string | null
          invoice_url?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          plan_id?: string | null
          plan_name?: string | null
          refund_amount?: number | null
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_name?: string | null
          user_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          address: string | null
          assigned_officer_id: string | null
          auth_user_id: string | null
          billing_cycle_day: number | null
          block_reason: string | null
          block_updated_at: string | null
          city: string | null
          claimed_at: string | null
          claimed_by_officer_id: string | null
          collection_status: string | null
          collection_updated_at: string | null
          company_name: string | null
          created_at: string | null
          current_latitude: number | null
          current_longitude: number | null
          customer_id: string | null
          district: string | null
          email: string
          expiry_date: string | null
          first_name: string | null
          id: string
          invoice_delivery_preference: string | null
          is_blocked: boolean | null
          last_location_update: string | null
          last_name: string | null
          last_paid_amount: number | null
          last_paid_at: string | null
          last_renewal_date: string | null
          legacy_user_id: number | null
          middle_name: string | null
          name: string
          next_due_date: string | null
          notification_prefs: Json | null
          outstanding_amount: number | null
          owner_id: string | null
          payment_status: string | null
          phone: string | null
          pincode: string | null
          profile_picture_url: string | null
          requires_gst_invoice: boolean | null
          role: string | null
          state: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          address?: string | null
          assigned_officer_id?: string | null
          auth_user_id?: string | null
          billing_cycle_day?: number | null
          block_reason?: string | null
          block_updated_at?: string | null
          city?: string | null
          claimed_at?: string | null
          claimed_by_officer_id?: string | null
          collection_status?: string | null
          collection_updated_at?: string | null
          company_name?: string | null
          created_at?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          customer_id?: string | null
          district?: string | null
          email: string
          expiry_date?: string | null
          first_name?: string | null
          id?: string
          invoice_delivery_preference?: string | null
          is_blocked?: boolean | null
          last_location_update?: string | null
          last_name?: string | null
          last_paid_amount?: number | null
          last_paid_at?: string | null
          last_renewal_date?: string | null
          legacy_user_id?: number | null
          middle_name?: string | null
          name: string
          next_due_date?: string | null
          notification_prefs?: Json | null
          outstanding_amount?: number | null
          owner_id?: string | null
          payment_status?: string | null
          phone?: string | null
          pincode?: string | null
          profile_picture_url?: string | null
          requires_gst_invoice?: boolean | null
          role?: string | null
          state?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          address?: string | null
          assigned_officer_id?: string | null
          auth_user_id?: string | null
          billing_cycle_day?: number | null
          block_reason?: string | null
          block_updated_at?: string | null
          city?: string | null
          claimed_at?: string | null
          claimed_by_officer_id?: string | null
          collection_status?: string | null
          collection_updated_at?: string | null
          company_name?: string | null
          created_at?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          customer_id?: string | null
          district?: string | null
          email?: string
          expiry_date?: string | null
          first_name?: string | null
          id?: string
          invoice_delivery_preference?: string | null
          is_blocked?: boolean | null
          last_location_update?: string | null
          last_name?: string | null
          last_paid_amount?: number | null
          last_paid_at?: string | null
          last_renewal_date?: string | null
          legacy_user_id?: number | null
          middle_name?: string | null
          name?: string
          next_due_date?: string | null
          notification_prefs?: Json | null
          outstanding_amount?: number | null
          owner_id?: string | null
          payment_status?: string | null
          phone?: string | null
          pincode?: string | null
          profile_picture_url?: string | null
          requires_gst_invoice?: boolean | null
          role?: string | null
          state?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_assigned_officer_id_fkey"
            columns: ["assigned_officer_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_claimed_by_officer_id_fkey"
            columns: ["claimed_by_officer_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      payment_analytics: {
        Row: {
          avg_payment_amount: number | null
          card_count: number | null
          cash_count: number | null
          cash_pending_count: number | null
          confirmed_count: number | null
          confirmed_revenue: number | null
          date: string | null
          failed_count: number | null
          netbanking_count: number | null
          officer_collected_count: number | null
          pending_revenue: number | null
          pending_review_count: number | null
          total_transactions: number | null
          upi_count: number | null
        }
        Relationships: []
      }
      support_dashboard_stats: {
        Row: {
          avg_csat_score: number | null
          avg_resolution_hours: number | null
          in_progress_tickets: number | null
          open_tickets: number | null
          overdue_tickets: number | null
          resolved_tickets: number | null
          sla_breaches: number | null
          tickets_this_week: number | null
          tickets_today: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      bulk_assign_collection_officer: {
        Args: { p_customer_ids: string[]; p_officer_id?: string }
        Returns: Json
      }
      claim_collection_customer: {
        Args: { p_customer_id: string }
        Returns: Json
      }
      current_customer_user_id: { Args: never; Returns: string }
      current_officer_id: { Args: never; Returns: string }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      finalize_officer_collection: {
        Args: { p_payment_id: string }
        Returns: Json
      }
      generate_complaint_number: { Args: never; Returns: string }
      generate_ticket_number: { Args: never; Returns: string }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_active_payment_gateway: {
        Args: never
        Returns: {
          display_name: string
          logo_url: string
          slug: string
          supported_methods: string[]
          test_mode: boolean
        }[]
      }
      get_collection_dashboard_kpis: { Args: never; Returns: Json }
      get_customer_collection_history: {
        Args: { p_customer_id: string }
        Returns: {
          actor_id: string | null
          actor_role: string | null
          assigned_officer_id: string | null
          claimed_by_officer_id: string | null
          created_at: string | null
          customer_id: string
          id: string
          notes: string | null
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "collection_assignment_events"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_officer_assigned_customers: {
        Args: { p_query?: string }
        Returns: {
          assignment_type: string
          collection_status: string
          customer_id: string
          id: string
          name: string
          next_due_date: string
          outstanding_amount: number
          payment_status: string
          phone: string
        }[]
      }
      get_officer_collectible_customers: {
        Args: { p_query?: string }
        Returns: {
          assignment_type: string
          collection_status: string
          customer_id: string
          id: string
          name: string
          next_due_date: string
          outstanding_amount: number
          payment_status: string
          phone: string
        }[]
      }
      get_officer_customer_payment_history: {
        Args: { p_customer_id: string }
        Returns: {
          account_number: string
          amount: number
          billing_period_end: string | null
          billing_period_start: string | null
          cash_collection_notes: string | null
          cash_denominations: Json | null
          channel: Database["public"]["Enums"]["payment_channel"]
          collected_by: string | null
          collection_latitude: number | null
          collection_longitude: number | null
          confirmed_at: string | null
          created_at: string | null
          currency: string | null
          customer_id: string
          customer_name: string
          customer_phone: string | null
          discount_amount: number | null
          due_date: string | null
          evidence_photo_url: string | null
          failure_reason: string | null
          gateway_fee: number | null
          gateway_id: string | null
          gateway_order_id: string | null
          gateway_payment_id: string | null
          gateway_raw_response: Json | null
          gateway_signature: string | null
          gateway_slug: string | null
          id: string
          initiated_at: string | null
          legacy_user_payment_id: string | null
          method: Database["public"]["Enums"]["payment_method"]
          next_due_date: string | null
          paid_at: string | null
          payment_number: string
          plan_name: string | null
          receipt_number: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          tax_amount: number | null
          total_amount: number
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_officer_dashboard_stats: { Args: never; Returns: Json }
      get_public_company_settings: {
        Args: never
        Returns: {
          company_address: string
          company_city: string
          company_country: string
          company_email: string
          company_gstin: string
          company_name: string
          company_phone: string
          company_state: string
          company_website: string
          currency: string
          currency_symbol: string
          date_format: string
          language: string
          payment_gateway: string
          time_format: string
          timezone: string
        }[]
      }
      gettransactionid: { Args: never; Returns: unknown }
      is_admin: { Args: never; Returns: boolean }
      is_admin_user: { Args: never; Returns: boolean }
      log_collection_assignment_event: {
        Args: {
          p_actor_id?: string
          p_actor_role?: string
          p_assigned_officer_id: string
          p_claimed_by_officer_id: string
          p_customer_id: string
          p_notes?: string
          p_status: string
        }
        Returns: undefined
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      map_legacy_payment_method: {
        Args: { raw: string }
        Returns: Database["public"]["Enums"]["payment_method"]
      }
      notify_collection_admins: {
        Args: {
          p_body?: string
          p_data?: Json
          p_title: string
          p_type: string
        }
        Returns: undefined
      }
      notify_collection_officer: {
        Args: {
          p_body?: string
          p_data?: Json
          p_officer_id: string
          p_title: string
          p_type: string
        }
        Returns: undefined
      }
      notify_officer_contract_signature: {
        Args: {
          p_contract_id: string
        }
        Returns: undefined
      }
      submit_employment_contract_signature: {
        Args: {
          p_contract_id: string
          p_role: string
          p_signature_path: string
          p_signed_by?: string | null
        }
        Returns: Json
      }
      publish_signed_employment_contract_pdf: {
        Args: {
          p_contract_id: string
          p_storage_path: string
          p_new_version: number
          p_archived_version?: number | null
          p_archived_snapshot?: Json | null
          p_archived_pdf_url?: string | null
          p_created_by?: string | null
        }
        Returns: Json
      }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      release_collection_claim: {
        Args: { p_customer_id: string }
        Returns: Json
      }
      search_officer_customers: {
        Args: { p_query?: string }
        Returns: {
          assignment_type: string
          collection_status: string
          customer_id: string
          id: string
          name: string
          next_due_date: string
          outstanding_amount: number
          payment_status: string
          phone: string
        }[]
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      chat_status: "waiting" | "active" | "resolved" | "missed"
      payment_channel:
        | "online_app"
        | "online_web"
        | "officer_cash"
        | "office_cash"
        | "officer_online"
        | "auto_debit"
      payment_method:
        | "card"
        | "upi"
        | "netbanking"
        | "wallet"
        | "cash"
        | "cheque"
      payment_status:
        | "initiated"
        | "pending_review"
        | "cash_collected"
        | "confirmed"
        | "failed"
        | "refunded"
        | "cancelled"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
      chat_status: ["waiting", "active", "resolved", "missed"],
      payment_channel: [
        "online_app",
        "online_web",
        "officer_cash",
        "office_cash",
        "officer_online",
        "auto_debit",
      ],
      payment_method: ["card", "upi", "netbanking", "wallet", "cash", "cheque"],
      payment_status: [
        "initiated",
        "pending_review",
        "cash_collected",
        "confirmed",
        "failed",
        "refunded",
        "cancelled",
      ],
    },
  },
} as const
