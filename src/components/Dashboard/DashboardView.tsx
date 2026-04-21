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
  BarChart3,
  ShoppingCart
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
  Legend,
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
  onNavigate: (tab: string) => void;
}

export const DashboardView = ({ belts, students, payments, classes, expenses, products, checkIns, onNavigate }: DashboardViewProps) => {
  const { isAdmin, permissions, gymInfo } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    activeBJJ: 0,
    activeMuayThai: 0,
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
    const activeStudents = nonArchivedStudents.filter((s: any) => s.status === 'Active');
    const pending = activeStudents.filter((s: any) => !paidStudentIds.has(s.id)).length;

    setStats({
      totalStudents: nonArchivedStudents.length,
      activeStudents: activeStudents.length,
      activeBJJ: activeStudents.filter(s => (s.modalities || ['Jiu-Jitsu']).includes('Jiu-Jitsu')).length,
      activeMuayThai: activeStudents.filter(s => (s.modalities || []).includes('Muay Thai')).length,
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
      const dayCheckins = checkIns.filter(c => {
        if (!c.time?.seconds) return false;
        const cDate = new Date(c.time.seconds * 1000);
        return format(cDate, 'yyyy-MM-dd') === day;
      });

      return {
        day: format(new Date(day), 'EEE', { locale: ptBR }),
        bjj: dayCheckins.filter(c => c.modality === 'Jiu-Jitsu' || !c.modality).length,
        muayThai: dayCheckins.filter(c => c.modality === 'Muay Thai').length,
        count: dayCheckins.length
      };
    });
    setPresenceData(presence);

  }, [students, payments, expenses, products, checkIns]);

  const recentStudents = students.filter((s: any) => s.status !== 'Archived').slice(0, 5);
  const upcomingClasses = classes.slice(0, 5);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in transition-all duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-black text-black dark:text-white italic uppercase tracking-tighter">
            {gymInfo?.name || "Dashboard"}
          </h1>
          <p className="text-sm text-gray-500 font-medium">
            {gymInfo ? `Bem-vindo à unidade ${gymInfo.name}.` : "Bem-vindo ao OssManager. Aqui está o resumo da sua academia."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => onNavigate('inventory')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="sm:inline">Nova Venda</span>
          </button>
          
          <div className="flex-1 sm:flex-none flex bg-gray-100 p-1 rounded-2xl">
            <button 
              onClick={() => setActiveTab('overview')}
              className={cn(
                "flex-1 px-4 sm:px-6 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all",
                activeTab === 'overview' ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              Geral
            </button>
            <button 
              onClick={() => setActiveTab('analysis')}
              className={cn(
                "flex-1 px-4 sm:px-6 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all",
                activeTab === 'analysis' ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              Análise
            </button>
          </div>
        </div>
      </header>

      {activeTab === 'overview' ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard title="Total de Alunos" value={stats.totalStudents} icon={Users} color="bg-blue-600 text-white" />
        <StatCard title="Alunos Ativos" value={stats.activeStudents} icon={CheckCircle2} color="bg-emerald-600 text-white" />
        {(isAdmin || permissions.finance) && (
          <>
            <StatCard title="Lucro Mensal" value={formatCurrency(stats.monthlyRevenue - stats.monthlyExpenses)} icon={CreditCard} color={stats.monthlyRevenue - stats.monthlyExpenses >= 0 ? "bg-indigo-600 text-white" : "bg-rose-600 text-white"} />
            <StatCard title="Pendentes" value={stats.pendingPayments} icon={AlertCircle} color="bg-rose-600 text-white" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        {/* Attendance Analysis / Empty States Example */}
        <div className="xl:col-span-2 space-y-8">
          <GraduationSuggestions students={students} checkIns={checkIns} belts={belts} />

          {/* Presence Chart */}
          <div className="p-5 sm:p-8 bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 shadow-sm rounded-[40px] xl:rounded-[48px] overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-50 dark:bg-white/5 rounded-xl">
                  <BarChart3 className="w-5 h-5 text-black dark:text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Fluxo de Alunos</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Atividades nos últimos 7 dias</p>
                </div>
              </div>
              <div className="self-start sm:self-auto flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-tighter">
                <TrendingUp className="w-3 h-3" />
                Em crescimento
              </div>
            </div>
            
            {presenceData.some(d => d.count > 0) ? (
              <div className="h-[200px] sm:h-[250px] w-full">
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
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', paddingTop: '20px' }} />
                    <Bar dataKey="bjj" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} name="Jiu-Jitsu" />
                    <Bar dataKey="muayThai" stackId="a" fill="#f43f5e" radius={[12, 12, 0, 0]} name="Muay Thai" />
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
  ) : (
    <div className="space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-6 bg-white border border-gray-100 rounded-[40px] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500 text-white rounded-2xl flex items-center justify-center font-black italic">BJJ</div>
          <div>
            <p className="text-2xl font-black text-gray-900">{stats.activeBJJ}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Alunos Ativos Jiu-Jitsu</p>
          </div>
        </div>
        <div className="p-6 bg-white border border-gray-100 rounded-[40px] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center font-black italic">MT</div>
          <div>
            <p className="text-2xl font-black text-gray-900">{stats.activeMuayThai}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Alunos Ativos Muay Thai</p>
          </div>
        </div>
      </div>

      <div className="p-8 bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 shadow-sm rounded-[48px] overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Fluxo por Modalidade</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Distribuição de check-ins nos últimos 7 dias</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-[10px] font-bold text-gray-500 uppercase">Jiu-Jitsu</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500" />
              <span className="text-[10px] font-bold text-gray-500 uppercase">Muay Thai</span>
            </div>
          </div>
        </div>
        
        {presenceData.some(d => d.count > 0) ? (
          <div className="h-[350px] w-full">
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
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#9ca3af' }} />
                <Tooltip 
                  cursor={{ fill: '#f9fafb' }}
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 800, textTransform: 'uppercase', color: '#111827' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', paddingTop: '20px' }} />
                <Bar dataKey="bjj" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} name="Jiu-Jitsu" />
                <Bar dataKey="muayThai" stackId="a" fill="#f43f5e" radius={[12, 12, 0, 0]} name="Muay Thai" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[300px] flex flex-col items-center justify-center text-center p-12 bg-gray-50/50 rounded-[40px] border border-dashed border-gray-200">
            <div className="p-6 bg-white rounded-full shadow-sm mb-4">
              <Clock className="w-12 h-12 text-gray-200" />
            </div>
            <p className="text-gray-400 italic">Nenhum check-in registrado para análise nos últimos 7 dias.</p>
          </div>
        )}
      </div>
    </div>
  )}
    </div>
  );
};
