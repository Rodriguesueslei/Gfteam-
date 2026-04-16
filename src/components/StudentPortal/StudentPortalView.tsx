import React, { useState, useEffect } from 'react';
import { 
  Award, 
  Calendar, 
  CreditCard, 
  User, 
  CheckCircle2, 
  Clock,
  TrendingUp,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, cn } from '../../utils/formatters';
import { Logo } from '../ui/Logo';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface StudentPortalViewProps {
  students: any[];
  payments: any[];
  checkIns: any[];
  belts: any[];
  settings: any;
}

export const StudentPortalView = ({ students, payments, checkIns, belts, settings }: StudentPortalViewProps) => {
  const { user, logout } = useAuth();
  const [studentData, setStudentData] = useState<any>(null);
  const [myPayments, setMyPayments] = useState<any[]>([]);
  const [myCheckIns, setMyCheckIns] = useState<any[]>([]);

  useEffect(() => {
    if (user && students.length > 0) {
      const student = students.find(s => s.email === user.email);
      setStudentData(student);
      
      if (student) {
        const studentPayments = payments.filter(p => p.studentId === student.id);
        setMyPayments(studentPayments);
        
        const studentCheckIns = checkIns.filter(c => c.studentId === student.id);
        setMyCheckIns(studentCheckIns);
      }
    }
  }, [user, students, payments, checkIns]);

  const handlePayment = async () => {
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: studentData.monthlyFee || 150,
          studentId: studentData.id,
          studentName: studentData.name,
        }),
      });

      const session = await response.json();
      if (session.url) {
        window.location.href = session.url;
      } else {
        throw new Error('Falha ao criar sessão de pagamento');
      }
    } catch (error) {
      console.error('Erro no pagamento:', error);
      toast.error('Erro ao iniciar pagamento. Tente novamente.');
    }
  };

  if (!studentData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <User className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Perfil não vinculado</h2>
        <p className="text-gray-500 max-w-xs">
          Seu usuário ainda não foi vinculado a um cadastro de aluno. Por favor, procure a recepção.
        </p>
        <button onClick={logout} className="mt-8 text-rose-500 font-bold flex items-center gap-2">
          <LogOut className="w-5 h-5" />
          Sair da conta
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-black italic tracking-tighter">Olá, {studentData.name.split(' ')[0]}!</h1>
          <p className="text-gray-500 font-medium text-sm">Bem-vindo ao seu portal do aluno.</p>
        </div>
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-xl shadow-black/5 overflow-hidden p-1.5 border border-gray-50">
          <Logo size="sm" settings={settings} />
        </div>
      </header>

      {/* Belt Status Card */}
      <div className="p-8 bg-black rounded-[40px] text-white relative overflow-hidden shadow-2xl shadow-black/20">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Award className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Graduação Atual</p>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                <Award className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-3xl font-black italic tracking-tighter uppercase">{studentData.belt}</h3>
                <p className="text-emerald-400 font-bold text-sm">{studentData.stripes} Graus</p>
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="px-6 py-4 bg-white/5 rounded-3xl border border-white/10 text-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Total de Aulas</p>
              <p className="text-2xl font-black italic">{myCheckIns.length}</p>
            </div>
            <div className="px-6 py-4 bg-white/5 rounded-3xl border border-white/10 text-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Frequência Mensal</p>
              <p className="text-2xl font-black italic">{myCheckIns.filter(c => {
                const date = new Date(c.time.seconds * 1000);
                return date.getMonth() === new Date().getMonth();
              }).length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Payments Section */}
        <div className="p-8 bg-white border border-gray-100 shadow-sm rounded-[40px] space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-xl">
                <CreditCard className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Mensalidades</h3>
            </div>
          </div>

          <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Próximo Vencimento</p>
              <span className={cn(
                "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                studentData.nextPaymentDate?.seconds * 1000 < Date.now() ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
              )}>
                {studentData.nextPaymentDate?.seconds * 1000 < Date.now() ? "Atrasado" : "Em dia"}
              </span>
            </div>
            <p className="text-2xl font-black text-gray-900 italic">
              {studentData.nextPaymentDate ? format(new Date(studentData.nextPaymentDate.seconds * 1000), "dd 'de' MMMM", { locale: ptBR }) : 'N/A'}
            </p>
            <button 
              onClick={handlePayment}
              className="w-full mt-6 py-4 bg-black text-white font-bold rounded-2xl hover:bg-gray-800 transition-all shadow-lg active:scale-95"
            >
              Pagar Mensalidade (PIX)
            </button>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2">Histórico Recente</p>
            {myPayments.slice(0, 3).map(p => (
              <div key={p.id} className="flex items-center justify-between p-4 bg-white border border-gray-50 rounded-2xl">
                <div>
                  <p className="text-sm font-bold text-gray-900">{p.period}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">{p.date?.seconds ? format(new Date(p.date.seconds * 1000), 'dd/MM/yyyy') : ''}</p>
                </div>
                <span className="text-sm font-black text-emerald-600">{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Attendance Section */}
        <div className="p-8 bg-white border border-gray-100 shadow-sm rounded-[40px] space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Frequência</h3>
            </div>
          </div>

          <div className="space-y-4">
            {myCheckIns.length > 0 ? (
              myCheckIns.slice(0, 5).map(c => (
                <div key={c.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                      <Clock className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{c.className}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">
                        {c.time?.seconds ? format(new Date(c.time.seconds * 1000), "eeee, dd/MM", { locale: ptBR }) : ''}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">PRESENÇA</span>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400 italic">Nenhum check-in registrado.</p>
              </div>
            )}
          </div>
          
          <button className="w-full py-4 bg-gray-50 text-gray-600 font-bold rounded-2xl hover:bg-gray-100 transition-all">
            Ver Histórico Completo
          </button>
        </div>
      </div>
    </div>
  );
};
