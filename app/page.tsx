'use client';

import { useState } from 'react';
import { Deudor } from '../models/Deudor';
import { DeudasService } from '../services/DeudasService';
import { Deuda } from '../models/Deuda';


export default function Home() {
  const [tab, setTab] = useState<'buscar' | 'nuevo'>('buscar');

  // Buscador
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<Deudor[]>([]);
  const [cargandoBusqueda, setCargandoBusqueda] = useState(false);
  const [deudaHistorial, setDeudaHistorial] = useState<Deuda | null>(null);
  const [modalNuevaDeudaOpen, setModalNuevaDeudaOpen] = useState(false);

  // Nuevo registro
  const [nombre, setNombre] = useState('');
  const [documentoId, setDocumentoId] = useState('');
  const [telefono, setTelefono] = useState('');
  const [monto, setMonto] = useState('');
  const [periodo, setPeriodo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  
  // Registrar Pago / Abono
  const [deudaSeleccionada, setDeudaSeleccionada] = useState<{ id: string; saldo: number; deudorNombre: string } | null>(null);
  const [montoAbono, setMontoAbono] = useState('');
  const [guardandoAbono, setGuardandoAbono] = useState(false);

  // Ejecutar Búsqueda mediante la clase de servicio
  const ejecutarBusqueda = async (query: string) => {
    if (!query.trim()) return;
    setCargandoBusqueda(true);
    try {
      const deudores = await DeudasService.buscarDeudores(query);
      setResultados(deudores);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCargandoBusqueda(false);
    }
  };


  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    ejecutarBusqueda(busqueda);
  };

  // Registrar nueva deuda mediante la clase de servicio
  const registrarDeuda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !monto || !periodo) {
      setMensaje({ tipo: 'error', texto: 'Nombre, monto y fecha son obligatorios.' });
      return;
    }

    setGuardando(true);
    setMensaje(null);

    try {
      await DeudasService.registrarDeuda({
        nombre,
        documentoId,
        telefono,
        monto: parseFloat(monto),
        periodo,
      });

      setMensaje({ tipo: 'exito', texto: '¡Deuda registrada correctamente!' });
      setNombre('');
      setDocumentoId('');
      setTelefono('');
      setMonto('');
      setPeriodo('');
    } catch (err: any) {
      console.error(err);
      setMensaje({ tipo: 'error', texto: err.message || 'Error al guardar registro.' });
    } finally {
      setGuardando(false);
    }
  };

  // Registrar Abono mediante la clase de servicio
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
      await DeudasService.registrarAbono(deudaSeleccionada.id, montoNum);
      
      // Si el modal de historial pertenece a la misma deuda, lo cerramos para evitar datos desactualizados
      if (deudaHistorial && deudaHistorial.id === deudaSeleccionada.id) {
        setDeudaHistorial(null);
      }

      setDeudaSeleccionada(null);
      setMontoAbono('');
      
      // Refrescamos la lista de resultados para obtener las deudas y pagos actualizados desde la BD
      await ejecutarBusqueda(busqueda);
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
          Buscar Deuda
        </button>
        <button
          onClick={() => { setTab('nuevo'); setMensaje(null); }}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
            tab === 'nuevo' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          Registrar Deuda
        </button>
      </div>

      {/* VISTA 1: BUSCADOR */}
      {tab === 'buscar' && (
        <div>
          <form onSubmit={handleBuscar} className="mb-6 flex gap-2">
            <input
              type="text"
              placeholder="Nombre o C.I"
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
              <p className="text-center text-gray-500">Ingrese Nombre o Numero de C.I</p>
            )}

            {resultados.map((deudor) => {
              // Uso de métodos de la clase Deudor
              const deudasPendientes = deudor.obtenerDeudasPendientes();
              const totalPendiente = deudor.calcularTotalPendiente();

              return (
                <div key={deudor.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-md space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-lg font-bold text-white">{deudor.nombre}</h2>
                      <p className="text-xs text-gray-400">Doc: {deudor.documentoId}</p>
                      {deudor.telefono && <p className="text-xs text-gray-400">Tel: {deudor.telefono}</p>}
                    <p className="text-xs text-red-400 font-semibold">
                    Meses pendientes: {deudor.obtenerMesesPendientesTexto()}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 text-xs rounded-full font-bold ${
                        !deudor.estaAlDia() ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                      }`}
                    >
                      {!deudor.estaAlDia() ? 'Tiene Deuda' : 'Al Día'}
                    </span>
                    
                  </div>                  

                  <div className="pt-2 border-t border-gray-700 flex justify-between items-center">
                    <span className="text-sm text-gray-400">Total Pendiente:</span>
                    <span className="text-xl font-bold text-red-400">${totalPendiente.toFixed(2)}</span>
                  </div>

                  {/* Listado de deudas activas usando objetos de la clase Deuda */}
                  {deudasPendientes.length > 0 && (
                    <div className="pt-2 space-y-2">
                      <p className="text-xs font-semibold text-gray-400">Deudas Pendientes:</p>
                      {deudasPendientes.map((d) => (
                        <div key={d.id} className="bg-gray-900/60 p-2.5 rounded-lg flex justify-between items-center text-sm">
                          <div>
                            <span className="text-gray-300">Saldo: </span>
                            <span className="font-bold text-white">${d.saldoPendiente.toFixed(2)}</span>
                            <span className="text-xs text-gray-500 block">Original: ${d.montoOriginal.toFixed(2)}</span>
                          </div>
                          <button
                            onClick={() =>
                              setDeudaSeleccionada({
                                id: d.id,
                                saldo: d.saldoPendiente,
                                deudorNombre: deudor.nombre,
                              })

                          
                            }
                            className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
                          >
                            Registrar Abono
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeudaHistorial(d)} // <-- Guarda la deuda activa en el estado
                            className="bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                          >
                            Historial ({d.pagos.length})
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
  <label className="block text-xs font-semibold text-gray-400 mb-1">
    Mes a Cobrar *
  </label>
  <input
    type="month"
    required
    value={periodo}
    onChange={(e) => setPeriodo(e.target.value)}
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

      {/* MODAL PARA ABONAR */}
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

{deudaHistorial && (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 w-full max-w-sm space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">
          Historial - {deudaHistorial.obtenerNombreMes()}
        </h3>
        <button
          onClick={() => setDeudaHistorial(null)} // <-- Limpia el estado para cerrar el modal
          className="text-gray-400 hover:text-white font-bold text-lg"
        >
          ✕
        </button>
      </div>

      <div className="text-xs space-y-1 text-gray-400 border-b border-gray-700 pb-3">
        <p>Monto Original: <span className="text-white font-semibold">${deudaHistorial.montoOriginal.toFixed(2)}</span></p>
        <p>Saldo Pendiente: <span className="text-red-400 font-semibold">${deudaHistorial.saldoPendiente.toFixed(2)}</span></p>
      </div>

      <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
        {deudaHistorial.pagos.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4">No hay abonos registrados para esta deuda.</p>
        ) : (
          deudaHistorial.pagos.map((pago) => (
            <div key={pago.id} className="bg-gray-900/80 p-3 rounded-lg flex justify-between items-center text-xs">
              <div>
                <p className="text-white font-bold">+ ${pago.monto.toFixed(2)}</p>
                <p className="text-gray-500 text-[10px]">{pago.obtenerFechaFormateada()}</p>
              </div>
              <span className="text-green-400 font-semibold bg-green-500/10 px-2 py-1 rounded">Abono</span>
            </div>
          ))
        )}
      </div>

      <button
        onClick={() => setDeudaHistorial(null)} // <-- Limpia el estado para cerrar el modal
        className="w-full bg-gray-700 hover:bg-gray-600 p-2.5 rounded-xl font-semibold text-sm transition-colors"
      >
        Cerrar
      </button>
    </div>
  </div>
)}

    </main>
  );
}