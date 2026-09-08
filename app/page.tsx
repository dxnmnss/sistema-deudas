'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface Deuda {
  id: string;
  monto_original: number;
  saldo_pendiente: number;
  estado: string;
}

interface Deudor {
  id: string;
  nombre: string;
  documento_id: string;
  telefono: string;
  deudas: Deuda[];
}

export default function Home() {
  const [tab, setTab] = useState<'buscar' | 'nuevo'>('buscar');

  // Buscador
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<Deudor[]>([]);
  const [cargandoBusqueda, setCargandoBusqueda] = useState(false);

  // Nuevo registro
  const [nombre, setNombre] = useState('');
  const [documentoId, setDocumentoId] = useState('');
  const [telefono, setTelefono] = useState('');
  const [monto, setMonto] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  // Registrar Pago / Abono
  const [deudaSeleccionada, setDeudaSeleccionada] = useState<{ id: string; saldo: number; deudorNombre: string } | null>(null);
  const [montoAbono, setMontoAbono] = useState('');
  const [guardandoAbono, setGuardandoAbono] = useState(false);

  // Función para buscar deudores
  const ejecutarBusqueda = async (query: string) => {
    if (!query.trim()) return;
    setCargandoBusqueda(true);
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
          estado
        )
      `)
      .or(`nombre.ilike.%${query}%,documento_id.ilike.%${query}%`);

    if (error) {
      console.error('Error al buscar:', error);
    } else {
      setResultados(data || []);
    }
    setCargandoBusqueda(false);
  };

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    ejecutarBusqueda(busqueda);
  };

  // Guardar nueva deuda
  const registrarDeuda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !monto || !fechaVencimiento) {
      setMensaje({ tipo: 'error', texto: 'Nombre, monto y fecha son obligatorios.' });
      return;
    }

    setGuardando(true);
    setMensaje(null);

    try {
      let deudorId: string | null = null;

      if (documentoId) {
        const { data: existe } = await supabase
          .from('deudores')
          .select('id')
          .eq('documento_id', documentoId)
          .maybeSingle();

        if (existe) {
          deudorId = existe.id;
        }
      }

      if (!deudorId) {
        const { data: nuevoDeudor, error: errDeudor } = await supabase
          .from('deudores')
          .insert([{ nombre, documento_id: documentoId || null, telefono: telefono || null }])
          .select()
          .single();

        if (errDeudor) throw errDeudor;
        deudorId = nuevoDeudor.id;
      }

      const montoNum = parseFloat(monto);
      const { error: errDeuda } = await supabase.from('deudas').insert([
        {
          deudor_id: deudorId,
          monto_original: montoNum,
          saldo_pendiente: montoNum,
          fecha_vencimiento: fechaVencimiento,
          estado: 'pendiente',
        },
      ]);

      if (errDeuda) throw errDeuda;

      setMensaje({ tipo: 'exito', texto: '¡Deuda registrada correctamente!' });
      setNombre('');
      setDocumentoId('');
      setTelefono('');
      setMonto('');
      setFechaVencimiento('');
    } catch (err: any) {
      console.error(err);
      setMensaje({ tipo: 'error', texto: err.message || 'Error al guardar registro.' });
    } finally {
      setGuardando(false);
    }
  };

  // Registrar Abono
  const registrarAbono = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deudaSeleccionada || !montoAbono) return;

    const montoNum = parseFloat(montoAbono);
    if (montoNum <= 0 || montoNum > deudaSeleccionada.saldo) {
      alert('El monto a abonar debe ser mayor a 0 y menor o igual al saldo pendiente.');
      return;
    }

    setGuardandoAbono(true);

    try {
      const { error } = await supabase.from('pagos').insert([
        {
          deuda_id: deudaSeleccionada.id,
          monto: montoNum,
        },
      ]);

      if (error) throw error;

      // Cerrar modal, limpiar estado y refrescar búsqueda
      setDeudaSeleccionada(null);
      setMontoAbono('');
      ejecutarBusqueda(busqueda);
    } catch (err: any) {
      console.error(err);
      alert('Error al registrar el abono: ' + err.message);
    } finally {
      setGuardandoAbono(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 max-w-md mx-auto">
      {/* Pestañas */}
      <div className="flex bg-gray-800 p-1 rounded-xl mb-6">
        <button
          onClick={() => { setTab('buscar'); setMensaje(null); }}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
            tab === 'buscar' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          🔍 Buscar Deuda
        </button>
        <button
          onClick={() => { setTab('nuevo'); setMensaje(null); }}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
            tab === 'nuevo' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          ➕ Registrar Deuda
        </button>
      </div>

      {/* VISTA 1: BUSCADOR */}
      {tab === 'buscar' && (
        <div>
          <form onSubmit={handleBuscar} className="mb-6 flex gap-2">
            <input
              type="text"
              placeholder="Nombre o Documento / DNI..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={cargandoBusqueda}
              className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-lg font-semibold disabled:opacity-50"
            >
              {cargandoBusqueda ? '...' : 'Buscar'}
            </button>
          </form>

          <div className="space-y-4">
            {resultados.length === 0 && !cargandoBusqueda && (
              <p className="text-center text-gray-500">Ingresa un término para consultar.</p>
            )}

            {resultados.map((deudor) => {
              const deudasPendientes = deudor.deudas?.filter((d) => d.saldo_pendiente > 0) || [];
              const totalPendiente = deudor.deudas?.reduce((acc, d) => acc + Number(d.saldo_pendiente), 0) || 0;

              return (
                <div key={deudor.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-md space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-lg font-bold text-white">{deudor.nombre}</h2>
                      <p className="text-xs text-gray-400">Doc: {deudor.documento_id || 'N/A'}</p>
                      {deudor.telefono && <p className="text-xs text-gray-400">Tel: {deudor.telefono}</p>}
                    </div>
                    <span
                      className={`px-3 py-1 text-xs rounded-full font-bold ${
                        totalPendiente > 0 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                      }`}
                    >
                      {totalPendiente > 0 ? 'Tiene Deuda' : 'Al Día'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-gray-700 flex justify-between items-center">
                    <span className="text-sm text-gray-400">Total Pendiente:</span>
                    <span className="text-xl font-bold text-red-400">${totalPendiente.toFixed(2)}</span>
                  </div>

                  {/* Listado de deudas activas para abonar */}
                  {deudasPendientes.length > 0 && (
                    <div className="pt-2 space-y-2">
                      <p className="text-xs font-semibold text-gray-400">Deudas Pendientes:</p>
                      {deudasPendientes.map((d) => (
                        <div key={d.id} className="bg-gray-900/60 p-2.5 rounded-lg flex justify-between items-center text-sm">
                          <div>
                            <span className="text-gray-300">Saldo: </span>
                            <span className="font-bold text-white">${Number(d.saldo_pendiente).toFixed(2)}</span>
                            <span className="text-xs text-gray-500 block">Original: ${Number(d.monto_original).toFixed(2)}</span>
                          </div>
                          <button
                            onClick={() =>
                              setDeudaSeleccionada({
                                id: d.id,
                                saldo: Number(d.saldo_pendiente),
                                deudorNombre: deudor.nombre,
                              })
                            }
                            className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
                          >
                            💵 Registrar Abono
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VISTA 2: NUEVO REGISTRO */}
      {tab === 'nuevo' && (
        <form onSubmit={registrarDeuda} className="bg-gray-800 p-5 rounded-2xl border border-gray-700 space-y-4">
          <h2 className="text-lg font-bold text-white mb-2">Nuevo Registro</h2>

          {mensaje && (
            <div
              className={`p-3 rounded-lg text-sm font-semibold ${
                mensaje.tipo === 'exito' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}
            >
              {mensaje.texto}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Nombre Completo *</label>
            <input
              type="text"
              required
              placeholder="Ej: Juan Pérez"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Documento / DNI</label>
              <input
                type="text"
                placeholder="12345678"
                value={documentoId}
                onChange={(e) => setDocumentoId(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Teléfono</label>
              <input
                type="text"
                placeholder="70000000"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Monto ($) *</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="500.00"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Vencimiento *</label>
              <input
                type="date"
                required
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={guardando}
            className="w-full bg-blue-600 hover:bg-blue-700 p-3 rounded-xl font-bold mt-2 disabled:opacity-50 transition-colors"
          >
            {guardando ? 'Guardando...' : 'Guardar Deuda'}
          </button>
        </form>
      )}

      {/* MODAL / PANTALLA FLOTANTE PARA REGISTRAR ABONO */}
      {deudaSeleccionada && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-bold text-white">Registrar Abono</h3>
            <p className="text-sm text-gray-300">
              Deudor: <span className="text-white font-semibold">{deudaSeleccionada.deudorNombre}</span>
            </p>
            <p className="text-sm text-gray-400">
              Saldo Pendiente: <span className="text-red-400 font-bold">${deudaSeleccionada.saldo.toFixed(2)}</span>
            </p>

            <form onSubmit={registrarAbono} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Monto a Abonar ($)</label>
                <input
                  type="number"
                  step="0.01"
                  max={deudaSeleccionada.saldo}
                  required
                  placeholder="Ej: 50.00"
                  value={montoAbono}
                  onChange={(e) => setMontoAbono(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-green-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeudaSeleccionada(null)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 p-3 rounded-xl font-semibold text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoAbono}
                  className="flex-1 bg-green-600 hover:bg-green-700 p-3 rounded-xl font-bold text-sm disabled:opacity-50 transition-colors"
                >
                  {guardandoAbono ? 'Guardando...' : 'Confirmar Abono'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}