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
      application_banks: {
        Row: {
          application_id: string
          approved_amount: number | null
          bank_id: string
          id: string
          notes: string | null
          rejection_reason: string | null
          status_id: string | null
          submitted_at: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          application_id: string
          approved_amount?: number | null
          bank_id: string
          id?: string
          notes?: string | null
          rejection_reason?: string | null
          status_id?: string | null
          submitted_at?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          application_id?: string
          approved_amount?: number | null
          bank_id?: string
          id?: string
          notes?: string | null
          rejection_reason?: string | null
          status_id?: string | null
          submitted_at?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_banks_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "loan_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_banks_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_banks_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "loan_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_banks_updater_profile_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      application_document_requests: {
        Row: {
          allowed_formats: string[]
          application_id: string
          created_at: string
          description: string | null
          document_name: string
          fulfilled_at: string | null
          id: string
          is_mandatory: boolean
          requested_by: string | null
        }
        Insert: {
          allowed_formats?: string[]
          application_id: string
          created_at?: string
          description?: string | null
          document_name: string
          fulfilled_at?: string | null
          id?: string
          is_mandatory?: boolean
          requested_by?: string | null
        }
        Update: {
          allowed_formats?: string[]
          application_id?: string
          created_at?: string
          description?: string | null
          document_name?: string
          fulfilled_at?: string | null
          id?: string
          is_mandatory?: boolean
          requested_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_document_requests_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "loan_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_documents: {
        Row: {
          application_id: string
          document_name: string
          document_request_id: string | null
          file_url: string
          id: string
          loan_document_id: string | null
          reviewer_notes: string | null
          status: Database["public"]["Enums"]["doc_status"]
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          application_id: string
          document_name: string
          document_request_id?: string | null
          file_url: string
          id?: string
          loan_document_id?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          application_id?: string
          document_name?: string
          document_request_id?: string | null
          file_url?: string
          id?: string
          loan_document_id?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "loan_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_documents_document_request_id_fkey"
            columns: ["document_request_id"]
            isOneToOne: false
            referencedRelation: "application_document_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_documents_loan_document_id_fkey"
            columns: ["loan_document_id"]
            isOneToOne: false
            referencedRelation: "loan_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      application_notes: {
        Row: {
          application_id: string
          author_id: string
          body: string
          created_at: string
          follow_up_at: string | null
          follow_up_notified_at: string | null
          id: string
        }
        Insert: {
          application_id: string
          author_id: string
          body: string
          created_at?: string
          follow_up_at?: string | null
          follow_up_notified_at?: string | null
          id?: string
        }
        Update: {
          application_id?: string
          author_id?: string
          body?: string
          created_at?: string
          follow_up_at?: string | null
          follow_up_notified_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_notes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "loan_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_notes_author_profile_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      application_status_history: {
        Row: {
          application_id: string
          created_at: string
          id: string
          notes: string | null
          status_id: string | null
          updated_by: string | null
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          notes?: string | null
          status_id?: string | null
          updated_by?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          status_id?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_status_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "loan_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_status_history_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "loan_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      banker_share_links: {
        Row: {
          access_count: number
          application_id: string
          created_at: string
          expires_at: string
          generated_by: string | null
          id: string
          is_active: boolean
          recipient_email: string | null
          recipient_name: string | null
          recipient_phone: string | null
          sent_at: string | null
          token: string
        }
        Insert: {
          access_count?: number
          application_id: string
          created_at?: string
          expires_at: string
          generated_by?: string | null
          id?: string
          is_active?: boolean
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          sent_at?: string | null
          token: string
        }
        Update: {
          access_count?: number
          application_id?: string
          created_at?: string
          expires_at?: string
          generated_by?: string | null
          id?: string
          is_active?: boolean
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          sent_at?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "banker_share_links_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "loan_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      banks: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          short_code: string | null
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          short_code?: string | null
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          short_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      commission_payments: {
        Row: {
          amount: number
          commission_id: string
          created_at: string
          id: string
          method: string | null
          notes: string | null
          paid_on: string
          recorded_by: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          commission_id: string
          created_at?: string
          id?: string
          method?: string | null
          notes?: string | null
          paid_on?: string
          recorded_by?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          commission_id?: string
          created_at?: string
          id?: string
          method?: string | null
          notes?: string | null
          paid_on?: string
          recorded_by?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_payments_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "commissions"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          application_id: string
          created_at: string
          dsa_id: string | null
          expected_amount: number | null
          id: string
          notes: string | null
          received_amount: number | null
          status: Database["public"]["Enums"]["commission_status"]
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          dsa_id?: string | null
          expected_amount?: number | null
          id?: string
          notes?: string | null
          received_amount?: number | null
          status?: Database["public"]["Enums"]["commission_status"]
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          dsa_id?: string | null
          expected_amount?: number | null
          id?: string
          notes?: string | null
          received_amount?: number | null
          status?: Database["public"]["Enums"]["commission_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "loan_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_dsa_profile_fkey"
            columns: ["dsa_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dsa_payout_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string | null
          notes: string | null
          paid_on: string
          payout_id: string
          recorded_by: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method?: string | null
          notes?: string | null
          paid_on?: string
          payout_id: string
          recorded_by?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string | null
          notes?: string | null
          paid_on?: string
          payout_id?: string
          recorded_by?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dsa_payout_payments_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "dsa_payouts"
            referencedColumns: ["id"]
          },
        ]
      }
      dsa_payout_settings: {
        Row: {
          created_at: string
          default_percentage: number | null
          dsa_id: string
          payout_visible: boolean
          report_access: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          default_percentage?: number | null
          dsa_id: string
          payout_visible?: boolean
          report_access?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          default_percentage?: number | null
          dsa_id?: string
          payout_visible?: boolean
          report_access?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dsa_payout_settings_dsa_id_fkey"
            columns: ["dsa_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dsa_payouts: {
        Row: {
          application_id: string
          basis: Database["public"]["Enums"]["dsa_payout_basis"]
          created_at: string
          created_by: string | null
          dsa_id: string
          expected_amount: number
          id: string
          notes: string | null
          paid_amount: number
          percentage: number | null
          status: Database["public"]["Enums"]["dsa_payout_status"]
          updated_at: string
        }
        Insert: {
          application_id: string
          basis?: Database["public"]["Enums"]["dsa_payout_basis"]
          created_at?: string
          created_by?: string | null
          dsa_id: string
          expected_amount?: number
          id?: string
          notes?: string | null
          paid_amount?: number
          percentage?: number | null
          status?: Database["public"]["Enums"]["dsa_payout_status"]
          updated_at?: string
        }
        Update: {
          application_id?: string
          basis?: Database["public"]["Enums"]["dsa_payout_basis"]
          created_at?: string
          created_by?: string | null
          dsa_id?: string
          expected_amount?: number
          id?: string
          notes?: string | null
          paid_amount?: number
          percentage?: number | null
          status?: Database["public"]["Enums"]["dsa_payout_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dsa_payouts_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "loan_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsa_payouts_dsa_id_fkey"
            columns: ["dsa_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notes: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          lead_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          lead_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          amount_requested: number | null
          application_id: string | null
          archived_at: string | null
          assigned_to: string | null
          converted_at: string | null
          converted_by: string | null
          created_at: string
          created_by: string | null
          email: string | null
          followup_reminded_at: string | null
          id: string
          last_contacted_at: string | null
          loan_type_id: string | null
          message: string | null
          name: string
          next_followup_at: string | null
          notes: string | null
          phone: string
          requirements: string | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          amount_requested?: number | null
          application_id?: string | null
          archived_at?: string | null
          assigned_to?: string | null
          converted_at?: string | null
          converted_by?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          followup_reminded_at?: string | null
          id?: string
          last_contacted_at?: string | null
          loan_type_id?: string | null
          message?: string | null
          name: string
          next_followup_at?: string | null
          notes?: string | null
          phone: string
          requirements?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          amount_requested?: number | null
          application_id?: string | null
          archived_at?: string | null
          assigned_to?: string | null
          converted_at?: string | null
          converted_by?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          followup_reminded_at?: string | null
          id?: string
          last_contacted_at?: string | null
          loan_type_id?: string | null
          message?: string | null
          name?: string
          next_followup_at?: string | null
          notes?: string | null
          phone?: string
          requirements?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "loan_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_assigned_profile_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_loan_type_id_fkey"
            columns: ["loan_type_id"]
            isOneToOne: false
            referencedRelation: "loan_types"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_applications: {
        Row: {
          amount_approved: number | null
          amount_disbursed: number | null
          amount_requested: number | null
          archived_at: string | null
          assigned_to: string | null
          commission_expected: number | null
          commission_received: number | null
          created_at: string
          customer_id: string | null
          id: string
          loan_type_id: string
          notes: string | null
          status_id: string | null
          updated_at: string
        }
        Insert: {
          amount_approved?: number | null
          amount_disbursed?: number | null
          amount_requested?: number | null
          archived_at?: string | null
          assigned_to?: string | null
          commission_expected?: number | null
          commission_received?: number | null
          created_at?: string
          customer_id?: string | null
          id?: string
          loan_type_id: string
          notes?: string | null
          status_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_approved?: number | null
          amount_disbursed?: number | null
          amount_requested?: number | null
          archived_at?: string | null
          assigned_to?: string | null
          commission_expected?: number | null
          commission_received?: number | null
          created_at?: string
          customer_id?: string | null
          id?: string
          loan_type_id?: string
          notes?: string | null
          status_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_applications_assigned_profile_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_applications_customer_profile_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_applications_loan_type_id_fkey"
            columns: ["loan_type_id"]
            isOneToOne: false
            referencedRelation: "loan_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_applications_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "loan_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_documents: {
        Row: {
          allowed_formats: string[]
          created_at: string
          description: string | null
          document_name: string
          id: string
          is_mandatory: boolean
          loan_type_id: string
          sort_order: number
        }
        Insert: {
          allowed_formats?: string[]
          created_at?: string
          description?: string | null
          document_name: string
          id?: string
          is_mandatory?: boolean
          loan_type_id: string
          sort_order?: number
        }
        Update: {
          allowed_formats?: string[]
          created_at?: string
          description?: string | null
          document_name?: string
          id?: string
          is_mandatory?: boolean
          loan_type_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "loan_documents_loan_type_id_fkey"
            columns: ["loan_type_id"]
            isOneToOne: false
            referencedRelation: "loan_types"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_statuses: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_active: boolean
          loan_type_id: string | null
          stage_name: string
          stage_order: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          loan_type_id?: string | null
          stage_name: string
          stage_order?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          loan_type_id?: string | null
          stage_name?: string
          stage_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "loan_statuses_loan_type_id_fkey"
            columns: ["loan_type_id"]
            isOneToOne: false
            referencedRelation: "loan_types"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_type_banks: {
        Row: {
          bank_id: string
          created_at: string
          id: string
          loan_type_id: string
          sort_order: number
        }
        Insert: {
          bank_id: string
          created_at?: string
          id?: string
          loan_type_id: string
          sort_order?: number
        }
        Update: {
          bank_id?: string
          created_at?: string
          id?: string
          loan_type_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "loan_type_banks_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_type_banks_loan_type_id_fkey"
            columns: ["loan_type_id"]
            isOneToOne: false
            referencedRelation: "loan_types"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_types: {
        Row: {
          created_at: string
          description: string | null
          eligibility_criteria: string | null
          faqs: Json
          features: Json
          icon: string | null
          id: string
          interest_rate_max: number | null
          interest_rate_min: number | null
          is_active: boolean
          long_description: string | null
          name: string
          slug: string | null
          tenure_max_months: number | null
          tenure_min_months: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          eligibility_criteria?: string | null
          faqs?: Json
          features?: Json
          icon?: string | null
          id?: string
          interest_rate_max?: number | null
          interest_rate_min?: number | null
          is_active?: boolean
          long_description?: string | null
          name: string
          slug?: string | null
          tenure_max_months?: number | null
          tenure_min_months?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          eligibility_criteria?: string | null
          faqs?: Json
          features?: Json
          icon?: string | null
          id?: string
          interest_rate_max?: number | null
          interest_rate_min?: number | null
          is_active?: boolean
          long_description?: string | null
          name?: string
          slug?: string | null
          tenure_max_months?: number | null
          tenure_min_months?: number | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          archived_at: string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
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
      website_banners: {
        Row: {
          created_at: string
          cta_label: string | null
          id: string
          image_url: string | null
          is_active: boolean
          link_url: string | null
          position: number
          subtitle: string | null
          title: string | null
        }
        Insert: {
          created_at?: string
          cta_label?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          position?: number
          subtitle?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string
          cta_label?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          position?: number
          subtitle?: string | null
          title?: string | null
        }
        Relationships: []
      }
      website_content: {
        Row: {
          content_json: Json
          id: string
          section: string
          updated_at: string
        }
        Insert: {
          content_json?: Json
          id?: string
          section: string
          updated_at?: string
        }
        Update: {
          content_json?: Json
          id?: string
          section?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_banker_share_bundle: { Args: { _token: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_team_member: { Args: { _user_id: string }; Returns: boolean }
      process_followup_reminders: { Args: never; Returns: Json }
    }
    Enums: {
      app_role:
        | "admin"
        | "customer"
        | "dsa"
        | "rm"
        | "loan_executive"
        | "team_leader"
      commission_status: "pending" | "partial" | "received"
      doc_status: "pending" | "approved" | "rejected"
      dsa_payout_basis: "manual" | "percentage"
      dsa_payout_status: "pending" | "partial" | "paid"
      lead_status: "new" | "contacted" | "qualified" | "converted" | "lost"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: [
        "admin",
        "customer",
        "dsa",
        "rm",
        "loan_executive",
        "team_leader",
      ],
      commission_status: ["pending", "partial", "received"],
      doc_status: ["pending", "approved", "rejected"],
      dsa_payout_basis: ["manual", "percentage"],
      dsa_payout_status: ["pending", "partial", "paid"],
      lead_status: ["new", "contacted", "qualified", "converted", "lost"],
    },
  },
} as const
