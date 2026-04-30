import { ShieldAlert, ShieldCheck, Shield } from 'lucide-react';

export default function ComplianceScore({ score }) {
  let colorClass = 'text-primary-500';
  let bgClass = 'bg-primary-500/10';
  let borderClass = 'border-primary-500/30';
  let Icon = ShieldCheck;
  let text = 'Nivel Óptimo';

  if (score < 50) {
    colorClass = 'text-red-500';
    bgClass = 'bg-red-500/10';
    borderClass = 'border-red-500/30';
    Icon = ShieldAlert;
    text = 'Riesgo Crítico';
  } else if (score < 80) {
    colorClass = 'text-accent-500'; // Yellow/Orange depending on tailwind config
    bgClass = 'bg-accent-500/10';
    borderClass = 'border-accent-500/30';
    Icon = Shield;
    text = 'Nivel Medio';
  }

  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border ${borderClass} ${bgClass}`}>
      <div className={`p-3 rounded-full bg-dark-900/50 ${colorClass}`}>
        <Icon className="w-8 h-8" />
      </div>
      <div>
        <h4 className="text-white font-bold text-lg">Score Legal (Ley 21.663)</h4>
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-black ${colorClass}`}>{score}%</span>
          <span className="text-gray-400 text-sm">- {text}</span>
        </div>
      </div>
    </div>
  );
}
