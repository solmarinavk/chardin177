// Tipos de la base de datos, derivados a mano de supabase/schema.sql (fuente de verdad).
// Cuando el proyecto Supabase esté conectado se pueden regenerar con:
//   npx supabase gen types typescript --project-id <ref> > lib/database.types.ts
// Mientras tanto, este archivo mantiene el type-safety. Regla de oro: dinero en céntimos (integer).

export type RolUsuario = "admin" | "tesoreria" | "porteria" | "residente";
export type EstadoPeriodo = "borrador" | "emitido" | "cerrado";
export type EstadoCuota = "pendiente" | "parcial" | "pagado";
export type TipoRecibo = "agua" | "luz";
export type MedioPago = "yape" | "plin" | "transferencia" | "efectivo" | "otro";

export type Database = {
  public: {
    Tables: {
      departamentos: {
        Row: { id: number; piso: number; activo: boolean };
        Insert: { id: number; piso: number; activo?: boolean };
        Update: { id?: number; piso?: number; activo?: boolean };
        Relationships: [];
      };
      perfiles: {
        Row: {
          user_id: string;
          nombre: string;
          rol: RolUsuario;
          dpto_id: number | null;
          activo: boolean;
          creado_en: string;
        };
        Insert: {
          user_id: string;
          nombre: string;
          rol?: RolUsuario;
          dpto_id?: number | null;
          activo?: boolean;
          creado_en?: string;
        };
        Update: {
          user_id?: string;
          nombre?: string;
          rol?: RolUsuario;
          dpto_id?: number | null;
          activo?: boolean;
          creado_en?: string;
        };
        Relationships: [];
      };
      residentes: {
        Row: {
          id: number;
          dpto_id: number;
          nombre: string;
          email: string | null;
          telefono: string | null;
          es_propietario: boolean;
          desde: string | null;
          hasta: string | null;
          activo: boolean;
        };
        Insert: {
          id?: number;
          dpto_id: number;
          nombre: string;
          email?: string | null;
          telefono?: string | null;
          es_propietario?: boolean;
          desde?: string | null;
          hasta?: string | null;
          activo?: boolean;
        };
        Update: {
          id?: number;
          dpto_id?: number;
          nombre?: string;
          email?: string | null;
          telefono?: string | null;
          es_propietario?: boolean;
          desde?: string | null;
          hasta?: string | null;
          activo?: boolean;
        };
        Relationships: [];
      };
      cuotas_fijas: {
        Row: {
          id: number;
          vigente_desde: string;
          vigilancia_total_cent: number;
          manto_total_cent: number;
          materiales_dpto_cent: number;
          agua_comun_dpto_cent: number;
          notas: string | null;
        };
        Insert: {
          id?: number;
          vigente_desde: string;
          vigilancia_total_cent: number;
          manto_total_cent: number;
          materiales_dpto_cent?: number;
          agua_comun_dpto_cent?: number;
          notas?: string | null;
        };
        Update: {
          id?: number;
          vigente_desde?: string;
          vigilancia_total_cent?: number;
          manto_total_cent?: number;
          materiales_dpto_cent?: number;
          agua_comun_dpto_cent?: number;
          notas?: string | null;
        };
        Relationships: [];
      };
      periodos: {
        Row: {
          id: number;
          anio: number;
          mes: number;
          estado: EstadoPeriodo;
          saldo_inicial_cent: number | null;
          saldo_final_cent: number | null;
          emitido_en: string | null;
          cerrado_en: string | null;
        };
        Insert: {
          id?: number;
          anio: number;
          mes: number;
          estado?: EstadoPeriodo;
          saldo_inicial_cent?: number | null;
          saldo_final_cent?: number | null;
          emitido_en?: string | null;
          cerrado_en?: string | null;
        };
        Update: {
          id?: number;
          anio?: number;
          mes?: number;
          estado?: EstadoPeriodo;
          saldo_inicial_cent?: number | null;
          saldo_final_cent?: number | null;
          emitido_en?: string | null;
          cerrado_en?: string | null;
        };
        Relationships: [];
      };
      lecturas_agua: {
        Row: {
          id: number;
          periodo_id: number;
          dpto_id: number;
          lectura_anterior: number;
          lectura_actual: number;
          foto_url: string | null;
          registrado_por: string | null;
          registrado_en: string;
        };
        Insert: {
          id?: number;
          periodo_id: number;
          dpto_id: number;
          lectura_anterior: number;
          lectura_actual: number;
          foto_url?: string | null;
          registrado_por?: string | null;
          registrado_en?: string;
        };
        Update: {
          id?: number;
          periodo_id?: number;
          dpto_id?: number;
          lectura_anterior?: number;
          lectura_actual?: number;
          foto_url?: string | null;
          registrado_por?: string | null;
          registrado_en?: string;
        };
        Relationships: [];
      };
      recibos_servicios: {
        Row: {
          id: number;
          periodo_id: number;
          tipo: TipoRecibo;
          monto_cent: number;
          foto_url: string | null;
          registrado_por: string | null;
        };
        Insert: {
          id?: number;
          periodo_id: number;
          tipo: TipoRecibo;
          monto_cent: number;
          foto_url?: string | null;
          registrado_por?: string | null;
        };
        Update: {
          id?: number;
          periodo_id?: number;
          tipo?: TipoRecibo;
          monto_cent?: number;
          foto_url?: string | null;
          registrado_por?: string | null;
        };
        Relationships: [];
      };
      ajustes: {
        Row: {
          id: number;
          periodo_id: number;
          dpto_id: number;
          concepto: string;
          monto_cent: number;
          origen: string | null;
          creado_por: string | null;
          creado_en: string;
        };
        Insert: {
          id?: number;
          periodo_id: number;
          dpto_id: number;
          concepto: string;
          monto_cent: number;
          origen?: string | null;
          creado_por?: string | null;
          creado_en?: string;
        };
        Update: {
          id?: number;
          periodo_id?: number;
          dpto_id?: number;
          concepto?: string;
          monto_cent?: number;
          origen?: string | null;
          creado_por?: string | null;
          creado_en?: string;
        };
        Relationships: [];
      };
      cuotas: {
        Row: {
          id: number;
          periodo_id: number;
          dpto_id: number;
          m3_variacion: number;
          agua_consumo_cent: number;
          agua_comun_cent: number;
          luz_cent: number;
          vigilancia_cent: number;
          manto_cent: number;
          materiales_cent: number;
          extra_cent: number;
          ajuste_cent: number;
          total_cent: number;
          estado: EstadoCuota;
        };
        Insert: {
          id?: number;
          periodo_id: number;
          dpto_id: number;
          m3_variacion: number;
          agua_consumo_cent: number;
          agua_comun_cent: number;
          luz_cent: number;
          vigilancia_cent: number;
          manto_cent: number;
          materiales_cent: number;
          extra_cent?: number;
          ajuste_cent?: number;
          total_cent: number;
          estado?: EstadoCuota;
        };
        Update: {
          estado?: EstadoCuota;
        };
        Relationships: [];
      };
      pagos: {
        Row: {
          id: number;
          cuota_id: number;
          monto_cent: number;
          fecha_pago: string;
          medio: MedioPago;
          comprobante_url: string | null;
          nota: string | null;
          contabilizado_en_periodo: number | null;
          registrado_por: string | null;
          registrado_en: string;
        };
        Insert: {
          id?: number;
          cuota_id: number;
          monto_cent: number;
          fecha_pago: string;
          medio?: MedioPago;
          comprobante_url?: string | null;
          nota?: string | null;
          contabilizado_en_periodo?: number | null;
          registrado_por?: string | null;
          registrado_en?: string;
        };
        Update: {
          id?: number;
          cuota_id?: number;
          monto_cent?: number;
          fecha_pago?: string;
          medio?: MedioPago;
          comprobante_url?: string | null;
          nota?: string | null;
          contabilizado_en_periodo?: number | null;
          registrado_por?: string | null;
          registrado_en?: string;
        };
        Relationships: [];
      };
      categorias_egreso: {
        Row: { id: number; nombre: string };
        Insert: { id?: number; nombre: string };
        Update: { id?: number; nombre?: string };
        Relationships: [];
      };
      egresos: {
        Row: {
          id: number;
          periodo_id: number;
          categoria_id: number | null;
          concepto: string;
          monto_cent: number;
          fecha: string;
          pagado: boolean;
          comprobante_url: string | null;
          registrado_por: string | null;
          registrado_en: string;
        };
        Insert: {
          id?: number;
          periodo_id: number;
          categoria_id?: number | null;
          concepto: string;
          monto_cent: number;
          fecha: string;
          pagado?: boolean;
          comprobante_url?: string | null;
          registrado_por?: string | null;
          registrado_en?: string;
        };
        Update: {
          id?: number;
          periodo_id?: number;
          categoria_id?: number | null;
          concepto?: string;
          monto_cent?: number;
          fecha?: string;
          pagado?: boolean;
          comprobante_url?: string | null;
          registrado_por?: string | null;
          registrado_en?: string;
        };
        Relationships: [];
      };
      provisiones: {
        Row: {
          id: number;
          concepto: string;
          aporte_mensual_cent: number;
          activo: boolean;
        };
        Insert: {
          id?: number;
          concepto: string;
          aporte_mensual_cent?: number;
          activo?: boolean;
        };
        Update: {
          id?: number;
          concepto?: string;
          aporte_mensual_cent?: number;
          activo?: boolean;
        };
        Relationships: [];
      };
      movimientos_provision: {
        Row: {
          id: number;
          provision_id: number;
          periodo_id: number | null;
          monto_cent: number;
          concepto: string | null;
          creado_en: string;
        };
        Insert: {
          id?: number;
          provision_id: number;
          periodo_id?: number | null;
          monto_cent: number;
          concepto?: string | null;
          creado_en?: string;
        };
        Update: {
          id?: number;
          provision_id?: number;
          periodo_id?: number | null;
          monto_cent?: number;
          concepto?: string | null;
          creado_en?: string;
        };
        Relationships: [];
      };
      conciliaciones_agua: {
        Row: {
          id: number;
          periodo_desde: number;
          periodo_hasta: number;
          facturado_real_cent: number;
          cobrado_cent: number;
          aplicada: boolean;
          notas: string | null;
          creado_en: string;
        };
        Insert: {
          id?: number;
          periodo_desde: number;
          periodo_hasta: number;
          facturado_real_cent: number;
          cobrado_cent: number;
          aplicada?: boolean;
          notas?: string | null;
          creado_en?: string;
        };
        Update: {
          id?: number;
          periodo_desde?: number;
          periodo_hasta?: number;
          facturado_real_cent?: number;
          cobrado_cent?: number;
          aplicada?: boolean;
          notas?: string | null;
          creado_en?: string;
        };
        Relationships: [];
      };
      documentos: {
        Row: {
          id: number;
          titulo: string;
          categoria: string | null;
          url: string;
          subido_por: string | null;
          creado_en: string;
        };
        Insert: {
          id?: number;
          titulo: string;
          categoria?: string | null;
          url: string;
          subido_por?: string | null;
          creado_en?: string;
        };
        Update: {
          id?: number;
          titulo?: string;
          categoria?: string | null;
          url?: string;
          subido_por?: string | null;
          creado_en?: string;
        };
        Relationships: [];
      };
      constancias_pago: {
        Row: {
          id: number;
          periodo_id: number;
          dpto_id: number;
          monto_cent: number | null;
          foto_url: string | null;
          nota: string | null;
          estado: string;
          creado_por: string | null;
          creado_en: string;
          resuelto_por: string | null;
          resuelto_en: string | null;
          pago_id: number | null;
        };
        Insert: {
          id?: number;
          periodo_id: number;
          dpto_id: number;
          monto_cent?: number | null;
          foto_url?: string | null;
          nota?: string | null;
          estado?: string;
          creado_por?: string | null;
          creado_en?: string;
          resuelto_por?: string | null;
          resuelto_en?: string | null;
          pago_id?: number | null;
        };
        Update: {
          id?: number;
          periodo_id?: number;
          dpto_id?: number;
          monto_cent?: number | null;
          foto_url?: string | null;
          nota?: string | null;
          estado?: string;
          creado_por?: string | null;
          creado_en?: string;
          resuelto_por?: string | null;
          resuelto_en?: string | null;
          pago_id?: number | null;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: number;
          tabla: string;
          registro_id: string;
          accion: string;
          usuario: string | null;
          antes: Json | null;
          despues: Json | null;
          creado_en: string;
        };
        Insert: {
          id?: number;
          tabla: string;
          registro_id: string;
          accion: string;
          usuario?: string | null;
          antes?: Json | null;
          despues?: Json | null;
          creado_en?: string;
        };
        // Insert-only en la práctica (RLS + triggers), pero el tipo debe ser un objeto válido.
        Update: {
          id?: number;
          tabla?: string;
          registro_id?: string;
          accion?: string;
          usuario?: string | null;
          antes?: Json | null;
          despues?: Json | null;
          creado_en?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      generar_cuotas: { Args: { p_periodo: number }; Returns: undefined };
      emitir_periodo: { Args: { p_periodo: number }; Returns: undefined };
      cerrar_periodo: { Args: { p_periodo: number }; Returns: number };
      mi_rol: { Args: Record<string, never>; Returns: RolUsuario };
    };
    Enums: {
      rol_usuario: RolUsuario;
      estado_periodo: EstadoPeriodo;
      estado_cuota: EstadoCuota;
      tipo_recibo: TipoRecibo;
      medio_pago: MedioPago;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Atajos útiles
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
