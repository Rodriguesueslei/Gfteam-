import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/formatters';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: string;
}

export const StatCard = ({ title, value, icon: Icon, trend, color }: StatCardProps) => (
  <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-[32px] hover:shadow-2xl hover:shadow-black/5 hover:-translate-y-1 transition-all duration-300 group">
    <div className="flex items-start justify-between">
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">{title}</p>
        <h3 className="text-3xl font-serif font-bold text-black italic tracking-tighter">{value}</h3>
        {trend && (
          <div className="flex items-center gap-1.5 pt-1">
            <span className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
              trend.isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            )}>
              {trend.isPositive ? '+' : '-'}{trend.value}%
            </span>
            <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">vs mês anterior</span>
          </div>
        )}
      </div>
      <div className={cn(
        "p-3 rounded-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3",
        color || 'bg-gray-50 text-gray-400'
      )}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  </div>
);
