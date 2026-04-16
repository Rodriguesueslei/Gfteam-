import React, { useState } from 'react';
import { 
  CreditCard, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Calendar,
  DollarSign,
  User
} from 'lucide-react';
import { format, isAfter, isBefore, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency, cn } from '../../utils/formatters';
import { Timestamp, addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface MensalidadesViewProps {
  students: any[];
  payments: any[];
  plans: any[];
}

export const MensalidadesView = ({ students, payments, plans }: MensalidadesViewProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    method: 'Dinheiro',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  const getStatus = (student: any) => {
    if (!student.nextPaymentDate) return 'pending';
    const nextDate = student.nextPaymentDate.toDate();
    const now = new Date();
    
    if (isBefore(nextDate, now)) return 'overdue';
    if (isAfter(nextDate, endOfMonth(now))) return 'paid';
    return 'pending';
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const status = getStatus(s);
    
    if (filter === 'all') return matchesSearch;
    return matchesSearch && status === filter;
  });

  const handleReceivePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    try {
      const plan = plans.find(p => p.id === selectedStudent.planId);
      const duration = plan?.durationMonths || 1;
      const amount = parseFloat(paymentData.amount);

      // 1. Record payment
      await addDoc(collection(db, 'payments'), {
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        amount: amount,
        method: paymentData.method,
        date: Timestamp.fromDate(new Date(paymentData.date)),
        type: 'mensalidade',
        createdAt: Timestamp.now()
      });

      // 2. Update student next payment date
      const currentNextDate = selectedStudent.nextPaymentDate?.toDate() || new Date();
      const newNextDate = new Date(currentNextDate);
      newNextDate.setMonth(newNextDate.getMonth() + duration);

      await updateDoc(doc(db, 'students', selectedStudent.id), {
        lastPaymentDate: Timestamp.fromDate(new Date(paymentData.date)),
        nextPaymentDate: Timestamp.fromDate(newNextDate)
      });

      toast.success(`Mensalidade de ${selectedStudent.name} recebida!`);
      setIsModalOpen(false);
      setSelectedStudent(null);
    } catch (error) {
      console.error("Error receiving payment:", error);
      toast.error("Erro ao processar pagamento.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-4xl font-black text-black italic uppercase tracking-tighter">Mensalidades</h1>
        <p className="text-gray-500 font-medium">Gestão de recebimentos e status de alunos.</p>
      </header>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex bg-gray-100 p-1 rounded-2xl w-full md:w-auto">
          {(['all', 'paid', 'pending', 'overdue'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "flex-1 md:flex-none px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                filter === f ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              {f === 'all' ? 'Todos' : f === 'paid' ? 'Em dia' : f === 'pending' ? 'Pendente' : 'Atrasado'}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Buscar aluno..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-6 py-3 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-black/5 transition-all font-medium"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudents.map(student => {
          const status = getStatus(student);
          const plan = plans.find(p => p.id === student.planId);
          
          return (
            <div key={student.id} className="bg-white border border-gray-100 rounded-[32px] p-6 shadow-sm hover:shadow-xl transition-all group">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 font-bold">
                    {student.name[0]}
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 uppercase italic tracking-tighter">{student.name}</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{plan?.name || 'Sem Plano'}</p>
                  </div>
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                  status === 'paid' ? "bg-emerald-50 text-emerald-600" : 
                  status === 'overdue' ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                )}>
                  {status === 'paid' ? 'Em dia' : status === 'overdue' ? 'Atrasado' : 'Pendente'}
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 font-bold uppercase tracking-widest">Vencimento</span>
                  <span className="text-gray-900 font-black">
                    {student.nextPaymentDate ? format(student.nextPaymentDate.toDate(), 'dd/MM/yyyy') : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 font-bold uppercase tracking-widest">Valor Plano</span>
                  <span className="text-gray-900 font-black">{formatCurrency(plan?.price || 0)}</span>
                </div>
              </div>

              <button 
                onClick={() => {
                  setSelectedStudent(student);
                  setPaymentData({
                    amount: (plan?.price || 0).toString(),
                    method: 'Dinheiro',
                    date: format(new Date(), 'yyyy-MM-dd')
                  });
                  setIsModalOpen(true);
                }}
                className="w-full py-4 bg-black text-white font-black rounded-2xl hover:bg-gray-800 transition-all uppercase italic tracking-widest text-xs"
              >
                Receber Mensalidade
              </button>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center text-white">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-black italic uppercase tracking-tighter">Receber</h2>
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">{selectedStudent?.name}</p>
                </div>
              </div>

              <form onSubmit={handleReceivePayment} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Valor</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-gray-400">R$</span>
                    <input 
                      required 
                      type="number" 
                      step="0.01"
                      className="w-full pl-14 pr-6 py-4 bg-gray-50 rounded-2xl outline-none font-black text-lg" 
                      value={paymentData.amount} 
                      onChange={e => setPaymentData({...paymentData, amount: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Forma de Pagamento</label>
                  <select 
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-bold appearance-none"
                    value={paymentData.method}
                    onChange={e => setPaymentData({...paymentData, method: e.target.value})}
                  >
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Pix">Pix</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Data do Pagamento</label>
                  <input 
                    required 
                    type="date" 
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-bold" 
                    value={paymentData.date} 
                    onChange={e => setPaymentData({...paymentData, date: e.target.value})} 
                  />
                </div>

                <button type="submit" className="w-full py-5 bg-black text-white font-black rounded-[24px] hover:bg-gray-800 transition-all uppercase italic tracking-widest shadow-xl">
                  Confirmar Recebimento
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
