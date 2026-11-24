
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
            "aceptaciones": {
                  Row: {
                    "aceptado_en": string,"aviso_version": string,"id": string,"terminos_version": string,"usuario_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aceptado_en"?: string,"aviso_version": string,"id"?: string,"terminos_version": string,"usuario_id"?: string
                  }
                  Update: {
                    "aceptado_en"?: string,"aviso_version"?: string,"id"?: string,"terminos_version"?: string,"usuario_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"campos": {
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
                },"constancias": {
                  Row: {
                    "carta_aceptada_en": string | null,"carta_version": string | null,"correo": string | null,"correo_confirmado_en": string | null,"creado_en": string,"empresa_id": string,"estado": string,"fecha_emision": string | null,"fecha_leida": boolean,"id": string,"metodo": string,"motivo": string | null,"negocio": string | null,"prueba_liga": string | null,"prueba_ruta": string | null,"retirada_en": string | null,"retirada_por": string | null,"revisada_en": string | null,"ruta": string | null,"ruta_reverso": string | null,"subida_por": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "carta_aceptada_en"?: string | null,"carta_version"?: string | null,"correo"?: string | null,"correo_confirmado_en"?: string | null,"creado_en"?: string,"empresa_id": string,"estado"?: string,"fecha_emision"?: string | null,"fecha_leida"?: boolean,"id"?: string,"metodo"?: string,"motivo"?: string | null,"negocio"?: string | null,"prueba_liga"?: string | null,"prueba_ruta"?: string | null,"retirada_en"?: string | null,"retirada_por"?: string | null,"revisada_en"?: string | null,"ruta"?: string | null,"ruta_reverso"?: string | null,"subida_por"?: string | null
                  }
                  Update: {
                    "carta_aceptada_en"?: string | null,"carta_version"?: string | null,"correo"?: string | null,"correo_confirmado_en"?: string | null,"creado_en"?: string,"empresa_id"?: string,"estado"?: string,"fecha_emision"?: string | null,"fecha_leida"?: boolean,"id"?: string,"metodo"?: string,"motivo"?: string | null,"negocio"?: string | null,"prueba_liga"?: string | null,"prueba_ruta"?: string | null,"retirada_en"?: string | null,"retirada_por"?: string | null,"revisada_en"?: string | null,"ruta"?: string | null,"ruta_reverso"?: string | null,"subida_por"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "constancias_empresa_id_fkey"
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
                    "actualizado_en": string,"codigo": string,"correo": string | null,"creado_en": string,"datos": NonNullable<Json>,"departamento": string | null,"empresa_id": string,"estatus": string,"fecha_baja": string | null,"foto_path": string | null,"id": string,"liga": string,"liga_enviada_en": string | null,"nombre": string,"numero_empleado": string | null,"puesto": string | null,"tipo_contrato": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_en"?: string,"codigo"?: string,"correo"?: string | null,"creado_en"?: string,"datos"?: NonNullable<Json>,"departamento"?: string | null,"empresa_id": string,"estatus"?: string,"fecha_baja"?: string | null,"foto_path"?: string | null,"id"?: string,"liga"?: string,"liga_enviada_en"?: string | null,"nombre": string,"numero_empleado"?: string | null,"puesto"?: string | null,"tipo_contrato"?: string | null
                  }
                  Update: {
                    "actualizado_en"?: string,"codigo"?: string,"correo"?: string | null,"creado_en"?: string,"datos"?: NonNullable<Json>,"departamento"?: string | null,"empresa_id"?: string,"estatus"?: string,"fecha_baja"?: string | null,"foto_path"?: string | null,"id"?: string,"liga"?: string,"liga_enviada_en"?: string | null,"nombre"?: string,"numero_empleado"?: string | null,"puesto"?: string | null,"tipo_contrato"?: string | null
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
                    "actualizado_en": string,"creado_en": string,"creado_por": string | null,"giro": string | null,"id": string,"liga_campos": (string)[],"liga_foto": boolean,"nombre": string,"predeterminados": NonNullable<Json>,"qr_dato": string,"qr_liga": string | null,"qr_modo": string,"qr_mostrar": (string)[],"qr_vigencia": string | null,"reposicion": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_en"?: string,"creado_en"?: string,"creado_por"?: string | null,"giro"?: string | null,"id"?: string,"liga_campos"?: (string)[],"liga_foto"?: boolean,"nombre": string,"predeterminados"?: NonNullable<Json>,"qr_dato"?: string,"qr_liga"?: string | null,"qr_modo"?: string,"qr_mostrar"?: (string)[],"qr_vigencia"?: string | null,"reposicion"?: NonNullable<Json>
                  }
                  Update: {
                    "actualizado_en"?: string,"creado_en"?: string,"creado_por"?: string | null,"giro"?: string | null,"id"?: string,"liga_campos"?: (string)[],"liga_foto"?: boolean,"nombre"?: string,"predeterminados"?: NonNullable<Json>,"qr_dato"?: string,"qr_liga"?: string | null,"qr_modo"?: string,"qr_mostrar"?: (string)[],"qr_vigencia"?: string | null,"reposicion"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"facturas": {
                  Row: {
                    "actualizado_en": string,"cancelada_en": string | null,"creado_en": string,"datos": NonNullable<Json>,"emitida_en": string | null,"emitida_por": string | null,"empresa_id": string,"enviada_en": string | null,"estado": string,"folio_fiscal": string | null,"pdf_ruta": string | null,"pedido_id": string,"solicitada_en": string,"solicitada_por": string | null,"xml_ruta": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_en"?: string,"cancelada_en"?: string | null,"creado_en"?: string,"datos": NonNullable<Json>,"emitida_en"?: string | null,"emitida_por"?: string | null,"empresa_id": string,"enviada_en"?: string | null,"estado"?: string,"folio_fiscal"?: string | null,"pdf_ruta"?: string | null,"pedido_id": string,"solicitada_en"?: string,"solicitada_por"?: string | null,"xml_ruta"?: string | null
                  }
                  Update: {
                    "actualizado_en"?: string,"cancelada_en"?: string | null,"creado_en"?: string,"datos"?: NonNullable<Json>,"emitida_en"?: string | null,"emitida_por"?: string | null,"empresa_id"?: string,"enviada_en"?: string | null,"estado"?: string,"folio_fiscal"?: string | null,"pdf_ruta"?: string | null,"pedido_id"?: string,"solicitada_en"?: string,"solicitada_por"?: string | null,"xml_ruta"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "facturas_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "facturas_pedido_id_fkey"
      columns: ["pedido_id"]
isOneToOne: true
      referencedRelation: "pedidos"
      referencedColumns: ["id"]
    }
                  ]
                },"gafetes": {
                  Row: {
                    "datos": NonNullable<Json>,"diseno_id": string | null,"emitido_en": string,"empleado_id": string,"empresa_id": string,"estado": string,"id": string,"motivo": string,"pedido_id": string | null,"razon": string | null,"tipo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "datos"?: NonNullable<Json>,"diseno_id"?: string | null,"emitido_en"?: string,"empleado_id": string,"empresa_id": string,"estado"?: string,"id"?: string,"motivo": string,"pedido_id"?: string | null,"razon"?: string | null,"tipo": string
                  }
                  Update: {
                    "datos"?: NonNullable<Json>,"diseno_id"?: string | null,"emitido_en"?: string,"empleado_id"?: string,"empresa_id"?: string,"estado"?: string,"id"?: string,"motivo"?: string,"pedido_id"?: string | null,"razon"?: string | null,"tipo"?: string
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
    },{
      foreignKeyName: "gafetes_pedido_id_fkey"
      columns: ["pedido_id"]
isOneToOne: false
      referencedRelation: "pedidos"
      referencedColumns: ["id"]
    }
                  ]
                },"gafetes_listos": {
                  Row: {
                    "actualizado_en": string,"creado_en": string,"empleado_id": string,"empresa_id": string,"frente_alto": number | null,"frente_ancho": number | null,"frente_path": string | null,"vuelta_alto": number | null,"vuelta_ancho": number | null,"vuelta_path": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_en"?: string,"creado_en"?: string,"empleado_id": string,"empresa_id": string,"frente_alto"?: number | null,"frente_ancho"?: number | null,"frente_path"?: string | null,"vuelta_alto"?: number | null,"vuelta_ancho"?: number | null,"vuelta_path"?: string | null
                  }
                  Update: {
                    "actualizado_en"?: string,"creado_en"?: string,"empleado_id"?: string,"empresa_id"?: string,"frente_alto"?: number | null,"frente_ancho"?: number | null,"frente_path"?: string | null,"vuelta_alto"?: number | null,"vuelta_ancho"?: number | null,"vuelta_path"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "gafetes_listos_empleado_id_fkey"
      columns: ["empleado_id"]
isOneToOne: true
      referencedRelation: "empleados"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gafetes_listos_empresa_id_fkey"
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
                },"pedido_abierto": {
                  Row: {
                    "agregado_por": string | null,"creado_en": string,"empleado_id": string,"empresa_id": string,"razon": string
                  }
                  ComputedFields: never
                  Insert: {
                    "agregado_por"?: string | null,"creado_en"?: string,"empleado_id": string,"empresa_id": string,"razon": string
                  }
                  Update: {
                    "agregado_por"?: string | null,"creado_en"?: string,"empleado_id"?: string,"empresa_id"?: string,"razon"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "pedido_abierto_empleado_id_fkey"
      columns: ["empleado_id"]
isOneToOne: false
      referencedRelation: "empleados"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pedido_abierto_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                },"pedido_eventos": {
                  Row: {
                    "creado_en": string,"detalle": NonNullable<Json>,"id": number,"pedido_id": string,"por": string | null,"tipo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "creado_en"?: string,"detalle"?: NonNullable<Json>,"id"?: never,"pedido_id": string,"por"?: string | null,"tipo": string
                  }
                  Update: {
                    "creado_en"?: string,"detalle"?: NonNullable<Json>,"id"?: never,"pedido_id"?: string,"por"?: string | null,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "pedido_eventos_pedido_id_fkey"
      columns: ["pedido_id"]
isOneToOne: false
      referencedRelation: "pedidos"
      referencedColumns: ["id"]
    }
                  ]
                },"pedidos": {
                  Row: {
                    "actualizado_en": string,"alertas": (string)[],"aprobacion": NonNullable<Json>,"articulos": Json | null,"cancelado_en": string | null,"conceptos": Json | null,"creado_en": string,"creado_por": string | null,"direccion": Json | null,"diseno": Json | null,"diseno_id": string | null,"disputa": string | null,"dos_caras": boolean,"empresa_id": string,"entregado_en": string | null,"enviado_en": string | null,"envio": number,"envio_de_saldo": boolean,"estado": string,"facturacion": Json | null,"ficha_url": string | null,"folio": string,"fuente": string,"gafetes_de_saldo": number,"gracia_hasta": string | null,"guia": string | null,"id": string,"intento": number,"iva": number,"material": string | null,"metodo": string | null,"modalidad": string,"notas": string | null,"pagado_en": string | null,"paqueteria": string | null,"piezas": number,"por_pieza": number,"primer_pedido": boolean,"produccion_en": string | null,"revisado_en": string | null,"revisado_por": string | null,"solo_transferencia": boolean,"stripe_pago": string | null,"stripe_sesion": string | null,"stripe_url": string | null,"subtotal": number,"tipo": string,"total": number
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_en"?: string,"alertas"?: (string)[],"aprobacion": NonNullable<Json>,"articulos"?: Json | null,"cancelado_en"?: string | null,"conceptos"?: Json | null,"creado_en"?: string,"creado_por"?: string | null,"direccion"?: Json | null,"diseno"?: Json | null,"diseno_id"?: string | null,"disputa"?: string | null,"dos_caras"?: boolean,"empresa_id": string,"entregado_en"?: string | null,"enviado_en"?: string | null,"envio"?: number,"envio_de_saldo"?: boolean,"estado"?: string,"facturacion"?: Json | null,"ficha_url"?: string | null,"folio"?: string,"fuente": string,"gafetes_de_saldo"?: number,"gracia_hasta"?: string | null,"guia"?: string | null,"id"?: string,"intento"?: number,"iva": number,"material"?: string | null,"metodo"?: string | null,"modalidad"?: string,"notas"?: string | null,"pagado_en"?: string | null,"paqueteria"?: string | null,"piezas": number,"por_pieza": number,"primer_pedido"?: boolean,"produccion_en"?: string | null,"revisado_en"?: string | null,"revisado_por"?: string | null,"solo_transferencia"?: boolean,"stripe_pago"?: string | null,"stripe_sesion"?: string | null,"stripe_url"?: string | null,"subtotal": number,"tipo"?: string,"total": number
                  }
                  Update: {
                    "actualizado_en"?: string,"alertas"?: (string)[],"aprobacion"?: NonNullable<Json>,"articulos"?: Json | null,"cancelado_en"?: string | null,"conceptos"?: Json | null,"creado_en"?: string,"creado_por"?: string | null,"direccion"?: Json | null,"diseno"?: Json | null,"diseno_id"?: string | null,"disputa"?: string | null,"dos_caras"?: boolean,"empresa_id"?: string,"entregado_en"?: string | null,"enviado_en"?: string | null,"envio"?: number,"envio_de_saldo"?: boolean,"estado"?: string,"facturacion"?: Json | null,"ficha_url"?: string | null,"folio"?: string,"fuente"?: string,"gafetes_de_saldo"?: number,"gracia_hasta"?: string | null,"guia"?: string | null,"id"?: string,"intento"?: number,"iva"?: number,"material"?: string | null,"metodo"?: string | null,"modalidad"?: string,"notas"?: string | null,"pagado_en"?: string | null,"paqueteria"?: string | null,"piezas"?: number,"por_pieza"?: number,"primer_pedido"?: boolean,"produccion_en"?: string | null,"revisado_en"?: string | null,"revisado_por"?: string | null,"solo_transferencia"?: boolean,"stripe_pago"?: string | null,"stripe_sesion"?: string | null,"stripe_url"?: string | null,"subtotal"?: number,"tipo"?: string,"total"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "pedidos_diseno_id_fkey"
      columns: ["diseno_id"]
isOneToOne: false
      referencedRelation: "disenos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pedidos_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                },"perfiles": {
                  Row: {
                    "actualizado_en": string,"creado_en": string,"id": string,"nombre": string | null,"publicidad": boolean,"publicidad_en": string | null,"telefono": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_en"?: string,"creado_en"?: string,"id": string,"nombre"?: string | null,"publicidad"?: boolean,"publicidad_en"?: string | null,"telefono"?: string | null
                  }
                  Update: {
                    "actualizado_en"?: string,"creado_en"?: string,"id"?: string,"nombre"?: string | null,"publicidad"?: boolean,"publicidad_en"?: string | null,"telefono"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"preferencias_aviso": {
                  Row: {
                    "actualizado_en": string,"empresa_id": string,"modo": string,"tipo": string,"usuario_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_en"?: string,"empresa_id": string,"modo": string,"tipo": string,"usuario_id": string
                  }
                  Update: {
                    "actualizado_en"?: string,"empresa_id"?: string,"modo"?: string,"tipo"?: string,"usuario_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "preferencias_aviso_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                },"propuestas": {
                  Row: {
                    "datos": NonNullable<Json>,"empleado_id": string,"empresa_id": string,"enviado_en": string,"estado": string,"foto_path": string | null,"motivo": string | null,"resuelto_en": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "datos"?: NonNullable<Json>,"empleado_id": string,"empresa_id": string,"enviado_en"?: string,"estado"?: string,"foto_path"?: string | null,"motivo"?: string | null,"resuelto_en"?: string | null
                  }
                  Update: {
                    "datos"?: NonNullable<Json>,"empleado_id"?: string,"empresa_id"?: string,"enviado_en"?: string,"estado"?: string,"foto_path"?: string | null,"motivo"?: string | null,"resuelto_en"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "propuestas_empleado_id_fkey"
      columns: ["empleado_id"]
isOneToOne: true
      referencedRelation: "empleados"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "propuestas_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                },"reglas_diseno": {
                  Row: {
                    "campo": string,"creado_en": string,"diseno_id": string,"empresa_id": string,"id": string,"orden": number,"valor": string
                  }
                  ComputedFields: never
                  Insert: {
                    "campo": string,"creado_en"?: string,"diseno_id": string,"empresa_id": string,"id"?: string,"orden"?: number,"valor": string
                  }
                  Update: {
                    "campo"?: string,"creado_en"?: string,"diseno_id"?: string,"empresa_id"?: string,"id"?: string,"orden"?: number,"valor"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reglas_diseno_diseno_id_fkey"
      columns: ["diseno_id"]
isOneToOne: false
      referencedRelation: "disenos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reglas_diseno_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                },"resumenes_enviados": {
                  Row: {
                    "enviado_en": string,"semana": string,"usuario_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "enviado_en"?: string,"semana": string,"usuario_id": string
                  }
                  Update: {
                    "enviado_en"?: string,"semana"?: string,"usuario_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"saldo_usos": {
                  Row: {
                    "cantidad": number,"creado_en": string,"id": number,"pedido_id": string,"saldo_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cantidad": number,"creado_en"?: string,"id"?: never,"pedido_id": string,"saldo_id": string
                  }
                  Update: {
                    "cantidad"?: number,"creado_en"?: string,"id"?: never,"pedido_id"?: string,"saldo_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "saldo_usos_pedido_id_fkey"
      columns: ["pedido_id"]
isOneToOne: false
      referencedRelation: "pedidos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saldo_usos_saldo_id_fkey"
      columns: ["saldo_id"]
isOneToOne: false
      referencedRelation: "saldos"
      referencedColumns: ["id"]
    }
                  ]
                },"saldos": {
                  Row: {
                    "anulado_en": string | null,"cantidad": number,"compra_id": string,"concepto": string,"creado_en": string,"dos_caras": boolean,"empresa_id": string,"id": string,"material": string | null,"renglon": number,"vence_en": string
                  }
                  ComputedFields: never
                  Insert: {
                    "anulado_en"?: string | null,"cantidad": number,"compra_id": string,"concepto": string,"creado_en"?: string,"dos_caras"?: boolean,"empresa_id": string,"id"?: string,"material"?: string | null,"renglon": number,"vence_en": string
                  }
                  Update: {
                    "anulado_en"?: string | null,"cantidad"?: number,"compra_id"?: string,"concepto"?: string,"creado_en"?: string,"dos_caras"?: boolean,"empresa_id"?: string,"id"?: string,"material"?: string | null,"renglon"?: number,"vence_en"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "saldos_compra_id_fkey"
      columns: ["compra_id"]
isOneToOne: false
      referencedRelation: "pedidos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saldos_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                },"solicitudes_foto": {
                  Row: {
                    "con_impreso": boolean,"creado_en": string,"empleado_id": string,"empresa_id": string,"estado": string,"foto_anterior_path": string | null,"foto_path": string | null,"id": string,"motivo": string | null,"reposicion_apartada": boolean,"resuelto_en": string | null,"resuelto_por": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "con_impreso"?: boolean,"creado_en"?: string,"empleado_id": string,"empresa_id": string,"estado"?: string,"foto_anterior_path"?: string | null,"foto_path"?: string | null,"id"?: string,"motivo"?: string | null,"reposicion_apartada"?: boolean,"resuelto_en"?: string | null,"resuelto_por"?: string | null
                  }
                  Update: {
                    "con_impreso"?: boolean,"creado_en"?: string,"empleado_id"?: string,"empresa_id"?: string,"estado"?: string,"foto_anterior_path"?: string | null,"foto_path"?: string | null,"id"?: string,"motivo"?: string | null,"reposicion_apartada"?: boolean,"resuelto_en"?: string | null,"resuelto_por"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "solicitudes_foto_empleado_id_fkey"
      columns: ["empleado_id"]
isOneToOne: false
      referencedRelation: "empleados"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "solicitudes_foto_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                },"stripe_clientes": {
                  Row: {
                    "cliente": string,"creado_en": string,"empresa_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cliente": string,"creado_en"?: string,"empresa_id": string
                  }
                  Update: {
                    "cliente"?: string,"creado_en"?: string,"empresa_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "stripe_clientes_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: true
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                },"stripe_eventos": {
                  Row: {
                    "id": string,"recibido_en": string,"tipo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id": string,"recibido_en"?: string,"tipo": string
                  }
                  Update: {
                    "id"?: string,"recibido_en"?: string,"tipo"?: string
                  }
                  Relationships: [
                    
                  ]
                },"visitas": {
                  Row: {
                    "dispositivo": string,"en": string,"entrada": boolean,"id": number,"origen": string | null,"pais": string | null,"region": string | null,"ruta": string
                  }
                  ComputedFields: never
                  Insert: {
                    "dispositivo": string,"en"?: string,"entrada"?: boolean,"id"?: never,"origen"?: string | null,"pais"?: string | null,"region"?: string | null,"ruta": string
                  }
                  Update: {
                    "dispositivo"?: string,"en"?: string,"entrada"?: boolean,"id"?: never,"origen"?: string | null,"pais"?: string | null,"region"?: string | null,"ruta"?: string
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
"admin_empresas":
{ Args: Record<PropertyKey, never>; Returns: {
              "activos": number,"creado_en": string,"disenos": number,"id": string,"listos": number,"nombre": string
            }[]
                           },
"cambiar_rol_usuario":
{ Args: { "p_empresa": string,"p_rol": string,"p_usuario": string }; Returns: undefined
                           },
"crear_empresa":
{ Args: { "p_giro"?: string,"p_nombre": string }; Returns: string
                           },
"destinatarios_aviso":
{ Args: { "p_empresa"?: string }; Returns: {
              "correo": string,"empresa": string,"empresa_id": string,"modo": string,"nombre": string,"tipo": string,"usuario_id": string
            }[]
                           },
"es_admin_plataforma":
{ Args: Record<PropertyKey, never>; Returns: boolean
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
"resumen_visitas":
{ Args: { "p_desde": string,"p_hasta": string }; Returns: Json
                           },
"usar_saldo":
{ Args: { "p_pedido": string,"p_plan": Json }; Returns: undefined
                           },
"usuarios_de":
{ Args: { "p_empresa": string }; Returns: {
              "correo": string,"desde": string,"nombre": string,"rol": string,"usuario_id": string
            }[]
                           },
"ver_invitacion":
{ Args: { "p_invitacion": string }; Returns: {
              "correo": string,"empresa": string,"empresa_id": string,"id": string,"invita": string,"rol": string,"tiene_cuenta": boolean,"vencida": boolean
            }[]
                           },
"verificar_gafete":
{ Args: { "p_codigo": string }; Returns: Json
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
