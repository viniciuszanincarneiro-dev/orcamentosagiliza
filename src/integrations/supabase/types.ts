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
      orcamentos: {
        Row: {
          cliente_telefone: string | null
          cliente_whatsapp: string | null
          confrontantes: Json | null
          created_at: string
          created_by: string | null
          data_envio: string | null
          id: string
          imovel_area_m2: number | null
          imovel_car: string | null
          imovel_ccir: string | null
          imovel_descricao: string | null
          imovel_localizacao: string | null
          imovel_matricula: string | null
          imovel_municipio: string | null
          imovel_valor_avaliado: number | null
          itens: Json
          numero: string
          observacoes: string | null
          proprietarios: Json | null
          requerente_cpf_cnpj: string | null
          requerente_nome: string
          status: string
          tipo_servico: string
          ultimo_contato: string | null
          updated_at: string
          validade_dias: number | null
          valor_total: number
        }
        Insert: {
          cliente_telefone?: string | null
          cliente_whatsapp?: string | null
          confrontantes?: Json | null
          created_at?: string
          created_by?: string | null
          data_envio?: string | null
          id?: string
          imovel_area_m2?: number | null
          imovel_car?: string | null
          imovel_ccir?: string | null
          imovel_descricao?: string | null
          imovel_localizacao?: string | null
          imovel_matricula?: string | null
          imovel_municipio?: string | null
          imovel_valor_avaliado?: number | null
          itens?: Json
          numero: string
          observacoes?: string | null
          proprietarios?: Json | null
          requerente_cpf_cnpj?: string | null
          requerente_nome: string
          status?: string
          tipo_servico?: string
          ultimo_contato?: string | null
          updated_at?: string
          validade_dias?: number | null
          valor_total?: number
        }
        Update: {
          cliente_telefone?: string | null
          cliente_whatsapp?: string | null
          confrontantes?: Json | null
          created_at?: string
          created_by?: string | null
          data_envio?: string | null
          id?: string
          imovel_area_m2?: number | null
          imovel_car?: string | null
          imovel_ccir?: string | null
          imovel_descricao?: string | null
          imovel_localizacao?: string | null
          imovel_matricula?: string | null
          imovel_municipio?: string | null
          imovel_valor_avaliado?: number | null
          itens?: Json
          numero?: string
          observacoes?: string | null
          proprietarios?: Json | null
          requerente_cpf_cnpj?: string | null
          requerente_nome?: string
          status?: string
          tipo_servico?: string
          ultimo_contato?: string | null
          updated_at?: string
          validade_dias?: number | null
          valor_total?: number
        }
        Relationships: []
      }
      tabela_valores: {
        Row: {
          categoria: string
          chave: string
          created_at: string
          descricao: string
          id: string
          ordem: number
          updated_at: string
          valor: number
        }
        Insert: {
          categoria: string
          chave: string
          created_at?: string
          descricao: string
          id?: string
          ordem?: number
          updated_at?: string
          valor: number
        }
        Update: {
          categoria?: string
          chave?: string
          created_at?: string
          descricao?: string
          id?: string
          ordem?: number
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      gen_orcamento_numero: { Args: never; Returns: string }
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
