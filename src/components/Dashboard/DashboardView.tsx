import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CheckCircle2, 
  CreditCard, 
  AlertCircle, 
  ChevronRight, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO, setYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { StatCard } from '../ui/StatCard';
import { GraduationSuggestions } from './GraduationSuggestions';
import { formatCurrency, cn } from '../../utils/formatters';

interface DashboardViewProps {
  belts: any[];
  students: any[];
  payments: any[];
  classes: any[];
  expenses: any[];
  products: any[];
  checkIns: any[];
}

export const DashboardView = ({ belts, students, payments, classes, expenses, products, checkIns }: DashboardViewProps) => {
  const { isAdmin, permissions } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    pendingPayments: 0
  });
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [presenceData, setPresenceData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis'>('overview');

  useEffect(() => {
    const now = new Date();
    const currentMonth = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    
    const revenue = payments
      .filter((p: any) => p.period === currentMonth)
      .reduce((acc: number, curr: any) => {
        const amount = Number(curr.amount);
        return acc + (isNaN(amount) ? 0 : amount);
      }, 0);

    const monthlyExpenses = (expenses || [])
      .filter((e: any) => {
        if (!e.date?.seconds) return false;
        const eDate = new Date(e.date.seconds * 1000);
        return eDate.getMonth() === now.getMonth() && eDate.getFullYear() === now.getFullYear();
      })
      .reduce((acc: number, curr: any) => {
        const amount = Number(curr.amount);
        return acc + (isNaN(amount) ? 0 : amount);
      }, 0);
    
    const paidStudentIds = new Set(payments.filter((p: any) => p.period === currentMonth).map((p: any) => p.studentId));
    const nonArchivedStudents = students.filter((s: any) => s.status !== 'Archived');
    const pending = nonArchivedStudents.filter((s: any) => s.status === 'Active' && !paidStudentIds.has(s.id)).length;

    setStats({
      totalStudents: nonArchivedStudents.length,
      activeStudents: nonArchivedStudents.filter((s: any) => s.status === 'Active').length,
      monthlyRevenue: revenue,
      monthlyExpenses: monthlyExpenses,
      pendingPayments: pending
    });

    // Birthdays of the week
    const start = startOfWeek(now, { weekStartsOn: 0 });
    const end = endOfWeek(now, { weekStartsOn: 0 });

    const bdays = nonArchivedStudents.filter((s: any) => {
      if (!s.birthDate) return false;
      try {
        const birthDate = parseISO(s.birthDate);
        const thisYearBday = setYear(birthDate, now.getFullYear());
        const nextYearBday = setYear(birthDate, now.getFullYear() + 1);
        const lastYearBday = setYear(birthDate, now.getFullYear() - 1);

        return isWithinInterval(thisYearBday, { start, end }) ||
               isWithinInterval(nextYearBday, { start, end }) ||
               isWithinInterval(lastYearBday, { start, end });
      } catch (e) {
        return false;
      }
    }).sort((a, b) => {
      const dayA = parseInt(a.birthDate.split('-')[2]);
      const monthA = parseInt(a.birthDate.split('-')[1]);
      const dayB = parseInt(b.birthDate.split('-')[2]);
      const monthB = parseInt(b.birthDate.split('-')[1]);
      if (monthA !== monthB) return monthA - monthB;
      return dayA - dayB;
    });
    setBirthdays(bdays);

    // Low stock
    const lowStock = (products || []).filter((p: any) => p.stock <= (p.minStock || 5));
    setLowStockProducts(lowStock);

    // Presence Data (Last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return format(d, 'yyyy-MM-dd');
    }).reverse();

    const presence = last7Days.map(day => {
      const count = checkIns.filter(c => {
        if (!c.time?.seconds) return false;
        const cDate = new Date(c.time.seconds * 1000);
        return format(cDate, 'yyyy-MM-dd') === day;
      }).length;
      return {
        day: format(new Date(day), 'EEE', { locale: ptBR }),
        count
      };
    });
    setPresenceData(presence);

  }, [students, payments, expenses, products, checkIns]);

  const recentStudents = students.filter((s: any) => s.status !== 'Archived').slice(0, 5);
  const upcomingClasses = classes.slice(0, 5);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-black italic uppercase tracking-tighter">Dashboard</h1>
          <p className="text-gray-500 font-medium">Bem-vindo ao OssManager. Aqui está o resumo da sua academia.</p>
        </div>
        <div className="flex gap-1">
          <div className="w-2 h-8 rounded-full bg-emerald-500" />
          <div className="w-2 h-8 rounded-full bg-amber-500" />
          <div className="w-2 h-8 rounded-full bg-blue-500" />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total de Alunos" value={stats.totalStudents} icon={Users} color="bg-blue-600 text-white" />
        <StatCard title="Alunos Ativos" value={stats.activeStudents} icon={CheckCircle2} color="bg-emerald-600 text-white" />
        {(isAdmin || permissions.finance) && (
          <>
            <StatCard title="Lucro Mensal" value={formatCurrency(stats.monthlyRevenue - stats.monthlyExpenses)} icon={CreditCard} color={stats.monthlyRevenue - stats.monthlyExpenses >= 0 ? "bg-indigo-600 text-white" : "bg-rose-600 text-white"} />
            <StatCard title="Pendentes" value={stats.pendingPayments} icon={AlertCircle} color="bg-rose-600 text-white" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Attendance Analysis / Empty States Example */}
        <div className="lg:col-span-2 space-y-8">
          <GraduationSuggestions students={students} checkIns={checkIns} belts={belts} />

          {/* Presence Chart */}
          <div className="p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 shadow-sm rounded-[40px] overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-50 dark:bg-white/5 rounded-xl">
                  <BarChart3 className="w-5 h-5 text-black dark:text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Fluxo de Alunos</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Últimos 7 dias de atividades</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-tighter">
                <TrendingUp className="w-3 h-3" />
                Em crescimento
              </div>
            </div>
            
            {presenceData.some(d => d.count > 0) ? (
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={presenceData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis 
                      dataKey="day" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 800, fill: '#9ca3af', textTransform: 'uppercase' }}
                      dy={10}
                    />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{ fill: '#f9fafb' }}
                      contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ fontWeight: 800, textTransform: 'uppercase', color: '#111827' }}
                    />
                    <Bar dataKey="count" radius={[12, 12, 0, 0]} barSize={40}>
                      {presenceData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={index === presenceData.length - 1 ? '#000000' : '#E5E7EB'} 
                          className="transition-all duration-500"
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex flex-col items-center justify-center text-center p-6 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                <Clock className="w-12 h-12 text-gray-200 mb-4" />
                <p className="text-sm text-gray-400 italic">Nenhum check-in registrado nos últimos 7 dias.</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 shadow-sm rounded-3xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Alunos Recentes</h3>
                <button className="text-sm font-medium text-blue-600 hover:underline">Ver todos</button>
              </div>
              <div className="space-y-4">
                {recentStudents.length > 0 ? (
                  recentStudents.map(student => (
                    <div key={student.id} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold mr-3">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{student.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">{student.belt}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  ))
                ) : (
                  <p className="py-8 text-center text-gray-400">Nenhum aluno cadastrado.</p>
                )}
              </div>
            </div>

            <div className="p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 shadow-sm rounded-3xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Próximas Aulas</h3>
                <button className="text-sm font-medium text-blue-600 hover:underline">Ver agenda</button>
              </div>
              <div className="space-y-4">
                {upcomingClasses.length > 0 ? (
                  upcomingClasses.map(cls => (
                    <div key={cls.id} className="flex items-center p-4 bg-gray-50 rounded-xl">
                      <div className="p-2 mr-4 bg-white rounded-lg shadow-sm">
                        <Clock className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{cls.name}</h4>
                        <p className="text-xs text-gray-500">
                          {cls.dayOfWeek} • {typeof cls.startTime === 'string' ? cls.startTime : (cls.startTime?.seconds ? format(new Date(cls.startTime.seconds * 1000), 'HH:mm') : '')} - {typeof cls.endTime === 'string' ? cls.endTime : (cls.endTime?.seconds ? format(new Date(cls.endTime.seconds * 1000), 'HH:mm') : '')}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-8 text-center text-gray-400">Nenhuma aula agendada.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Birthdays Section */}
          <div className="p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 shadow-sm rounded-3xl">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-rose-100 dark:bg-rose-500/20 rounded-lg">
                <TrendingUp className="w-4 h-4 text-rose-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Aniversariantes da Semana</h3>
            </div>
            <div className="space-y-4">
              {birthdays.length > 0 ? (
                birthdays.map(student => {
                  const bdayDate = parseISO(student.birthDate);
                  const isToday = format(new Date(), 'MM-dd') === format(bdayDate, 'MM-dd');
                  
                  return (
                    <div key={student.id} className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border transition-all",
                      isToday ? "bg-rose-50 border-rose-200 scale-[1.02] shadow-sm" : "bg-gray-50/50 border-gray-100"
                    )}>
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                        isToday ? "bg-rose-500 text-white" : "bg-gray-200 text-gray-600"
                      )}>
                        {student.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-gray-900">{student.name}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">
                            {format(bdayDate, "dd/MM")}
                          </p>
                        </div>
                        <p className={cn(
                          "text-[10px] font-bold uppercase tracking-wider",
                          isToday ? "text-rose-600" : "text-gray-400"
                        )}>
                          {isToday ? "Parabéns! 🎂🎉" : "Parabéns antecipado!"}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-400 text-center py-4 italic">Nenhum aniversariante nesta semana.</p>
              )}
            </div>
          </div>

          {/* Low Stock Alerts */}
          {(isAdmin || permissions.inventory) && (
            <div className="p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 shadow-sm rounded-3xl">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Estoque Baixo</h3>
              </div>
              <div className="space-y-3">
                {lowStockProducts.length > 0 ? (
                  lowStockProducts.map(product => (
                    <div key={product.id} className="flex items-center justify-between p-3 bg-amber-50/50 rounded-xl border border-amber-100/50">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{product.name}</p>
                        <p className="text-[10px] text-gray-500 uppercase font-bold">{product.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-amber-600">{product.stock}</p>
                        <p className="text-[10px] text-gray-400 font-bold">UNIDADES</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4 italic">Estoque em dia.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
