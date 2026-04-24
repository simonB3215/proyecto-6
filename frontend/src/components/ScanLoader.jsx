import { Activity } from 'lucide-react';

export default function ScanLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative w-32 h-32 mb-8">
        {/* Radar Effect */}
        <div className="absolute inset-0 border-2 border-primary-500/20 rounded-full"></div>
        <div className="absolute inset-2 border-2 border-primary-500/30 rounded-full animate-ping"></div>
        <div className="absolute inset-6 border-2 border-primary-500/40 rounded-full animate-pulse"></div>
        
        {/* Scanner Line */}
        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-primary-500 shadow-[0_0_10px_#00ff88] animate-[scan_2s_ease-in-out_infinite] origin-center"></div>
        
        <div className="absolute inset-0 flex items-center justify-center bg-dark-900/50 rounded-full backdrop-blur-sm">
          <Activity className="w-10 h-10 text-primary-500 animate-pulse" />
        </div>
      </div>
      
      <h3 className="text-xl font-semibold text-white mb-2">Auditoría en Progreso</h3>
      <p className="text-gray-400 text-sm max-w-sm text-center">
        Orquestando herramientas de seguridad y analizando superficie de ataque. 
        Este proceso puede tomar unos segundos...
      </p>

      <style>{`
        @keyframes scan {
          0%, 100% { transform: translateY(-50px); }
          50% { transform: translateY(50px); }
        }
      `}</style>
    </div>
  );
}
