import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LogOut, Target, Play, FileText, CheckCircle2, XCircle, Clock } from 'lucide-react';
import ScanLoader from './ScanLoader';

export default function Dashboard({ session }) {
  const [targetUrl, setTargetUrl] = useState('');
  const [scans, setScans] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchScans();
    
    // Configurar realtime para escuchar actualizaciones de escaneos
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scans',
          filter: `user_id=eq.${session.user.id}`
        },
        (payload) => {
          fetchScans(); // Refrescar cuando cambie el estado
          if (payload.new && payload.new.status === 'completed') {
            setIsScanning(false);
          } else if (payload.new && payload.new.status === 'failed') {
            setIsScanning(false);
            setError('El escaneo ha fallado en el servidor. Verifica los logs del backend o la configuración.');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session.user.id]);

  const fetchScans = async () => {
    const { data, error } = await supabase
      .from('scans')
      .select('*, targets(url)')
      .order('created_at', { ascending: false });
    
    if (data) setScans(data);
    if (error) console.error(error);
  };

  const handleScan = async (e) => {
    e.preventDefault();
    if (!targetUrl) return;
    
    // Validación Anti-SSRF (prevenir localhost o IPs internas)
    try {
      const urlObj = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
      const hostname = urlObj.hostname;
      
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
        throw new Error('No se permiten auditorías a redes internas o localhost (Seguridad SSRF).');
      }
    } catch (err) {
      setError(err.message || 'URL inválida');
      return;
    }

    setError('');
    setIsScanning(true);

    try {
      // 1. Guardar target en BD
      let { data: targetData, error: targetError } = await supabase
        .from('targets')
        .insert({ user_id: session.user.id, url: targetUrl })
        .select()
        .single();
        
      if (targetError) throw targetError;

      // 2. Llamar a nuestro backend API para iniciar orquestación
      const res = await fetch('http://localhost:3000/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          target_id: targetData.id, 
          user_id: session.user.id 
        })
      });

      if (!res.ok) throw new Error('Falló el inicio del escaneo en el backend');
      
      setTargetUrl('');
      fetchScans(); // Actualiza la lista para mostrar el nuevo escaneo en progreso
    } catch (err) {
      console.error(err);
      if (err.message.includes('Failed to fetch')) {
        setError('Error de conexión: El backend no está corriendo o no responde. Por favor, asegúrate de iniciar el servidor en el puerto 3000.');
      } else {
        setError(err.message);
      }
      setIsScanning(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-primary-500" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'in_progress': return <Clock className="w-5 h-5 text-accent-500 animate-spin" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto">
      {/* Header */}
      <header className="flex justify-between items-center mb-12 glass-card p-4">
        <div className="flex items-center gap-3">
          <Target className="w-8 h-8 text-primary-500" />
          <h1 className="text-xl font-bold text-white tracking-wide">Aegis Console</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{session.user.email}</span>
          <button 
            onClick={handleLogout}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="grid md:grid-cols-3 gap-8">
        {/* Panel Izquierdo: Lanzador */}
        <div className="md:col-span-1 space-y-6">
          <div className="glass-card p-6 border-t-4 border-t-primary-500">
            <h2 className="text-xl font-semibold mb-4 text-white">Nueva Auditoría</h2>
            
            {isScanning ? (
              <ScanLoader />
            ) : (
              <form onSubmit={handleScan} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">URL del Objetivo</label>
                  <input
                    type="text"
                    placeholder="ej. https://miempresa.com"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    className="w-full bg-dark-900/50 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    required
                  />
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button
                  type="submit"
                  className="w-full bg-primary-600 hover:bg-primary-500 text-dark-900 font-bold rounded-xl py-3 flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(0,255,136,0.3)] hover:shadow-[0_0_25px_rgba(0,255,136,0.5)]"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Lanzar Escáner
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Panel Derecho: Historial */}
        <div className="md:col-span-2 glass-card p-6">
          <h2 className="text-xl font-semibold mb-6 text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent-500" />
            Historial de Reportes
          </h2>
          
          <div className="space-y-3">
            {scans.length === 0 ? (
              <div className="text-center py-12 text-gray-500 border border-dashed border-white/10 rounded-xl">
                No hay escaneos realizados. Lanza uno para comenzar.
              </div>
            ) : (
              scans.map((scan) => (
                <div key={scan.id} className="bg-dark-900/40 border border-white/5 rounded-xl p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(scan.status)}
                    <div>
                      <p className="text-white font-medium">{scan.targets?.url}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(scan.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full border ${
                      scan.status === 'completed' ? 'border-primary-500/30 text-primary-400 bg-primary-500/10' :
                      scan.status === 'in_progress' ? 'border-accent-500/30 text-accent-400 bg-accent-500/10' :
                      'border-red-500/30 text-red-400 bg-red-500/10'
                    }`}>
                      {scan.status.toUpperCase()}
                    </span>
                    
                    {scan.status === 'completed' && scan.pdf_url && (
                      <a 
                        href={scan.pdf_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="bg-white/10 hover:bg-primary-500/20 hover:text-primary-400 text-white p-2 rounded-lg transition-colors flex items-center gap-2 text-sm"
                      >
                        Ver PDF
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
