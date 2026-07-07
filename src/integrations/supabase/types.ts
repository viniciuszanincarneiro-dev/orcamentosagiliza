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
      escritorios: {
        Row: {
          ativo: boolean
          cidade: string
          cnpj: string
          created_at: string
          email: string
          endereco: string
          id: string
          nome: string
          ordem: number
          razao_social: string
          telefone: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cidade: string
          cnpj: string
          created_at?: string
          email: string
          endereco: string
          id?: string
          nome: string
          ordem?: number
          razao_social: string
          telefone: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cidade?: string
          cnpj?: string
          created_at?: string
          email?: string
          endereco?: string
          id?: string
          nome?: string
          ordem?: number
          razao_social?: string
          telefone?: string
          updated_at?: string
        }
        Relationships: []
      }
      itbi_municipios: {
        Row: {
          aliquota: number
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          aliquota?: number
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          aliquota?: number
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      itcmd_aliquotas: {
        Row: {
          aliquota: number
          ativo: boolean
          created_at: string
          descricao: string | null
          faixa_max: number | null
          faixa_min: number
          id: string
          tipo: string
          uf: string
          updated_at: string
        }
        Insert: {
          aliquota: number
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          faixa_max?: number | null
          faixa_min?: number
          id?: string
          tipo: string
          uf?: string
          updated_at?: string
        }
        Update: {
          aliquota?: number
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          faixa_max?: number | null
          faixa_min?: number
          id?: string
          tipo?: string
          uf?: string
          updated_at?: string
        }
        Relationships: []
      }
      orcamentos: {
        Row: {
          cliente_telefone: string | null
          cliente_whatsapp: string | null
          confrontantes: Json | null
          created_at: string
          created_by: string | null
          created_by_escritorio_nome: string | null
          created_by_nome: string | null
          data_envio: string | null
          deleted_at: string | null
          escritorio_id: string | null
          id: string
          imovel_area_m2: number | null
          imovel_car: string | null
          imovel_ccir: string | null
          imovel_descricao: string | null
          imovel_localizacao: string | null
          imovel_matricula: string | null
          imovel_municipio: string | null
          imovel_valor_avaliado: number | null
          itbi_aliquota: number | null
          itbi_area_transmitida: number | null
          itbi_base_calculo: number | null
          itbi_estimado: number | null
          itbi_fracao_ideal: number | null
          itbi_municipio: string | null
          itbi_usar_contrato: boolean | null
          itbi_valor_contrato: number | null
          itbi_valor_declarado: number | null
          itcmd_estimado: number | null
          itens: Json
          numero: string
          observacoes: string | null
          proprietarios: Json | null
          requerente_cpf_cnpj: string | null
          requerente_nome: string
          servicos: Json
          status: string
          tipo_servico: string
          ultimo_contato: string | null
          updated_at: string
          updated_by: string | null
          updated_by_escritorio_nome: string | null
          updated_by_nome: string | null
          validade_dias: number | null
          valor_total: number
        }
        Insert: {
          cliente_telefone?: string | null
          cliente_whatsapp?: string | null
          confrontantes?: Json | null
          created_at?: string
          created_by?: string | null
          created_by_escritorio_nome?: string | null
          created_by_nome?: string | null
          data_envio?: string | null
          deleted_at?: string | null
          escritorio_id?: string | null
          id?: string
          imovel_area_m2?: number | null
          imovel_car?: string | null
          imovel_ccir?: string | null
          imovel_descricao?: string | null
          imovel_localizacao?: string | null
          imovel_matricula?: string | null
          imovel_municipio?: string | null
          imovel_valor_avaliado?: number | null
          itbi_aliquota?: number | null
          itbi_area_transmitida?: number | null
          itbi_base_calculo?: number | null
          itbi_estimado?: number | null
          itbi_fracao_ideal?: number | null
          itbi_municipio?: string | null
          itbi_usar_contrato?: boolean | null
          itbi_valor_contrato?: number | null
          itbi_valor_declarado?: number | null
          itcmd_estimado?: number | null
          itens?: Json
          numero: string
          observacoes?: string | null
          proprietarios?: Json | null
          requerente_cpf_cnpj?: string | null
          requerente_nome: string
          servicos?: Json
          status?: string
          tipo_servico?: string
          ultimo_contato?: string | null
          updated_at?: string
          updated_by?: string | null
          updated_by_escritorio_nome?: string | null
          updated_by_nome?: string | null
          validade_dias?: number | null
          valor_total?: number
        }
        Update: {
          cliente_telefone?: string | null
          cliente_whatsapp?: string | null
          confrontantes?: Json | null
          created_at?: string
          created_by?: string | null
          created_by_escritorio_nome?: string | null
          created_by_nome?: string | null
          data_envio?: string | null
          deleted_at?: string | null
          escritorio_id?: string | null
          id?: string
          imovel_area_m2?: number | null
          imovel_car?: string | null
          imovel_ccir?: string | null
          imovel_descricao?: string | null
          imovel_localizacao?: string | null
          imovel_matricula?: string | null
          imovel_municipio?: string | null
          imovel_valor_avaliado?: number | null
          itbi_aliquota?: number | null
          itbi_area_transmitida?: number | null
          itbi_base_calculo?: number | null
          itbi_estimado?: number | null
          itbi_fracao_ideal?: number | null
          itbi_municipio?: string | null
          itbi_usar_contrato?: boolean | null
          itbi_valor_contrato?: number | null
          itbi_valor_declarado?: number | null
          itcmd_estimado?: number | null
          itens?: Json
          numero?: string
          observacoes?: string | null
          proprietarios?: Json | null
          requerente_cpf_cnpj?: string | null
          requerente_nome?: string
          servicos?: Json
          status?: string
          tipo_servico?: string
          ultimo_contato?: string | null
          updated_at?: string
          updated_by?: string | null
          updated_by_escritorio_nome?: string | null
          updated_by_nome?: string | null
          validade_dias?: number | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          escritorio_id: string | null
          id: string
          nome: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          escritorio_id?: string | null
          id: string
          nome?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          escritorio_id?: string | null
          id?: string
          nome?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      tabela_registro_imoveis: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          faixa_max: number | null
          faixa_min: number
          id: string
          updated_at: string
          valor: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          faixa_max?: number | null
          faixa_min?: number
          id?: string
          updated_at?: string
          valor: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          faixa_max?: number | null
          faixa_min?: number
          id?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      tabela_tabelionato: {
        Row: {
          ativo: boolean
          ato: string
          created_at: string
          descricao: string | null
          faixa_max: number | null
          faixa_min: number
          id: string
          updated_at: string
          valor: number
        }
        Insert: {
          ativo?: boolean
          ato: string
          created_at?: string
          descricao?: string | null
          faixa_max?: number | null
          faixa_min?: number
          id?: string
          updated_at?: string
          valor: number
        }
        Update: {
          ativo?: boolean
          ato?: string
          created_at?: string
          descricao?: string | null
          faixa_max?: number | null
          faixa_min?: number
          id?: string
          updated_at?: string
          valor?: number
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
      current_escritorio_id: { Args: never; Returns: string }
      dashboard_stats: {
        Args: never
        Returns: {
          finalizados: number
          lucro_bruto: number
          rascunhos: number
          repasses: number
          total: number
          valor_total: number
        }[]
      }
      gen_orcamento_numero: { Args: never; Returns: string }
      is_admin: { Args: { _uid: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "usuario"
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
      app_role: ["admin", "usuario"],
    },
  },
} as const
