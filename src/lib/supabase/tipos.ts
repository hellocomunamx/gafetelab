
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "campos": {
                  Row: {
                    "actualizado_en": string,"cara": string,"clave": string,"creado_en": string,"de_sistema": boolean,"empresa_id": string,"en_gafete": boolean,"etiqueta": string,"id": string,"obligatorio": boolean,"orden": number,"tipo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_en"?: string,"cara"?: string,"clave": string,"creado_en"?: string,"de_sistema"?: boolean,"empresa_id": string,"en_gafete"?: boolean,"etiqueta": string,"id"?: string,"obligatorio"?: boolean,"orden"?: number,"tipo"?: string
                  }
                  Update: {
                    "actualizado_en"?: string,"cara"?: string,"clave"?: string,"creado_en"?: string,"de_sistema"?: boolean,"empresa_id"?: string,"en_gafete"?: boolean,"etiqueta"?: string,"id"?: string,"obligatorio"?: boolean,"orden"?: number,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "campos_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                },"datos_fiscales": {
                  Row: {
                    "actualizado_en": string,"correo": string,"cp_fiscal": string,"creado_en": string,"empresa_id": string,"id": string,"predeterminado": boolean,"razon_social": string,"regimen_fiscal": string,"rfc": string,"uso_cfdi": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_en"?: string,"correo": string,"cp_fiscal": string,"creado_en"?: string,"empresa_id": string,"id"?: string,"predeterminado"?: boolean,"razon_social": string,"regimen_fiscal": string,"rfc": string,"uso_cfdi": string
                  }
                  Update: {
                    "actualizado_en"?: string,"correo"?: string,"cp_fiscal"?: string,"creado_en"?: string,"empresa_id"?: string,"id"?: string,"predeterminado"?: boolean,"razon_social"?: string,"regimen_fiscal"?: string,"rfc"?: string,"uso_cfdi"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "datos_fiscales_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                },"direcciones": {
                  Row: {
                    "actualizado_en": string,"alias": string | null,"calle": string,"ciudad": string,"colonia": string,"cp": string,"creado_en": string,"destinatario": string,"empresa_id": string,"estado": string,"id": string,"predeterminada": boolean,"referencias": string | null,"telefono": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_en"?: string,"alias"?: string | null,"calle": string,"ciudad": string,"colonia": string,"cp": string,"creado_en"?: string,"destinatario": string,"empresa_id": string,"estado": string,"id"?: string,"predeterminada"?: boolean,"referencias"?: string | null,"telefono": string
                  }
                  Update: {
                    "actualizado_en"?: string,"alias"?: string | null,"calle"?: string,"ciudad"?: string,"colonia"?: string,"cp"?: string,"creado_en"?: string,"destinatario"?: string,"empresa_id"?: string,"estado"?: string,"id"?: string,"predeterminada"?: boolean,"referencias"?: string | null,"telefono"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "direcciones_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                },"disenos": {
                  Row: {
                    "actualizado_en": string,"creado_en": string,"empresa_id": string,"frente": NonNullable<Json>,"id": string,"nombre": string,"orientacion": string,"predeterminado": boolean,"vuelta": Json | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_en"?: string,"creado_en"?: string,"empresa_id": string,"frente"?: NonNullable<Json>,"id"?: string,"nombre": string,"orientacion"?: string,"predeterminado"?: boolean,"vuelta"?: Json | null
                  }
                  Update: {
                    "actualizado_en"?: string,"creado_en"?: string,"empresa_id"?: string,"frente"?: NonNullable<Json>,"id"?: string,"nombre"?: string,"orientacion"?: string,"predeterminado"?: boolean,"vuelta"?: Json | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "disenos_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                },"empleados": {
                  Row: {
                    "actualizado_en": string,"creado_en": string,"datos": NonNullable<Json>,"departamento": string | null,"empresa_id": string,"estatus": string,"fecha_baja": string | null,"foto_path": string | null,"id": string,"nombre": string,"numero_empleado": string | null,"puesto": string | null,"tipo_contrato": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_en"?: string,"creado_en"?: string,"datos"?: NonNullable<Json>,"departamento"?: string | null,"empresa_id": string,"estatus"?: string,"fecha_baja"?: string | null,"foto_path"?: string | null,"id"?: string,"nombre": string,"numero_empleado"?: string | null,"puesto"?: string | null,"tipo_contrato"?: string | null
                  }
                  Update: {
                    "actualizado_en"?: string,"creado_en"?: string,"datos"?: NonNullable<Json>,"departamento"?: string | null,"empresa_id"?: string,"estatus"?: string,"fecha_baja"?: string | null,"foto_path"?: string | null,"id"?: string,"nombre"?: string,"numero_empleado"?: string | null,"puesto"?: string | null,"tipo_contrato"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "empleados_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                },"empresas": {
                  Row: {
                    "actualizado_en": string,"creado_en": string,"creado_por": string | null,"giro": string | null,"id": string,"nombre": string,"predeterminados": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_en"?: string,"creado_en"?: string,"creado_por"?: string | null,"giro"?: string | null,"id"?: string,"nombre": string,"predeterminados"?: NonNullable<Json>
                  }
                  Update: {
                    "actualizado_en"?: string,"creado_en"?: string,"creado_por"?: string | null,"giro"?: string | null,"id"?: string,"nombre"?: string,"predeterminados"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"gafetes": {
                  Row: {
                    "datos": NonNullable<Json>,"diseno_id": string | null,"emitido_en": string,"empleado_id": string,"empresa_id": string,"estado": string,"id": string,"motivo": string,"pedido_id": string | null,"tipo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "datos"?: NonNullable<Json>,"diseno_id"?: string | null,"emitido_en"?: string,"empleado_id": string,"empresa_id": string,"estado"?: string,"id"?: string,"motivo": string,"pedido_id"?: string | null,"tipo": string
                  }
                  Update: {
                    "datos"?: NonNullable<Json>,"diseno_id"?: string | null,"emitido_en"?: string,"empleado_id"?: string,"empresa_id"?: string,"estado"?: string,"id"?: string,"motivo"?: string,"pedido_id"?: string | null,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gafetes_diseno_id_fkey"
      columns: ["diseno_id"]
isOneToOne: false
      referencedRelation: "disenos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gafetes_empleado_id_fkey"
      columns: ["empleado_id"]
isOneToOne: false
      referencedRelation: "empleados"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gafetes_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                },"invitaciones": {
                  Row: {
                    "correo": string,"creado_en": string,"empresa_id": string,"id": string,"invitado_por": string | null,"rol": string
                  }
                  ComputedFields: never
                  Insert: {
                    "correo": string,"creado_en"?: string,"empresa_id": string,"id"?: string,"invitado_por"?: string | null,"rol"?: string
                  }
                  Update: {
                    "correo"?: string,"creado_en"?: string,"empresa_id"?: string,"id"?: string,"invitado_por"?: string | null,"rol"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "invitaciones_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                },"miembros": {
                  Row: {
                    "creado_en": string,"empresa_id": string,"rol": string,"usuario_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "creado_en"?: string,"empresa_id": string,"rol"?: string,"usuario_id": string
                  }
                  Update: {
                    "creado_en"?: string,"empresa_id"?: string,"rol"?: string,"usuario_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "miembros_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                },"perfiles": {
                  Row: {
                    "actualizado_en": string,"creado_en": string,"id": string,"nombre": string | null,"telefono": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_en"?: string,"creado_en"?: string,"id": string,"nombre"?: string | null,"telefono"?: string | null
                  }
                  Update: {
                    "actualizado_en"?: string,"creado_en"?: string,"id"?: string,"nombre"?: string | null,"telefono"?: string | null
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "aceptar_invitacion":
{ Args: { "p_invitacion": string }; Returns: string
                           },
"cambiar_rol_usuario":
{ Args: { "p_empresa": string,"p_rol": string,"p_usuario": string }; Returns: undefined
                           },
"crear_empresa":
{ Args: { "p_giro"?: string,"p_nombre": string }; Returns: string
                           },
"invitar_usuario":
{ Args: { "p_correo": string,"p_empresa": string,"p_rol"?: string }; Returns: string
                           },
"mis_invitaciones":
{ Args: Record<PropertyKey, never>; Returns: {
              "creado_en": string,"empresa": string,"empresa_id": string,"id": string,"rol": string
            }[]
                           },
"quitar_usuario":
{ Args: { "p_empresa": string,"p_usuario": string }; Returns: undefined
                           },
"usuarios_de":
{ Args: { "p_empresa": string }; Returns: {
              "correo": string,"desde": string,"nombre": string,"rol": string,"usuario_id": string
            }[]
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
