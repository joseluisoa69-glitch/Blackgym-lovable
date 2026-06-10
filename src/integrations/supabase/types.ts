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
      meal_plans: {
        Row: {
          carbs_g: number
          created_at: string
          fats_g: number
          id: string
          is_active: boolean
          meals: Json
          name: string
          protein_g: number
          total_calories: number
          updated_at: string
          user_id: string
        }
        Insert: {
          carbs_g: number
          created_at?: string
          fats_g: number
          id?: string
          is_active?: boolean
          meals?: Json
          name?: string
          protein_g: number
          total_calories: number
          updated_at?: string
          user_id: string
        }
        Update: {
          carbs_g?: number
          created_at?: string
          fats_g?: number
          id?: string
          is_active?: boolean
          meals?: Json
          name?: string
          protein_g?: number
          total_calories?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nutrition_profile: {
        Row: {
          activity_level: string | null
          allergies: string[] | null
          bmr: number | null
          carbs_g: number | null
          completed_at: string | null
          created_at: string
          dietary_pref: string | null
          disliked_foods: string[] | null
          experience: string | null
          fats_g: number | null
          goal: string | null
          height_cm: number | null
          is_breastfeeding: boolean | null
          is_pregnant: boolean | null
          medical_conditions: string | null
          physical_limitations: string | null
          pregnancy_weeks: number | null
          protein_g: number | null
          target_calories: number | null
          target_weight_kg: number | null
          tdee: number | null
          training_days_per_week: number | null
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          activity_level?: string | null
          allergies?: string[] | null
          bmr?: number | null
          carbs_g?: number | null
          completed_at?: string | null
          created_at?: string
          dietary_pref?: string | null
          disliked_foods?: string[] | null
          experience?: string | null
          fats_g?: number | null
          goal?: string | null
          height_cm?: number | null
          is_breastfeeding?: boolean | null
          is_pregnant?: boolean | null
          medical_conditions?: string | null
          physical_limitations?: string | null
          pregnancy_weeks?: number | null
          protein_g?: number | null
          target_calories?: number | null
          target_weight_kg?: number | null
          tdee?: number | null
          training_days_per_week?: number | null
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          activity_level?: string | null
          allergies?: string[] | null
          bmr?: number | null
          carbs_g?: number | null
          completed_at?: string | null
          created_at?: string
          dietary_pref?: string | null
          disliked_foods?: string[] | null
          experience?: string | null
          fats_g?: number | null
          goal?: string | null
          height_cm?: number | null
          is_breastfeeding?: boolean | null
          is_pregnant?: boolean | null
          medical_conditions?: string | null
          physical_limitations?: string | null
          pregnancy_weeks?: number | null
          protein_g?: number | null
          target_calories?: number | null
          target_weight_kg?: number | null
          tdee?: number | null
          training_days_per_week?: number | null
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          display_name: string | null
          gender: string | null
          id: string
          units: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          gender?: string | null
          id: string
          units?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          gender?: string | null
          id?: string
          units?: string
          updated_at?: string
        }
        Relationships: []
      }
      routine_days: {
        Row: {
          day_index: number
          exercises: Json
          id: string
          muscle_groups: string[]
          routine_id: string
          title: string
        }
        Insert: {
          day_index: number
          exercises?: Json
          id?: string
          muscle_groups?: string[]
          routine_id: string
          title: string
        }
        Update: {
          day_index?: number
          exercises?: Json
          id?: string
          muscle_groups?: string[]
          routine_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_days_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          created_at: string
          days_per_week: number
          goal: string | null
          id: string
          is_active: boolean
          level: string | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days_per_week: number
          goal?: string | null
          id?: string
          is_active?: boolean
          level?: string | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          days_per_week?: number
          goal?: string | null
          id?: string
          is_active?: boolean
          level?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
