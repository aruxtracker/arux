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
      bank_accounts: {
        Row: {
          account_type: string
          bank_name: string | null
          color: string
          created_at: string
          id: string
          last_four: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type?: string
          bank_name?: string | null
          color?: string
          created_at?: string
          id?: string
          last_four?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: string
          bank_name?: string | null
          color?: string
          created_at?: string
          id?: string
          last_four?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          category: string
          created_at: string
          id: string
          monthly_limit: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          monthly_limit?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          monthly_limit?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dream_bucket: {
        Row: {
          achieved: boolean
          category: string | null
          created_at: string
          id: string
          image_url: string | null
          notes: string | null
          priority: boolean | null
          product_link: string | null
          product_name: string
          saved_amount: number
          tags: string[] | null
          target_date: string | null
          target_price: number
          user_id: string
        }
        Insert: {
          achieved?: boolean
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          notes?: string | null
          priority?: boolean | null
          product_link?: string | null
          product_name: string
          saved_amount?: number
          tags?: string[] | null
          target_date?: string | null
          target_price?: number
          user_id: string
        }
        Update: {
          achieved?: boolean
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          notes?: string | null
          priority?: boolean | null
          product_link?: string | null
          product_name?: string
          saved_amount?: number
          tags?: string[] | null
          target_date?: string | null
          target_price?: number
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      grooming_entries: {
        Row: {
          amount: number
          created_at: string
          date: string
          id: string
          next_due: string | null
          notes: string | null
          place: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          next_due?: string | null
          notes?: string | null
          place?: string | null
          type?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          next_due?: string | null
          notes?: string | null
          place?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      habit_logs: {
        Row: {
          completed: boolean
          created_at: string
          date: string
          habit_id: string
          id: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          date?: string
          habit_id: string
          id?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          date?: string
          habit_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          created_at: string
          emoji: string
          id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string
          id?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      ideas: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          tags: string[] | null
          title: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          tags?: string[] | null
          title: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          tags?: string[] | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      incomes: {
        Row: {
          amount: number
          bank_account_id: string | null
          category: string
          created_at: string
          date: string
          id: string
          notes: string | null
          source: string
          user_id: string
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          category?: string
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          source: string
          user_id: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          category?: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incomes_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      lent_borrow_entries: {
        Row: {
          amount: number
          created_at: string
          direction: string
          due_date: string | null
          id: string
          lent_or_borrowed_date: string
          notes: string | null
          person_name: string
          settled: boolean
          settled_amount: number
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          direction?: string
          due_date?: string | null
          id?: string
          lent_or_borrowed_date?: string
          notes?: string | null
          person_name: string
          settled?: boolean
          settled_amount?: number
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          direction?: string
          due_date?: string | null
          id?: string
          lent_or_borrowed_date?: string
          notes?: string | null
          person_name?: string
          settled?: boolean
          settled_amount?: number
          user_id?: string
        }
        Relationships: []
      }
      meetings: {
        Row: {
          created_at: string
          date: string
          id: string
          notes: string | null
          time: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          time: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          time?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      monthly_insights: {
        Row: {
          bullets: Json | null
          created_at: string
          id: string
          month: string
          summary: string
          user_id: string
        }
        Insert: {
          bullets?: Json | null
          created_at?: string
          id?: string
          month: string
          summary: string
          user_id: string
        }
        Update: {
          bullets?: Json | null
          created_at?: string
          id?: string
          month?: string
          summary?: string
          user_id?: string
        }
        Relationships: []
      }
      mood_entries: {
        Row: {
          created_at: string
          date: string
          energy: number
          id: string
          mood: number
          notes: string | null
          productivity: number
          sleep_quality: number
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          energy: number
          id?: string
          mood: number
          notes?: string | null
          productivity: number
          sleep_quality: number
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          energy?: number
          id?: string
          mood?: number
          notes?: string | null
          productivity?: number
          sleep_quality?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_preset: string | null
          avatar_url: string | null
          created_at: string
          display_name: string | null
          gender: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_preset?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          gender?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_preset?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          gender?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          device_label: string | null
          endpoint: string
          id: string
          last_seen_at: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          device_label?: string | null
          endpoint: string
          id?: string
          last_seen_at?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          device_label?: string | null
          endpoint?: string
          id?: string
          last_seen_at?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          completed: boolean
          created_at: string
          date: string
          id: string
          notes: string | null
          recurring: string | null
          time: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          recurring?: string | null
          time?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          recurring?: string | null
          time?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      savings_goals: {
        Row: {
          created_at: string
          deadline: string | null
          id: string
          notes: string | null
          saved_amount: number
          target_amount: number
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          id?: string
          notes?: string | null
          saved_amount?: number
          target_amount: number
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          deadline?: string | null
          id?: string
          notes?: string | null
          saved_amount?: number
          target_amount?: number
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          active: boolean
          amount: number
          billing_cycle: string
          category: string | null
          created_at: string
          id: string
          name: string
          next_renewal_date: string | null
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          amount?: number
          billing_cycle?: string
          category?: string | null
          created_at?: string
          id?: string
          name: string
          next_renewal_date?: string | null
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          amount?: number
          billing_cycle?: string
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          next_renewal_date?: string | null
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subtasks: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          position: number
          task_id: string
          title: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          position?: number
          task_id: string
          title: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          position?: number
          task_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_activity: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          list_id: string
          metadata: Json | null
          task_id: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          list_id: string
          metadata?: Json | null
          task_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          list_id?: string
          metadata?: Json | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_activity_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "task_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      task_list_invites: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          invited_by: string
          invited_email: string
          list_id: string
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          invited_by: string
          invited_email: string
          list_id: string
          status?: string
          token?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          invited_by?: string
          invited_email?: string
          list_id?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_list_invites_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "task_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      task_list_members: {
        Row: {
          id: string
          joined_at: string
          list_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          list_id: string
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          list_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_list_members_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "task_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      task_lists: {
        Row: {
          color: string
          created_at: string
          id: string
          is_shared: boolean
          name: string
          owner_id: string
          position: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_shared?: boolean
          name: string
          owner_id: string
          position?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_shared?: boolean
          name?: string
          owner_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed: boolean
          completed_by: string | null
          created_at: string
          date: string | null
          due_date: string | null
          id: string
          list_id: string | null
          meeting_id: string | null
          notes: string | null
          position: number
          priority: number
          recurring: string | null
          starred: boolean
          tags: string[]
          title: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          completed?: boolean
          completed_by?: string | null
          created_at?: string
          date?: string | null
          due_date?: string | null
          id?: string
          list_id?: string | null
          meeting_id?: string | null
          notes?: string | null
          position?: number
          priority?: number
          recurring?: string | null
          starred?: boolean
          tags?: string[]
          title: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          completed?: boolean
          completed_by?: string | null
          created_at?: string
          date?: string | null
          due_date?: string | null
          id?: string
          list_id?: string | null
          meeting_id?: string | null
          notes?: string | null
          position?: number
          priority?: number
          recurring?: string | null
          starred?: boolean
          tags?: string[]
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "task_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          expense_id: string | null
          id: string
          notes: string | null
          user_id: string
          vehicle_id: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          date?: string
          expense_id?: string | null
          id?: string
          notes?: string | null
          user_id: string
          vehicle_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          expense_id?: string | null
          id?: string
          notes?: string | null
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_expenses_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_services: {
        Row: {
          completed: boolean
          created_at: string
          due_date: string | null
          due_km: number | null
          id: string
          notes: string | null
          title: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          due_date?: string | null
          due_km?: number | null
          id?: string
          notes?: string | null
          title: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          due_date?: string | null
          due_km?: number | null
          id?: string
          notes?: string | null
          title?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_services_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          created_at: string
          current_km: number | null
          id: string
          image_url: string | null
          name: string
          notes: string | null
          purchase_date: string | null
          reg_number: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_km?: number | null
          id?: string
          image_url?: string | null
          name: string
          notes?: string | null
          purchase_date?: string | null
          reg_number?: string | null
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_km?: number | null
          id?: string
          image_url?: string | null
          name?: string
          notes?: string | null
          purchase_date?: string | null
          reg_number?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_list_member: {
        Args: { _list_id: string; _user_id: string }
        Returns: boolean
      }
      is_list_owner: {
        Args: { _list_id: string; _user_id: string }
        Returns: boolean
      }
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
    Enums: {},
  },
} as const
