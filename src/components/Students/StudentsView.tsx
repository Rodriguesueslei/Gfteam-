import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  X, 
  AlertCircle, 
  Edit2, 
  Trash2, 
  Archive, 
  RotateCcw, 
  History as HistoryIcon, 
  TrendingUp,
  Scan,
  CheckCircle2,
  MoreVertical,
  Phone,
  Mail,
  Calendar as CalendarIcon,
  MapPin
} from 'lucide-react';
import { Timestamp, addDoc, collection, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { cn, formatCurrency, getBeltColor } from '../../utils/formatters';
import { handleFirestoreError, OperationType } from '../../utils/errorHandlers';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { getFaceDescriptor, loadModels } from '../../services/faceRecognitionService';

// Simple mask function
const maskPhone = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

interface StudentsViewProps {
  belts: any[];
  students: any[];
  instructors: any[];
  plans: any[];
  classes: any[];
}

export const StudentsView = ({ belts, students, instructors, plans, classes }: StudentsViewProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const { isAdmin, isReceptionist } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    address: '',
    belt: 'White',
    stripes: 0,
    status: 'Active',
    category: 'Adulto',
    disability: '',
    guardianName: '',
    guardianDoc: '',
    guardianEmail: '',
    guardianPhone: '',
    facialId: '',
    monthlyFee: 150,
    planId: '',
    facePhoto: null as string | null,
    faceDescriptor: null as string | null
  });

  const isMinor = useMemo(() => {
    if (!formData.birthDate) return false;
    const birth = new Date(formData.birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age < 18;
  }, [formData.birthDate]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSave = {
        ...formData,
        facePhoto: formData.facePhoto || editingStudent?.facePhoto || null,
        faceDescriptor: formData.faceDescriptor || editingStudent?.faceDescriptor || null
      };

      if (editingStudent) {
        await updateDoc(doc(db, 'students', editingStudent.id), dataToSave);
        toast.success("Aluno atualizado!");
      } else {
        const selectedPlan = plans.find((p: any) => p.id === formData.planId);
        const duration = selectedPlan?.durationMonths || 1;
        
        await addDoc(collection(db, 'students'), {
          ...formData,
          joinDate: Timestamp.now(),
          lastPaymentDate: Timestamp.now(),
          nextPaymentDate: Timestamp.fromDate(new Date(new Date().setMonth(new Date().getMonth() + duration)))
        });
        toast.success("Aluno cadastrado com sucesso!");
      }
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, editingStudent ? `students/${editingStudent.id}` : 'students');
      toast.error("Erro ao salvar aluno.");
    }
  };

  const handleCaptureFace = async () => {
    try {
      setIsCapturing(true);
      await loadModels();
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      }).catch(async () => {
        return await navigator.mediaDevices.getUserMedia({ video: true });
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error: any) {
      console.error("Error starting camera:", error);
      if (error?.name === "NotAllowedError" || error?.message?.includes("Permission denied")) {
        toast.error("Acesso à câmera negado. Verifique as permissões do seu navegador.");
      } else {
        toast.error("Erro ao acessar a câmera. Verifique se ela está conectada.");
      }
      setIsCapturing(false);
    }
  };

  const takePhoto = async () => {
    if (!videoRef.current) return;
    
    const loadingToast = toast.loading("Analisando rosto...");
    try {
      const detection = await getFaceDescriptor(videoRef.current);
      if (detection) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(videoRef.current, 0, 0);
        const photoData = canvas.toDataURL('image/jpeg');
        
        setFormData({
          ...formData,
          facePhoto: photoData,
          faceDescriptor: JSON.stringify(Array.from(detection.descriptor))
        } as any);
        
        toast.success("Rosto capturado com sucesso!", { id: loadingToast });
        stopCamera();
      } else {
        toast.error("Rosto não detectado. Tente novamente.", { id: loadingToast });
      }
    } catch (error) {
      toast.error("Erro ao processar imagem.", { id: loadingToast });
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
  };

  const filteredStudents = students.filter((s: any) => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArchived = showArchived ? s.status === 'Archived' : s.status !== 'Archived';
    return matchesSearch && matchesArchived;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-black italic uppercase tracking-tighter">Alunos</h1>
          <p className="text-gray-500 font-medium">Gerencie os membros da sua academia.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowArchived(!showArchived)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
              showArchived 
                ? "bg-rose-50 border-rose-200 text-rose-600" 
                : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
            )}
          >
            {showArchived ? 'Ver Ativos' : 'Ver Arquivados'}
          </button>
          {isAdmin && (
            <button 
              onClick={() => { 
                setEditingStudent(null); 
                setFormData({
                  name: '',
                  email: '',
                  phone: '',
                  birthDate: '',
                  address: '',
                  belt: 'White',
                  stripes: 0,
                  status: 'Active',
                  category: 'Adulto',
                  guardianName: '',
                  guardianDoc: '',
                  guardianEmail: '',
                  guardianPhone: '',
                  facialId: '',
                  monthlyFee: 150,
                  planId: ''
                });
                setIsModalOpen(true); 
              }}
              className="flex items-center justify-center px-6 py-3 text-sm font-black text-white bg-black rounded-xl hover:bg-gray-800 transition-all shadow-lg uppercase italic tracking-wider"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Aluno
            </button>
          )}
        </div>
      </header>

      <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-[32px]">
        <div className="relative mb-8">
          <Search className="absolute w-5 h-5 text-gray-400 left-4 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Buscar por nome ou email..." 
            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 transition-all outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map(student => (
            <div key={student.id} className="group p-6 bg-white border border-gray-100 rounded-[32px] hover:shadow-xl transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <div className={cn(
                  "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                  student.status === 'Active' ? "bg-emerald-100 text-emerald-700" : 
                  student.status === 'Archived' ? "bg-rose-100 text-rose-700" : "bg-gray-100 text-gray-600"
                )}>
                  {student.status === 'Active' ? 'Ativo' : student.status === 'Archived' ? 'Arquivado' : 'Inativo'}
                </div>
              </div>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl font-black text-gray-400 overflow-hidden shadow-inner">
                  {student.facePhoto ? (
                    <img src={student.facePhoto} className="w-full h-full object-cover" alt="" />
                  ) : student.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 leading-tight">{student.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getBeltColor(student.belt, belts) }} />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{student.belt}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-gray-500">
                  <Phone className="w-4 h-4" />
                  <span className="text-xs font-medium">{student.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-500">
                  <Mail className="w-4 h-4" />
                  <span className="text-xs font-medium truncate">{student.email}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-6 border-t border-gray-50">
                {(isAdmin || isReceptionist) && (
                  <>
                    <button 
                      onClick={() => { setEditingStudent(student); setFormData(student); setIsModalOpen(true); }}
                      className="flex-1 py-2 bg-gray-50 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-100 transition-all"
                    >
                      Editar
                    </button>
                    <button 
                      onClick={async () => {
                        const newStatus = student.status === 'Archived' ? 'Active' : 'Archived';
                        await updateDoc(doc(db, 'students', student.id), { status: newStatus });
                        toast.success(newStatus === 'Archived' ? "Aluno arquivado" : "Aluno reativado");
                      }}
                      className="p-2 text-gray-400 hover:text-rose-500 transition-colors"
                    >
                      {student.status === 'Archived' ? <RotateCcw className="w-5 h-5" /> : <Archive className="w-5 h-5" />}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Aluno */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-black text-black italic uppercase tracking-tighter">
                      {editingStudent ? 'Editar Aluno' : 'Novo Aluno'}
                    </h2>
                    <p className="text-gray-500 font-medium">Preencha os dados do membro.</p>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleAddStudent} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Nome Completo</label>
                      <input 
                        required
                        type="text" 
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Email</label>
                      <input 
                        required
                        type="email" 
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Telefone</label>
                      <input 
                        type="text" 
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Data de Nascimento</label>
                      <input 
                        type="date" 
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                        value={formData.birthDate}
                        onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Faixa Atual</label>
                      <select 
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all appearance-none"
                        value={formData.belt}
                        onChange={(e) => setFormData({ ...formData, belt: e.target.value })}
                      >
                        {belts.map(b => (
                          <option key={b.id} value={b.name}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Graus</label>
                      <input 
                        type="number" 
                        min="0" max="4"
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                        value={formData.stripes}
                        onChange={(e) => setFormData({ ...formData, stripes: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Plano</label>
                      <select 
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all appearance-none"
                        value={formData.planId}
                        onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                      >
                        <option value="">Selecione um plano</option>
                        {plans.map(p => (
                          <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.price)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Mensalidade (R$)</label>
                      <input 
                        type="number" 
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                        value={formData.monthlyFee}
                        onChange={(e) => setFormData({ ...formData, monthlyFee: parseFloat(e.target.value) })}
                      />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Possui alguma deficiência ou condição especial?</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Autismo, TDAH, Condição física, etc. (Deixe em branco se não houver)"
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                        value={formData.disability}
                        onChange={(e) => setFormData({ ...formData, disability: e.target.value })}
                      />
                    </div>

                    {isMinor && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100"
                      >
                        <div className="md:col-span-2">
                          <h3 className="text-sm font-black text-black uppercase tracking-widest mb-2">Dados do Responsável</h3>
                          <p className="text-xs text-gray-400 font-medium">Obrigatório para alunos menores de 18 anos.</p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Nome do Responsável</label>
                          <input 
                            required={isMinor}
                            type="text" 
                            className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                            value={formData.guardianName}
                            onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Documento (CPF/RG)</label>
                          <input 
                            required={isMinor}
                            type="text" 
                            className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                            value={formData.guardianDoc}
                            onChange={(e) => setFormData({ ...formData, guardianDoc: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Email do Responsável</label>
                          <input 
                            required={isMinor}
                            type="email" 
                            className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                            value={formData.guardianEmail}
                            onChange={(e) => setFormData({ ...formData, guardianEmail: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Telefone do Responsável</label>
                          <input 
                            required={isMinor}
                            type="text" 
                            className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
                            value={formData.guardianPhone}
                            onChange={(e) => setFormData({ ...formData, guardianPhone: maskPhone(e.target.value) })}
                          />
                        </div>
                      </motion.div>
                    )}

                    <div className="md:col-span-2 space-y-4">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Reconhecimento Facial</label>
                      <div className="flex flex-col items-center gap-4 p-6 bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-200">
                        {isCapturing ? (
                          <div className="space-y-4 w-full flex flex-col items-center">
                            <video 
                              ref={videoRef} 
                              autoPlay 
                              muted 
                              className="w-full max-w-sm rounded-2xl shadow-lg bg-black aspect-video object-cover"
                            />
                            <div className="flex gap-2">
                              <button 
                                type="button"
                                onClick={takePhoto}
                                className="px-6 py-2 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all"
                              >
                                Capturar Rosto
                              </button>
                              <button 
                                type="button"
                                onClick={stopCamera}
                                className="px-6 py-2 bg-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-300 transition-all"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-4">
                            {(formData as any).facePhoto ? (
                              <div className="relative group">
                                <img 
                                  src={(formData as any).facePhoto} 
                                  className="w-32 h-32 rounded-2xl object-cover shadow-md" 
                                  alt="Facial" 
                                />
                                <button 
                                  type="button"
                                  onClick={handleCaptureFace}
                                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center text-white font-bold text-xs"
                                >
                                  Alterar
                                </button>
                              </div>
                            ) : (
                              <button 
                                type="button"
                                onClick={handleCaptureFace}
                                className="flex flex-col items-center gap-2 text-gray-400 hover:text-black transition-colors"
                              >
                                <Scan className="w-12 h-12" />
                                <span className="text-xs font-bold uppercase tracking-wider">Cadastrar Biometria Facial</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-6">
                    <button 
                      type="submit"
                      className="w-full py-5 bg-black text-white font-black text-lg rounded-2xl hover:bg-gray-800 transition-all shadow-xl active:scale-95 uppercase italic tracking-tighter"
                    >
                      {editingStudent ? 'Salvar Alterações' : 'Cadastrar Aluno'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
