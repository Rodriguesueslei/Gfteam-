import React, { useState, useEffect } from 'react';
import { 
  Download, 
  FileText, 
  Plus, 
  DollarSign, 
  Filter, 
  Edit2, 
  Trash2,
  TrendingUp,
  TrendingDown,
  PieChart as PieChartIcon,
  X,
  MessageCircle,
  Search,
  ShoppingCart
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { Timestamp, addDoc, collection, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, cn } from '../../utils/formatters';
import { handleFirestoreError, OperationType } from '../../utils/errorHandlers';
import toast from 'react-hot-toast';

interface FinanceiroViewProps {
  payments: any[];
  students: any[];
  plans: any[];
  expenses: any[];
  installments: any[];
  onNavigate: (tab: string) => void;
}

export const FinanceiroView = ({ payments, students, plans, expenses, installments, onNavigate }: FinanceiroViewProps) => {
  const [activeSubTab, setActiveSubTab] = useState('history');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [installmentFilter, setInstallmentFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { isAdmin, isReceptionist } = useAuth();
  
  const [formData, setFormData] = useState({
    studentId: '',
    amount: '',
    method: 'Pix',
    period: new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    date: new Date().toISOString().split('T')[0]
  });

  const [expenseFormData, setExpenseFormData] = useState({
    description: '',
    amount: '',
    category: 'Aluguel',
    date: new Date().toISOString().split('T')[0]
  });

  // Chart Data
  const [chartData, setChartData] = useState<any[]>([]);
  const [expenseDistribution, setExpenseDistribution] = useState<any[]>([]);

  useEffect(() => {
    // Last 6 months data
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return format(d, 'MM/yyyy');
    }).reverse();

    const data = last6Months.map(month => {
      const monthRevenue = payments.filter(p => {
        const pDate = new Date(p.date.seconds * 1000);
        return format(pDate, 'MM/yyyy') === month;
      }).reduce((acc, curr) => {
        const amount = Number(curr.amount);
        return acc + (isNaN(amount) ? 0 : amount);
      }, 0);

      const monthExpenses = (expenses || []).filter(e => {
        const eDate = new Date(e.date.seconds * 1000);
        return format(eDate, 'MM/yyyy') === month;
      }).reduce((acc, curr) => {
        const amount = Number(curr.amount);
        return acc + (isNaN(amount) ? 0 : amount);
      }, 0);

      return {
        name: month,
        receita: monthRevenue,
        despesa: monthExpenses
      };
    });
    setChartData(data);

    // Expense Distribution
    const categories: any = {};
    (expenses || []).forEach(e => {
      const amount = Number(e.amount);
      const validAmount = isNaN(amount) ? 0 : amount;
      categories[e.category] = (categories[e.category] || 0) + validAmount;
    });
    const distribution = Object.keys(categories).map(cat => ({
      name: cat,
      value: categories[cat]
    }));
    setExpenseDistribution(distribution);

  }, [payments, expenses]);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        studentId: formData.studentId,
        amount: parseFloat(formData.amount),
        method: formData.method,
        period: formData.period,
        date: Timestamp.fromDate(new Date(formData.date))
      };

      if (editingPayment) {
        await updateDoc(doc(db, 'payments', editingPayment.id), data);
        toast.success("Pagamento atualizado!");
      } else {
        await addDoc(collection(db, 'payments'), data);
        
        const student = students.find((s: any) => s.id === formData.studentId);
        const plan = plans.find((p: any) => p.id === student?.planId);
        const duration = plan?.durationMonths || 1;

        if (formData.studentId) {
          await updateDoc(doc(db, 'students', formData.studentId), {
            lastPaymentDate: Timestamp.fromDate(new Date(formData.date)),
            nextPaymentDate: Timestamp.fromDate(new Date(new Date(formData.date).setMonth(new Date(formData.date).getMonth() + duration)))
          });
        }
        toast.success("Pagamento registrado com sucesso!");
      }

      setIsModalOpen(false);
      setEditingPayment(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'payments');
      toast.error("Erro ao processar pagamento.");
    }
  };

  const handleReceiveInstallment = async (installment: any) => {
    try {
      // 1. Update installment status
      await updateDoc(doc(db, 'installments', installment.id), {
        status: 'paid',
        paidAt: Timestamp.now()
      });

      // 2. Record as a payment in cash flow
      await addDoc(collection(db, 'payments'), {
        studentId: installment.studentId,
        amount: installment.amount,
        method: 'Pix', // Default or ask user
        period: format(new Date(), 'MMMM yyyy'),
        date: Timestamp.now(),
        type: 'installment',
        saleId: installment.saleId,
        description: `Parcela ${installment.installmentNumber}/${installment.totalInstallments} - ${installment.productName}`
      });

      toast.success("Parcela recebida com sucesso!");
    } catch (err) {
      toast.error("Erro ao receber parcela.");
    }
  };

  const handleWhatsAppCollection = (inst: any) => {
    const student = students.find(s => s.id === inst.studentId);
    if (!student?.phone) {
      toast.error("Aluno sem telefone cadastrado.");
      return;
    }

    const message = `Olá ${student.name}, tudo bem? Passando para lembrar da sua parcela de ${inst.productName} (${inst.installmentNumber}/${inst.totalInstallments}) no valor de ${formatCurrency(inst.amount)}, com vencimento em ${format(new Date(inst.dueDate.seconds * 1000), 'dd/MM/yyyy')}. Segue nossa chave PIX para pagamento: [SUA CHAVE PIX AQUI]. Oss!`;
    const encodedMessage = encodeURIComponent(message);
    const phone = student.phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${phone}?text=${encodedMessage}`, '_blank');
  };

  const filteredInstallments = (installments || []).filter(inst => {
    const matchesSearch = inst.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         inst.productName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    const isOverdue = inst.status === 'pending' && 
                     inst.dueDate?.seconds && 
                     new Date(inst.dueDate.seconds * 1000) < new Date();

    if (installmentFilter === 'all') return true;
    if (installmentFilter === 'overdue') return isOverdue;
    if (installmentFilter === 'pending') return inst.status === 'pending' && !isOverdue;
    return inst.status === installmentFilter;
  });

  const filteredPayments = payments.filter(p => {
    const student = students.find(s => s.id === p.studentId);
    return student?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
           p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           p.method?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredExpenses = (expenses || []).filter(e => 
    e.description?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const COLORS = ['#111827', '#4b5563', '#9ca3af', '#e5e7eb', '#3b82f6', '#10b981'];

  const totalRevenue = payments.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);
  const totalExpenses = (expenses || []).reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-black italic uppercase tracking-tighter">Financeiro</h1>
          <p className="text-gray-500 font-medium">Controle de fluxo de caixa e mensalidades.</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <button 
              onClick={() => onNavigate('reports')}
              className="flex items-center justify-center px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
            >
              <Download className="w-4 h-4 mr-2" />
              Relatórios
            </button>
          )}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center px-6 py-2 text-sm font-bold text-white bg-black rounded-xl hover:bg-gray-800 transition-all shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Lançamento
          </button>
        </div>
      </header>

      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Financial Chart */}
          <div className="lg:col-span-2 p-6 bg-white border border-gray-100 shadow-sm rounded-[32px]">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Fluxo de Caixa</h3>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Últimos 6 meses</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Receita</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Despesa</span>
                </div>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }}
                  />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="receita" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                  <Area type="monotone" dataKey="despesa" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expense Distribution */}
          <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-[32px]">
            <div className="flex items-center gap-2 mb-8">
              <PieChartIcon className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-bold text-gray-900">Distribuição de Gastos</h3>
            </div>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseDistribution}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {expenseDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 space-y-2">
              {expenseDistribution.slice(0, 4).map((item, i) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-xs font-bold text-gray-500 uppercase">{item.name}</span>
                  </div>
                  <span className="text-xs font-black text-gray-900">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-emerald-500 rounded-[32px] text-white shadow-xl shadow-emerald-500/20">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold uppercase tracking-widest opacity-80">Receita Total</p>
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-3xl font-black italic tracking-tighter">{formatCurrency(totalRevenue)}</h3>
          </div>
          <div className="p-6 bg-rose-500 rounded-[32px] text-white shadow-xl shadow-rose-500/20">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold uppercase tracking-widest opacity-80">Despesas Totais</p>
              <TrendingDown className="w-5 h-5" />
            </div>
            <h3 className="text-3xl font-black italic tracking-tighter">{formatCurrency(totalExpenses)}</h3>
          </div>
          <div className="p-6 bg-black rounded-[32px] text-white shadow-xl shadow-black/20">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold uppercase tracking-widest opacity-80">Saldo em Caixa</p>
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-3xl font-black italic tracking-tighter">{formatCurrency(totalRevenue - totalExpenses)}</h3>
          </div>
        </div>
      )}

      {/* Tabs and List logic */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-[32px] overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => { setActiveSubTab('history'); setSearchTerm(''); }}
              className={cn(
                "px-6 py-2 rounded-xl font-bold text-sm transition-all",
                activeSubTab === 'history' ? "bg-black text-white" : "text-gray-400 hover:bg-gray-50"
              )}
            >
              Pagamentos
            </button>
            <button 
              onClick={() => { setActiveSubTab('expenses'); setSearchTerm(''); }}
              className={cn(
                "px-6 py-2 rounded-xl font-bold text-sm transition-all",
                activeSubTab === 'expenses' ? "bg-black text-white" : "text-gray-400 hover:bg-gray-50"
              )}
            >
              Despesas
            </button>
            <button 
              onClick={() => { setActiveSubTab('installments'); setSearchTerm(''); }}
              className={cn(
                "px-6 py-2 rounded-xl font-bold text-sm transition-all",
                activeSubTab === 'installments' ? "bg-black text-white" : "text-gray-400 hover:bg-gray-50"
              )}
            >
              Parcelas Vendas
            </button>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-full sm:w-64">
              <Search className="absolute w-4 h-4 text-gray-400 left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Buscar..." 
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-gray-200 outline-none"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {activeSubTab === 'installments' && (
              <div className="flex bg-gray-100 p-1 rounded-xl">
                {(['all', 'pending', 'overdue', 'paid'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setInstallmentFilter(f)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                      installmentFilter === f ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                    {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendentes' : f === 'overdue' ? 'Atrasadas' : 'Pagas'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                {activeSubTab === 'installments' ? (
                  <>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cliente / Produto</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Parcela</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Vencimento</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Valor</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ações</th>
                  </>
                ) : (
                  <>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Descrição / Aluno</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Valor</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Data</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Categoria / Método</th>
                    {isAdmin && <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Ações</th>}
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
              {activeSubTab === 'history' ? (
                filteredPayments.length > 0 ? filteredPayments.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                          <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{students.find(s => s.id === p.studentId)?.name || 'Visitante'}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">{p.period}</p>
                          {p.description && <p className="text-[9px] text-gray-400 italic">{p.description}</p>}
                        </div>
                      </div>
                    </td>
                  <td className="px-8 py-5">
                    <span className="text-sm font-black text-emerald-600">{formatCurrency(p.amount)}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm text-gray-500 font-medium">{p.date?.seconds ? format(new Date(p.date.seconds * 1000), 'dd/MM/yyyy') : ''}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
                      {p.method}
                    </span>
                  </td>
                    {isAdmin && (
                      <td className="px-8 py-5 text-right">
                        <button 
                          onClick={async () => {
                            if (window.confirm("Deseja excluir este pagamento?")) {
                              await deleteDoc(doc(db, 'payments', p.id));
                              toast.success("Pagamento excluído.");
                            }
                          }}
                        className="p-2 text-gray-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              )) : null) : activeSubTab === 'expenses' ? filteredExpenses.map(e => (
                <tr key={e.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <p className="text-sm font-bold text-gray-900">{e.description}</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm font-black text-rose-600">{formatCurrency(e.amount)}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm text-gray-500 font-medium">{e.date?.seconds ? format(new Date(e.date.seconds * 1000), 'dd/MM/yyyy') : ''}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-gray-900 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                      {e.category}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-8 py-5 text-right">
                      <button 
                        onClick={async () => {
                          if (window.confirm("Deseja excluir esta despesa?")) {
                            await deleteDoc(doc(db, 'expenses', e.id));
                            toast.success("Despesa excluída.");
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              )) : filteredInstallments.map(inst => (
                <tr key={inst.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                          <ShoppingCart className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{inst.studentName}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">{inst.productName}</p>
                        </div>
                      </div>
                    </td>
                  <td className="px-8 py-5">
                    <span className="text-xs font-bold text-gray-500">{inst.installmentNumber}/{inst.totalInstallments}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm text-gray-500 font-medium">
                      {inst.dueDate?.seconds ? format(new Date(inst.dueDate.seconds * 1000), 'dd/MM/yyyy') : ''}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm font-black text-gray-900">{formatCurrency(inst.amount)}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className={cn(
                      "px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider",
                      inst.status === 'paid' ? "bg-emerald-50 text-emerald-600" : 
                      (inst.status === 'pending' && inst.dueDate?.seconds && new Date(inst.dueDate.seconds * 1000) < new Date()) ? "bg-rose-50 text-rose-600" :
                      "bg-amber-50 text-amber-600"
                    )}>
                      {inst.status === 'paid' ? 'Pago' : 
                       (inst.status === 'pending' && inst.dueDate?.seconds && new Date(inst.dueDate.seconds * 1000) < new Date()) ? 'Atrasado' : 
                       'Pendente'}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      {inst.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleWhatsAppCollection(inst)}
                            className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all shadow-md"
                            title="Cobrar via WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleReceiveInstallment(inst)}
                            className="p-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-all shadow-md"
                            title="Receber Parcela"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Modal de Pagamento */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-black italic uppercase tracking-tighter">Novo Pagamento</h2>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleAddPayment} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Aluno</label>
                    <select 
                      required
                      className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all appearance-none"
                      value={formData.studentId}
                      onChange={(e) => {
                        const student = students.find(s => s.id === e.target.value);
                        setFormData({ 
                          ...formData, 
                          studentId: e.target.value,
                          amount: student?.monthlyFee?.toString() || ''
                        });
                      }}
                    >
                      <option value="">Selecione o aluno</option>
                      {students.filter(s => s.status === 'Active').map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Valor (R$)</label>
                    <input 
                      required type="number" step="0.01"
                      className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Método</label>
                      <select 
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all appearance-none"
                        value={formData.method}
                        onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                      >
                        <option value="Pix">Pix</option>
                        <option value="Card">Cartão</option>
                        <option value="Cash">Dinheiro</option>
                        <option value="Transfer">Transferência</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Data</label>
                      <input 
                        type="date"
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      />
                    </div>
                  </div>

                  <button type="submit" className="w-full py-5 bg-black text-white font-black text-lg rounded-2xl hover:bg-gray-800 transition-all shadow-xl uppercase italic tracking-tighter">
                    Confirmar Recebimento
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Despesa */}
      <AnimatePresence>
        {isExpenseModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsExpenseModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-black italic uppercase tracking-tighter">Nova Despesa</h2>
                  <button onClick={() => setIsExpenseModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await addDoc(collection(db, 'expenses'), {
                      description: expenseFormData.description,
                      amount: parseFloat(expenseFormData.amount),
                      category: expenseFormData.category,
                      date: Timestamp.fromDate(new Date(expenseFormData.date))
                    });
                    toast.success("Despesa registrada!");
                    setIsExpenseModalOpen(false);
                  } catch (err) {
                    toast.error("Erro ao salvar despesa.");
                  }
                }} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Descrição</label>
                    <input 
                      required type="text"
                      className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                      value={expenseFormData.description}
                      onChange={(e) => setExpenseFormData({ ...expenseFormData, description: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Valor (R$)</label>
                      <input 
                        required type="number" step="0.01"
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                        value={expenseFormData.amount}
                        onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Categoria</label>
                      <select 
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all appearance-none"
                        value={expenseFormData.category}
                        onChange={(e) => setExpenseFormData({ ...expenseFormData, category: e.target.value })}
                      >
                        <option value="Aluguel">Aluguel</option>
                        <option value="Energia">Energia</option>
                        <option value="Água">Água</option>
                        <option value="Internet">Internet</option>
                        <option value="Limpeza">Limpeza</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Outros">Outros</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Data</label>
                    <input 
                      type="date"
                      className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                      value={expenseFormData.date}
                      onChange={(e) => setExpenseFormData({ ...expenseFormData, date: e.target.value })}
                    />
                  </div>

                  <button type="submit" className="w-full py-5 bg-rose-500 text-white font-black text-lg rounded-2xl hover:bg-rose-600 transition-all shadow-xl uppercase italic tracking-tighter">
                    Registrar Despesa
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
