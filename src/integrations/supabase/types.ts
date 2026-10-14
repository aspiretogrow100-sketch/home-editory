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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      ai_settings: {
        Row: {
          active_image_provider: string
          id: number
          openai_api_key: string | null
          replicate_api_key: string | null
          replicate_model: string
          updated_at: string
        }
        Insert: {
          active_image_provider?: string
          id?: number
          openai_api_key?: string | null
          replicate_api_key?: string | null
          replicate_model?: string
          updated_at?: string
        }
        Update: {
          active_image_provider?: string
          id?: number
          openai_api_key?: string | null
          replicate_api_key?: string | null
          replicate_model?: string
          updated_at?: string
        }
        Relationships: []
      }
      amazon_settings: {
        Row: {
          creators_client_id: string | null
          creators_client_secret: string | null
          id: number
          marketplace: string
          paapi_access_key: string | null
          paapi_secret_key: string | null
          provider: string
          rainforest_api_key: string | null
          scraperapi_api_key: string | null
          tracking_id: string | null
          updated_at: string
        }
        Insert: {
          creators_client_id?: string | null
          creators_client_secret?: string | null
          id?: number
          marketplace?: string
          paapi_access_key?: string | null
          paapi_secret_key?: string | null
          provider?: string
          rainforest_api_key?: string | null
          scraperapi_api_key?: string | null
          tracking_id?: string | null
          updated_at?: string
        }
        Update: {
          creators_client_id?: string | null
          creators_client_secret?: string | null
          id?: number
          marketplace?: string
          paapi_access_key?: string | null
          paapi_secret_key?: string | null
          provider?: string
          rainforest_api_key?: string | null
          scraperapi_api_key?: string | null
          tracking_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      design_options: {
        Row: {
          amount: number | null
          created_at: string
          hint: string | null
          id: string
          is_active: boolean
          kind: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          hint?: string | null
          id?: string
          is_active?: boolean
          kind: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          hint?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      generations: {
        Row: {
          amazon_products: Json
          budget_range: string
          created_at: string
          design_style: string
          discount_filter: string | null
          id: string
          image_url: string | null
          is_unlocked: boolean
          products_source: string
          room_size: string | null
          room_type: string
          square_feet: number | null
          user_id: string
        }
        Insert: {
          amazon_products?: Json
          budget_range: string
          created_at?: string
          design_style: string
          discount_filter?: string | null
          id?: string
          image_url?: string | null
          is_unlocked?: boolean
          products_source?: string
          room_size?: string | null
          room_type: string
          square_feet?: number | null
          user_id: string
        }
        Update: {
          amazon_products?: Json
          budget_range?: string
          created_at?: string
          design_style?: string
          discount_filter?: string | null
          id?: string
          image_url?: string | null
          is_unlocked?: boolean
          products_source?: string
          room_size?: string | null
          room_type?: string
          square_feet?: number | null
          user_id?: string
        }
        Relationships: []
      }
      paddle_settings: {
        Row: {
          api_key: string | null
          client_token: string | null
          enabled: boolean
          environment: string
          id: number
          price_id: string | null
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          api_key?: string | null
          client_token?: string | null
          enabled?: boolean
          environment?: string
          id?: number
          price_id?: string | null
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          api_key?: string | null
          client_token?: string | null
          enabled?: boolean
          environment?: string
          id?: number
          price_id?: string | null
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_rooms: {
        Row: {
          budget: string
          created_at: string
          generation_id: string | null
          id: string
          image_url: string | null
          is_unlocked: boolean
          room_type: string
          shopping_list: Json
          style: string
          user_id: string
        }
        Insert: {
          budget: string
          created_at?: string
          generation_id?: string | null
          id?: string
          image_url?: string | null
          is_unlocked?: boolean
          room_type: string
          shopping_list?: Json
          style: string
          user_id: string
        }
        Update: {
          budget?: string
          created_at?: string
          generation_id?: string | null
          id?: string
          image_url?: string | null
          is_unlocked?: boolean
          room_type?: string
          shopping_list?: Json
          style?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_rooms_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "generations"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          generation_id: string | null
          id: string
          payment_status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          generation_id?: string | null
          id?: string
          payment_status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          generation_id?: string | null
          id?: string
          payment_status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "generations"
            referencedColumns: ["id"]
          },
        ]
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
      whop_settings: {
        Row: {
          api_key: string | null
          enabled: boolean
          id: number
          plan_id: string | null
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          enabled?: boolean
          id?: number
          plan_id?: string | null
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          enabled?: boolean
          id?: number
          plan_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      wizard_options: {
        Row: {
          amount: number | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          label: string
          sort_order: number
          step_name: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number
          step_name: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          step_name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
