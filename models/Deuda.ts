import { Pago, IPagoData } from './Pago';
export interface IDeudaData {
  id: string;
  monto_original: number;
  saldo_pendiente: number;
  periodo: string; // Ej: "2026-01"
  estado: string;
  pagos?: IPagoData[];
}

export class Deuda {
  public id: string;
  public montoOriginal: number;
  public saldoPendiente: number;
  public periodo: string;
  public estado: string;
  pagos: Pago[];

  constructor(data: IDeudaData) {
    this.id = data.id;    
    this.montoOriginal = Number(data.monto_original);
    this.saldoPendiente = Number(data.saldo_pendiente);
    this.periodo = data.periodo || '';
    this.estado = data.estado;
    this.pagos = data.pagos ? data.pagos.map((p) => new Pago(p)) : [];
  }

  // Métodos de negocio propios del objeto Deuda
  public tieneSaldoPendiente(): boolean {
    return this.saldoPendiente > 0;
  }

  public esMontoAbonoValido(monto: number): boolean {
    return monto > 0 && monto <= this.saldoPendiente;
  }

  // Convierte "2026-01" en "Enero 2026"
  public obtenerNombreMes(): string {
    if (!this.periodo || !this.periodo.includes('-')) return 'Sin periodo';
    
    const [year, month] = this.periodo.split('-');
    const fecha = new Date(Number(year), Number(month) - 1, 1);
    
    const nombreMes = fecha.toLocaleString('es-ES', { month: 'long' });
    return `${nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)} ${year}`;
  }
}