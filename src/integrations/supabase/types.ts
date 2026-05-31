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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          category: string
          created_at: string
          details: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          title: string
          user_id: string | null
        }
        Insert: {
          action: string
          category?: string
          created_at?: string
          details?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          title: string
          user_id?: string | null
        }
        Update: {
          action?: string
          category?: string
          created_at?: string
          details?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          body: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean
          link: string | null
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      background_composition_results: {
        Row: {
          background_candidate_id: string | null
          background_image_url: string
          composed_image_url: string
          created_at: string
          created_by: string | null
          id: string
          method: string
          notes: string | null
          preset: string | null
          product_id: string | null
          source_image_url: string
        }
        Insert: {
          background_candidate_id?: string | null
          background_image_url: string
          composed_image_url: string
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string
          notes?: string | null
          preset?: string | null
          product_id?: string | null
          source_image_url: string
        }
        Update: {
          background_candidate_id?: string | null
          background_image_url?: string
          composed_image_url?: string
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string
          notes?: string | null
          preset?: string | null
          product_id?: string | null
          source_image_url?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name_en: string
          name_es: string
          slug: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name_en: string
          name_es: string
          slug: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name_en?: string
          name_es?: string
          slug?: string
        }
        Relationships: []
      }
      discount_codes: {
        Row: {
          banner_text_en: string | null
          banner_text_es: string | null
          code: string
          created_at: string
          current_uses: number
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          min_purchase: number
          show_banner: boolean
          starts_at: string
          updated_at: string
        }
        Insert: {
          banner_text_en?: string | null
          banner_text_es?: string | null
          code: string
          created_at?: string
          current_uses?: number
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_purchase?: number
          show_banner?: boolean
          starts_at?: string
          updated_at?: string
        }
        Update: {
          banner_text_en?: string | null
          banner_text_es?: string | null
          code?: string
          created_at?: string
          current_uses?: number
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_purchase?: number
          show_banner?: boolean
          starts_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          cost_per_kg: number
          created_at: string
          description_en: string | null
          description_es: string | null
          id: string
          is_active: boolean
          name_en: string
          name_es: string
        }
        Insert: {
          cost_per_kg?: number
          created_at?: string
          description_en?: string | null
          description_es?: string | null
          id?: string
          is_active?: boolean
          name_en: string
          name_es: string
        }
        Update: {
          cost_per_kg?: number
          created_at?: string
          description_en?: string | null
          description_es?: string | null
          id?: string
          is_active?: boolean
          name_en?: string
          name_es?: string
        }
        Relationships: []
      }
      model_requests: {
        Row: {
          created_at: string
          description: string | null
          email: string
          fulfilled_product_id: string | null
          id: string
          images: Json | null
          name: string
          phone: string
          product_name: string
          reference_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          email: string
          fulfilled_product_id?: string | null
          id?: string
          images?: Json | null
          name: string
          phone: string
          product_name: string
          reference_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          email?: string
          fulfilled_product_id?: string | null
          id?: string
          images?: Json | null
          name?: string
          phone?: string
          product_name?: string
          reference_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_requests_fulfilled_product_id_fkey"
            columns: ["fulfilled_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          notes: string | null
          order_id: string
          product_id: string
          quantity: number
          selected_variations: Json | null
          unit_price: number
        }
        Insert: {
          id?: string
          notes?: string | null
          order_id: string
          product_id: string
          quantity?: number
          selected_variations?: Json | null
          unit_price?: number
        }
        Update: {
          id?: string
          notes?: string | null
          order_id?: string
          product_id?: string
          quantity?: number
          selected_variations?: Json | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          discount_amount: number
          discount_code_id: string | null
          id: string
          notes: string | null
          payment_method: string | null
          shipping_address: Json | null
          shipping_cost: number | null
          shipping_provider_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discount_amount?: number
          discount_code_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          shipping_address?: Json | null
          shipping_cost?: number | null
          shipping_provider_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          discount_amount?: number
          discount_code_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          shipping_address?: Json | null
          shipping_cost?: number | null
          shipping_provider_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_likes: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_likes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_materials: {
        Row: {
          id: string
          material_id: string
          product_id: string
        }
        Insert: {
          id?: string
          material_id: string
          product_id: string
        }
        Update: {
          id?: string
          material_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_materials_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          media: Json | null
          product_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          media?: Json | null
          product_id: string
          rating?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          media?: Json | null
          product_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variations: {
        Row: {
          created_at: string
          dimensions: string | null
          id: string
          image_url: string | null
          is_active: boolean
          material_id: string | null
          name_en: string
          name_es: string
          price_modifier: number
          price_override: number | null
          product_id: string
          type: string
          use_manual_price: boolean
          value: string
          weight_grams: number | null
        }
        Insert: {
          created_at?: string
          dimensions?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          material_id?: string | null
          name_en: string
          name_es?: string
          price_modifier?: number
          price_override?: number | null
          product_id: string
          type?: string
          use_manual_price?: boolean
          value?: string
          weight_grams?: number | null
        }
        Update: {
          created_at?: string
          dimensions?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          material_id?: string | null
          name_en?: string
          name_es?: string
          price_modifier?: number
          price_override?: number | null
          product_id?: string
          type?: string
          use_manual_price?: boolean
          value?: string
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price: number
          category_id: string | null
          created_at: string
          description_en: string | null
          description_es: string | null
          id: string
          images: Json | null
          is_active: boolean
          is_featured: boolean
          model_3d_url: string | null
          name_en: string
          name_es: string
          slug: string
          updated_at: string
        }
        Insert: {
          base_price?: number
          category_id?: string | null
          created_at?: string
          description_en?: string | null
          description_es?: string | null
          id?: string
          images?: Json | null
          is_active?: boolean
          is_featured?: boolean
          model_3d_url?: string | null
          name_en: string
          name_es: string
          slug: string
          updated_at?: string
        }
        Update: {
          base_price?: number
          category_id?: string | null
          created_at?: string
          description_en?: string | null
          description_es?: string | null
          id?: string
          images?: Json | null
          is_active?: boolean
          is_featured?: boolean
          model_3d_url?: string | null
          name_en?: string
          name_es?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          total_orders: number
          total_rewards: number
          total_signups: number
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          total_orders?: number
          total_rewards?: number
          total_signups?: number
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          total_orders?: number
          total_rewards?: number
          total_signups?: number
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          code: string
          created_at: string
          first_order_id: string | null
          id: string
          referred_user_id: string
          referrer_user_id: string
          reward_amount: number
          status: string
        }
        Insert: {
          code: string
          created_at?: string
          first_order_id?: string | null
          id?: string
          referred_user_id: string
          referrer_user_id: string
          reward_amount?: number
          status?: string
        }
        Update: {
          code?: string
          created_at?: string
          first_order_id?: string | null
          id?: string
          referred_user_id?: string
          referrer_user_id?: string
          reward_amount?: number
          status?: string
        }
        Relationships: []
      }
      shipping_providers: {
        Row: {
          base_rate: number
          created_at: string
          description_en: string | null
          description_es: string | null
          estimated_days_max: number | null
          estimated_days_min: number | null
          id: string
          is_active: boolean
          name: string
          per_kg_rate: number
          updated_at: string
        }
        Insert: {
          base_rate?: number
          created_at?: string
          description_en?: string | null
          description_es?: string | null
          estimated_days_max?: number | null
          estimated_days_min?: number | null
          id?: string
          is_active?: boolean
          name: string
          per_kg_rate?: number
          updated_at?: string
        }
        Update: {
          base_rate?: number
          created_at?: string
          description_en?: string | null
          description_es?: string | null
          estimated_days_max?: number | null
          estimated_days_min?: number | null
          id?: string
          is_active?: boolean
          name?: string
          per_kg_rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      system_background_candidates: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          image_url: string
          is_active: boolean
          preset: string
          prompt: string | null
          source: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          preset: string
          prompt?: string | null
          source?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          preset?: string
          prompt?: string | null
          source?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_purchased_product: {
        Args: { _product_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_discount_usage: { Args: { _id: string }; Returns: undefined }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      order_status:
        | "pending"
        | "confirmed"
        | "printing"
        | "shipped"
        | "delivered"
        | "cancelled"
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
      app_role: ["admin", "user"],
      order_status: [
        "pending",
        "confirmed",
        "printing",
        "shipped",
        "delivered",
        "cancelled",
      ],
    },
  },
} as const
