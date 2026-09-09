import { Deuda, IDeudaData } from './Deuda';

export interface IDeudorData {
  id: string;
  nombre: string;
  documento_id?: string;
  telefono?: string;
  deudas?: IDeudaData[];
}

export class Deudor {
  public id: string;
  public nombre: string;
  public documentoId: string;
  public telefono: string;
  public deudas: Deuda[];

  constructor(data: IDeudorData) {
    this.id = data.id;
    this.nombre = data.nombre;
    this.documentoId = data.documento_id || 'N/A';
    this.telefono = data.telefono || '';
    this.deudas = data.deudas ? data.deudas.map((d) => new Deuda(d)) : [];
  }

  // Métodos de negocio acumulativos
  public obtenerDeudasPendientes(): Deuda[] {
    return this.deudas.filter((deuda) => deuda.tieneSaldoPendiente());
  }

  public calcularTotalPendiente(): number {
    return this.deudas.reduce((acc, deuda) => acc + deuda.saldoPendiente, 0);
  }

  public estaAlDia(): boolean {
    return this.calcularTotalPendiente() === 0;
  }
// Devuelve un texto formateado con los meses adeudados
  public obtenerMesesPendientesTexto(): string {
    const pendientes = this.obtenerDeudasPendientes();
    
    if (pendientes.length === 0) {
      return 'Ninguno';
    }

    return pendientes
      .map((deuda) => deuda.obtenerNombreMes())
      .join(', ');
  }

}