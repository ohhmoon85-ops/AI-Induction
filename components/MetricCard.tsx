
import React, { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  description: string;
  improvement?: boolean;
  icon?: ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, description, improvement, icon }) => {
  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
          {icon}
        </div>
        {improvement && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
            <ArrowUpRight className="w-3 h-3" /> BEST IN CLASS
          </div>
        )}
      </div>
      <div>
        <h4 className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">{label}</h4>
        <p className="text-2xl font-bold tracking-tight mb-1">{value}</p>
        <p className="text-[10px] text-slate-400">{description}</p>
      </div>
    </div>
  );
};

export default MetricCard;
