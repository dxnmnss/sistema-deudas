import { supabase } from '../lib/supabaseClient';
import { Deudor, IDeudorData } from '../models/Deudor';

export interface RegistrarDeudaDTO {
  nombre: string;
  documentoId?: string;
  telefono?: string;
  monto: number;
  periodo: string;
}

export class DeudasService {
  // Buscar deudores e instanciarlos como objetos Deudor
  public static async buscarDeudores(query: string): Promise<Deudor[]> {
    if (!query.trim()) return [];

    const { data, error } = await supabase
      .from('deudores')
      .select(`
        id,
        nombre,
        documento_id,
        telefono,
        deudas (
          id,
          monto_original,
          saldo_pendiente,
          periodo,
          estado,
          pagos (
        id,
        deuda_id,
        monto,
        created_at
      )          
        )
      `)
      .or(`nombre.ilike.%${query}%,documento_id.ilike.%${query}%`);

    if (error) {
      console.error('Error al buscar deudores:', error);
      throw new Error('Error al consultar los registros.');
    }

    // Transformar filas de la BD a Objetos de la clase Deudor
    return (data || []).map((item: IDeudorData) => new Deudor(item));
  }

  // Crear o recuperar deudor y registrar deuda
  public static async registrarDeuda(dto: RegistrarDeudaDTO): Promise<void> {
    let deudorId: string | null = null;

    if (dto.documentoId) {
      const { data: existe } = await supabase
        .from('deudores')
        .select('id')
        .eq('documento_id', dto.documentoId)
        .maybeSingle();

      if (existe) {
        deudorId = existe.id;
      }
    }

    if (!deudorId) {
      const { data: nuevoDeudor, error: errDeudor } = await supabase
        .from('deudores')
        .insert([{
          nombre: dto.nombre,
          documento_id: dto.documentoId || null,
          telefono: dto.telefono || null,
        }])
        .select()
        .single();

      if (errDeudor) throw errDeudor;
      deudorId = nuevoDeudor.id;
    }

    const { error: errDeuda } = await supabase.from('deudas').insert([
      {
        deudor_id: deudorId,
        monto_original: dto.monto,
        saldo_pendiente: dto.monto,
        periodo: dto.periodo,
        estado: 'pendiente',
      },
    ]);

    if (errDeuda) throw errDeuda;
  }

  // Registrar pago / abono
  public static async registrarAbono(deudaId: string, monto: number): Promise<void> {
    const { error } = await supabase.from('pagos').insert([
      {
        deuda_id: deudaId,
        monto: monto,
      },
    ]);

    if (error) throw error;
  }

  // Buscar deudores por nombre o DNI para el autocompletado
  static async buscarDeudoresSugerencias(query: string): Promise<Deudor[]> {
    if (!query || query.trim().length < 2) return [];

    const { data, error } = await supabase
      .from('deudores')
      .select('*')
      .or(`nombre.ilike.%${query}%,dni.ilike.%${query}%`)
      .limit(5);

    if (error) {
      console.error('Error al sugerir deudores:', error);
      return [];
    }

    return data ? data.map(d => new Deudor(d)) : [];
  }

  
}