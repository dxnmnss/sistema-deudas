export interface IPagoData {
  id: string;
  deuda_id: string;
  monto: number;
  created_at: string;
}

export class Pago {
  public id: string;
  public deudaId: string;
  public monto: number;
  public fecha: Date;

  constructor(data: IPagoData) {
    this.id = data.id;
    this.deudaId = data.deuda_id;
    this.monto = Number(data.monto);
    this.fecha = new Date(data.created_at);
  }

  // Método para formatear la fecha a un texto legible (ej: "08/09/2026 14:30")
  public obtenerFechaFormateada(): string {
    return this.fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}