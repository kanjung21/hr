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
      approval_workflows: {
        Row: {
          approval_levels: number
          created_at: string | null
          description: string | null
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          max_days: number | null
          min_days: number | null
          requires_hr: boolean | null
          updated_at: string | null
        }
        Insert: {
          approval_levels?: number
          created_at?: string | null
          description?: string | null
          id?: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          max_days?: number | null
          min_days?: number | null
          requires_hr?: boolean | null
          updated_at?: string | null
        }
        Update: {
          approval_levels?: number
          created_at?: string | null
          description?: string | null
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          max_days?: number | null
          min_days?: number | null
          requires_hr?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      company_holidays: {
        Row: {
          created_at: string
          description: string | null
          holiday_date: string
          id: string
          name: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          holiday_date: string
          id?: string
          name: string
          updated_at?: string
          year?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          holiday_date?: string
          id?: string
          name?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      employee_change_logs: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          employee_id: string
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          employee_id: string
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          employee_id?: string
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_change_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          annual_leave_quota: number | null
          birth_date: string | null
          created_at: string | null
          department_id: string | null
          email: string | null
          employee_code: string
          employee_type: Database["public"]["Enums"]["employee_type"] | null
          first_name: string
          gender: string | null
          id: string
          id_card_number: string | null
          last_name: string
          manager_id: string | null
          other_leave_quota: number | null
          personal_leave_quota: number | null
          phone: string | null
          position_id: string | null
          prefix: string | null
          sick_leave_quota: number | null
          start_date: string
          status: Database["public"]["Enums"]["employee_status"] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          annual_leave_quota?: number | null
          birth_date?: string | null
          created_at?: string | null
          department_id?: string | null
          email?: string | null
          employee_code: string
          employee_type?: Database["public"]["Enums"]["employee_type"] | null
          first_name: string
          gender?: string | null
          id?: string
          id_card_number?: string | null
          last_name: string
          manager_id?: string | null
          other_leave_quota?: number | null
          personal_leave_quota?: number | null
          phone?: string | null
          position_id?: string | null
          prefix?: string | null
          sick_leave_quota?: number | null
          start_date?: string
          status?: Database["public"]["Enums"]["employee_status"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          annual_leave_quota?: number | null
          birth_date?: string | null
          created_at?: string | null
          department_id?: string | null
          email?: string | null
          employee_code?: string
          employee_type?: Database["public"]["Enums"]["employee_type"] | null
          first_name?: string
          gender?: string | null
          id?: string
          id_card_number?: string | null
          last_name?: string
          manager_id?: string | null
          other_leave_quota?: number | null
          personal_leave_quota?: number | null
          phone?: string | null
          position_id?: string | null
          prefix?: string | null
          sick_leave_quota?: number | null
          start_date?: string
          status?: Database["public"]["Enums"]["employee_status"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_entitlements: {
        Row: {
          base_quota: number
          calculation_date: string
          created_at: string
          employee_id: string
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          policy_version_id: string | null
          prorated_quota: number
          remaining_days: number
          updated_at: string
          used_days: number
          year: number
        }
        Insert: {
          base_quota?: number
          calculation_date?: string
          created_at?: string
          employee_id: string
          id?: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          policy_version_id?: string | null
          prorated_quota?: number
          remaining_days?: number
          updated_at?: string
          used_days?: number
          year: number
        }
        Update: {
          base_quota?: number
          calculation_date?: string
          created_at?: string
          employee_id?: string
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          policy_version_id?: string | null
          prorated_quota?: number
          remaining_days?: number
          updated_at?: string
          used_days?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_entitlements_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_policy_rules: {
        Row: {
          annual_leave_quota: number
          created_at: string | null
          description: string | null
          employee_status: Database["public"]["Enums"]["employee_status"]
          employee_type: Database["public"]["Enums"]["employee_type"]
          id: string
          is_prorated: boolean
          maternity_leave_quota: number
          max_years_of_service: number | null
          min_years_of_service: number
          other_leave_quota: number
          paternity_leave_quota: number
          personal_leave_quota: number
          sick_leave_quota: number
          updated_at: string | null
        }
        Insert: {
          annual_leave_quota?: number
          created_at?: string | null
          description?: string | null
          employee_status?: Database["public"]["Enums"]["employee_status"]
          employee_type?: Database["public"]["Enums"]["employee_type"]
          id?: string
          is_prorated?: boolean
          maternity_leave_quota?: number
          max_years_of_service?: number | null
          min_years_of_service?: number
          other_leave_quota?: number
          paternity_leave_quota?: number
          personal_leave_quota?: number
          sick_leave_quota?: number
          updated_at?: string | null
        }
        Update: {
          annual_leave_quota?: number
          created_at?: string | null
          description?: string | null
          employee_status?: Database["public"]["Enums"]["employee_status"]
          employee_type?: Database["public"]["Enums"]["employee_type"]
          id?: string
          is_prorated?: boolean
          maternity_leave_quota?: number
          max_years_of_service?: number | null
          min_years_of_service?: number
          other_leave_quota?: number
          paternity_leave_quota?: number
          personal_leave_quota?: number
          sick_leave_quota?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          approval_level: number | null
          approved_at: string | null
          approver_id: string | null
          attachment_url: string | null
          created_at: string | null
          current_approval_step: number | null
          employee_id: string
          end_date: string
          end_time: string | null
          half_day_period: string | null
          hr_approved_at: string | null
          hr_approver_id: string | null
          id: string
          is_half_day: boolean | null
          leave_type: Database["public"]["Enums"]["leave_type"]
          manager_approved_at: string | null
          manager_approver_id: string | null
          reason: string | null
          rejection_reason: string | null
          requires_hr_approval: boolean | null
          start_date: string
          start_time: string | null
          status: Database["public"]["Enums"]["leave_status"] | null
          total_days: number
          updated_at: string | null
          validation_warnings: Json | null
        }
        Insert: {
          approval_level?: number | null
          approved_at?: string | null
          approver_id?: string | null
          attachment_url?: string | null
          created_at?: string | null
          current_approval_step?: number | null
          employee_id: string
          end_date: string
          end_time?: string | null
          half_day_period?: string | null
          hr_approved_at?: string | null
          hr_approver_id?: string | null
          id?: string
          is_half_day?: boolean | null
          leave_type: Database["public"]["Enums"]["leave_type"]
          manager_approved_at?: string | null
          manager_approver_id?: string | null
          reason?: string | null
          rejection_reason?: string | null
          requires_hr_approval?: boolean | null
          start_date: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["leave_status"] | null
          total_days: number
          updated_at?: string | null
          validation_warnings?: Json | null
        }
        Update: {
          approval_level?: number | null
          approved_at?: string | null
          approver_id?: string | null
          attachment_url?: string | null
          created_at?: string | null
          current_approval_step?: number | null
          employee_id?: string
          end_date?: string
          end_time?: string | null
          half_day_period?: string | null
          hr_approved_at?: string | null
          hr_approver_id?: string | null
          id?: string
          is_half_day?: boolean | null
          leave_type?: Database["public"]["Enums"]["leave_type"]
          manager_approved_at?: string | null
          manager_approver_id?: string | null
          reason?: string | null
          rejection_reason?: string | null
          requires_hr_approval?: boolean | null
          start_date?: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["leave_status"] | null
          total_days?: number
          updated_at?: string | null
          validation_warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_hr_approver_id_fkey"
            columns: ["hr_approver_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_manager_approver_id_fkey"
            columns: ["manager_approver_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      policy_audit_logs: {
        Row: {
          action: string
          changed_at: string
          changed_by: string
          id: string
          new_values: Json | null
          old_values: Json | null
          policy_id: string
          year: number
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          policy_id: string
          year?: number
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          policy_id?: string
          year?: number
        }
        Relationships: []
      }
      positions: {
        Row: {
          created_at: string | null
          department_id: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "positions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          employee_id: string | null
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          employee_id?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          employee_id?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string | null
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
      calculate_prorated_leave: {
        Args: {
          p_annual_days: number
          p_is_prorated?: boolean
          p_start_date: string
          p_year: number
        }
        Returns: number
      }
      calculate_working_days: {
        Args: { end_date: string; start_date: string }
        Returns: number
      }
      get_all_employees_leave_summary: {
        Args: { p_year?: number }
        Returns: {
          department_name: string
          employee_code: string
          employee_id: string
          employee_status: string
          employee_type: string
          first_name: string
          last_name: string
          maternity_quota: number
          maternity_remaining: number
          maternity_used: number
          other_quota: number
          other_remaining: number
          other_used: number
          paternity_quota: number
          paternity_remaining: number
          paternity_used: number
          personal_quota: number
          personal_remaining: number
          personal_used: number
          position_name: string
          sick_quota: number
          sick_remaining: number
          sick_used: number
          start_date: string
          vacation_quota: number
          vacation_remaining: number
          vacation_used: number
          years_of_service: number
        }[]
      }
      get_leave_balances: {
        Args: { p_employee_id?: string }
        Returns: {
          annual_leave_quota: number
          employee_code: string
          employee_id: string
          first_name: string
          last_name: string
          other_leave_quota: number
          other_used: number
          personal_leave_quota: number
          personal_used: number
          sick_leave_quota: number
          sick_used: number
          vacation_used: number
        }[]
      }
      get_user_employee_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      recalculate_all_entitlements_for_year: {
        Args: { p_year?: number }
        Returns: number
      }
      recalculate_employee_entitlements: {
        Args: { p_employee_id: string; p_year?: number }
        Returns: undefined
      }
      yearly_entitlements_reset: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "hr" | "manager" | "employee"
      employee_status: "active" | "resigned" | "suspended"
      employee_type: "permanent" | "contract" | "parttime"
      leave_status: "pending" | "approved" | "rejected" | "cancelled"
      leave_type:
        | "sick"
        | "personal"
        | "vacation"
        | "unpaid"
        | "other"
        | "maternity"
        | "paternity"
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
      app_role: ["admin", "hr", "manager", "employee"],
      employee_status: ["active", "resigned", "suspended"],
      employee_type: ["permanent", "contract", "parttime"],
      leave_status: ["pending", "approved", "rejected", "cancelled"],
      leave_type: [
        "sick",
        "personal",
        "vacation",
        "unpaid",
        "other",
        "maternity",
        "paternity",
      ],
    },
  },
} as const
