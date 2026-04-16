import React, { useState, useMemo } from 'react';
import { Plus, Clock, Calendar as CalendarIcon, X, Edit2, Trash2, Users, Check, ChevronLeft, ChevronRight, Grid, List } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { addDoc, collection, doc, updateDoc, deleteDoc, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils/formatters';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

interface ClassesViewProps {
  classes: any[];
  instructors: any[];
}

export const ClassesView = ({ classes, instructors }: ClassesViewProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [showUpdateScopeModal, setShowUpdateScopeModal] = useState(false);
  const [showDeleteScopeModal, setShowDeleteScopeModal] = useState(false);
  const [pendingUpdateData, setPendingUpdateData] = useState<any>(null);
  const [classToDelete, setClassToDelete] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'calendar'>('grid');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { isAdmin } = useAuth();
  
  const [formData, setFormData] = useState({
    title: '',
    instructorIds: [] as string[],
    categories: [] as string[],
    daysOfWeek: [] as string[],
    startTime: '',
    endTime: '',
    capacity: 20,
    isRecurring: true,
    recurrenceWeeks: 4
  });

  const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  const categories = ['Adulto', 'Kids', 'Juvenil', 'No-Gi', 'Competição'];

  const formatTime = (time: any) => {
    if (!time) return '';
    if (typeof time === 'string') return time;
    if (time.seconds) {
      return format(new Date(time.seconds * 1000), 'HH:mm');
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.daysOfWeek.length === 0) {
      toast.error("Selecione pelo menos um dia da semana.");
      return;
    }

    const dataToSave = {
      ...formData,
      startTime: formData.startTime,
      endTime: formData.endTime,
      updatedAt: Timestamp.now()
    };

    if (editingClass && editingClass.recurrenceId) {
      setPendingUpdateData(dataToSave);
      setShowUpdateScopeModal(true);
      return;
    }

    await performSave(dataToSave);
  };

  const performSave = async (dataToSave: any, scope: 'single' | 'all' = 'single') => {
    try {
      if (editingClass) {
        if (scope === 'all' && editingClass.recurrenceId) {
          const batch = writeBatch(db);
          const relatedClasses = classes.filter(c => c.recurrenceId === editingClass.recurrenceId);
          
          relatedClasses.forEach(cls => {
            // Keep the original date but update other fields
            batch.update(doc(db, 'classes', cls.id), dataToSave);
          });
          
          await batch.commit();
          toast.success("Todas as aulas recorrentes foram atualizadas!");
        } else {
          await updateDoc(doc(db, 'classes', editingClass.id), dataToSave);
          toast.success("Aula atualizada!");
        }
      } else {
        const batch = writeBatch(db);
        const recurrenceId = Math.random().toString(36).substring(7);
        const today = startOfDay(new Date());
        
        const dayToNumber: { [key: string]: number } = {
          'Domingo': 0, 'Segunda': 1, 'Terça': 2, 'Quarta': 3, 'Quinta': 4, 'Sexta': 5, 'Sábado': 6
        };

        // For each selected day of week
        for (const dayName of formData.daysOfWeek) {
          const targetDay = dayToNumber[dayName];
          const currentDay = today.getDay();
          
          // Calculate the date for the first occurrence (this week)
          let daysUntilFirst = targetDay - currentDay;
          // If the day has already passed this week, we could start from next week or stay in this week
          // Let's stay in this week (even if past) to keep the offset logic simple
          const firstOccurrence = addDays(today, daysUntilFirst);

          const classData = {
            ...dataToSave,
            dayOfWeek: dayName,
            recurrenceId
          };

          if (formData.isRecurring) {
            // Create instances for the next X weeks
            for (let i = 0; i < formData.recurrenceWeeks; i++) {
              const instanceDate = addDays(firstOccurrence, i * 7);
              const newClassRef = doc(collection(db, 'classes'));
              batch.set(newClassRef, {
                ...classData,
                date: Timestamp.fromDate(instanceDate),
                weekOffset: i,
                instanceId: `${recurrenceId}-${dayName}-${i}`
              });
            }
          } else {
            const newClassRef = doc(collection(db, 'classes'));
            batch.set(newClassRef, {
              ...classData,
              date: Timestamp.fromDate(firstOccurrence),
              instanceId: `${recurrenceId}-${dayName}-0`
            });
          }
        }
        
        await batch.commit();
        toast.success("Aula(s) criada(s)!");
      }
      setIsModalOpen(false);
      setShowUpdateScopeModal(false);
      setPendingUpdateData(null);
    } catch (error) {
      console.error("Error saving class:", error);
      toast.error("Erro ao salvar aula.");
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Deseja excluir as ${selectedClasses.length} aulas selecionadas?`)) return;
    
    try {
      const batch = writeBatch(db);
      selectedClasses.forEach(id => {
        batch.delete(doc(db, 'classes', id));
      });
      await batch.commit();
      setSelectedClasses([]);
      toast.success("Aulas excluídas com sucesso!");
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast.error("Erro ao excluir aulas.");
    }
  };

  const performDelete = async (scope: 'single' | 'all' = 'single') => {
    if (!classToDelete) return;

    try {
      if (scope === 'all' && classToDelete.recurrenceId) {
        const batch = writeBatch(db);
        const relatedClasses = classes.filter(c => c.recurrenceId === classToDelete.recurrenceId);
        
        relatedClasses.forEach(cls => {
          batch.delete(doc(db, 'classes', cls.id));
        });
        
        await batch.commit();
        toast.success("Todas as aulas da série foram excluídas!");
      } else {
        await deleteDoc(doc(db, 'classes', classToDelete.id));
        toast.success("Aula excluída");
      }
      setShowDeleteScopeModal(false);
      setClassToDelete(null);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Erro ao excluir aula");
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedClasses(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const filteredClasses = useMemo(() => {
    if (viewMode === 'calendar') {
      return classes.filter(cls => {
        if (!cls.date) return false;
        const classDate = cls.date.seconds ? new Date(cls.date.seconds * 1000) : new Date(cls.date);
        return isSameDay(classDate, selectedDate);
      });
    }
    return classes;
  }, [classes, viewMode, selectedDate]);

  const renderCalendarTile = ({ date, view }: any) => {
    if (view === 'month') {
      const dayClasses = classes.filter(cls => {
        if (!cls.date) return false;
        const classDate = cls.date.seconds ? new Date(cls.date.seconds * 1000) : new Date(cls.date);
        return isSameDay(classDate, date);
      });
      
      if (dayClasses.length > 0) {
        return (
          <div className="mt-1 flex justify-center gap-0.5">
            {dayClasses.slice(0, 3).map((_, i) => (
              <div key={i} className="w-1 h-1 bg-black rounded-full" />
            ))}
          </div>
        );
      }
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <style>{`
        .react-calendar {
          width: 100%;
          border: none;
          background: white;
          font-family: inherit;
          border-radius: 32px;
          padding: 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.05);
        }
        .react-calendar__tile--active {
          background: black !important;
          border-radius: 12px;
        }
        .react-calendar__tile--now {
          background: #f3f4f6;
          border-radius: 12px;
        }
        .react-calendar__navigation button {
          font-weight: bold;
          text-transform: uppercase;
          font-style: italic;
        }
      `}</style>

      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-black italic uppercase tracking-tighter">Aulas</h1>
          <p className="text-gray-500 font-medium">Gerencie a grade de horários da academia.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('grid')}
              className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-white shadow-sm text-black" : "text-gray-400")}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('calendar')}
              className={cn("p-2 rounded-lg transition-all", viewMode === 'calendar' ? "bg-white shadow-sm text-black" : "text-gray-400")}
            >
              <CalendarIcon className="w-4 h-4" />
            </button>
          </div>
          
          {selectedClasses.length > 0 && isAdmin && (
            <button 
              onClick={handleBulkDelete}
              className="flex items-center justify-center px-6 py-3 text-sm font-black text-white bg-rose-500 rounded-xl hover:bg-rose-600 transition-all shadow-lg uppercase italic tracking-wider"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir ({selectedClasses.length})
            </button>
          )}

          {isAdmin && (
            <button 
              onClick={() => { 
                setEditingClass(null); 
                setFormData({ 
                  title: '', 
                  instructorIds: [], 
                  categories: [], 
                  daysOfWeek: [], 
                  startTime: '', 
                  endTime: '', 
                  capacity: 20,
                  isRecurring: true,
                  recurrenceWeeks: 4
                }); 
                setIsModalOpen(true); 
              }}
              className="flex items-center justify-center px-6 py-3 text-sm font-black text-white bg-black rounded-xl hover:bg-gray-800 transition-all shadow-lg uppercase italic tracking-wider"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Aula
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-8">
        {viewMode === 'calendar' && (
          <div className="lg:w-80 shrink-0">
            <Calendar 
              onChange={setSelectedDate} 
              value={selectedDate}
              locale="pt-BR"
              tileContent={renderCalendarTile}
            />
          </div>
        )}

        <div className="flex-1">
          {viewMode === 'calendar' && (
            <div className="mb-6">
              <h2 className="text-xl font-black text-black italic uppercase tracking-tighter">
                Aulas de {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </h2>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredClasses.map(cls => {
              const classInstructors = instructors.filter(i => cls.instructorIds?.includes(i.id));
              const isSelected = selectedClasses.includes(cls.id);

              return (
                <div 
                  key={cls.id} 
                  className={cn(
                    "p-6 bg-white border rounded-[32px] shadow-sm hover:shadow-xl transition-all group relative",
                    isSelected ? "border-black ring-1 ring-black" : "border-gray-100"
                  )}
                >
                  {isAdmin && (
                    <div className="absolute top-4 right-4 z-10">
                      <button 
                        onClick={() => toggleSelection(cls.id)}
                        className={cn(
                          "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                          isSelected ? "bg-black border-black text-white" : "border-gray-200 bg-white hover:border-gray-400"
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-4 pr-8">
                    <div className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-500">
                      {cls.dayOfWeek}
                    </div>
                    <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs">
                      <Clock className="w-3 h-3" />
                      {formatTime(cls.startTime)} - {formatTime(cls.endTime)}
                    </div>
                  </div>

                  <h3 className="text-xl font-black text-gray-900 mb-2 uppercase italic tracking-tighter">{cls.title || cls.name}</h3>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {cls.categories?.map((cat: string, idx: number) => (
                      <span key={`${cls.id}-${cat}-${idx}`} className="px-2 py-0.5 bg-gray-50 text-gray-400 text-[9px] font-bold uppercase tracking-wider rounded-md">
                        {cat}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center -space-x-2 mb-6">
                    {classInstructors.map((instructor, idx) => (
                      <div 
                        key={`${cls.id}-${instructor.id}-${idx}`} 
                        className="w-8 h-8 rounded-full bg-white border-2 border-white shadow-sm flex items-center justify-center text-xs font-bold text-gray-400 overflow-hidden"
                        title={instructor.name}
                      >
                        {instructor.name.charAt(0)}
                      </div>
                    ))}
                    {classInstructors.length === 0 && (
                      <span className="text-xs font-medium text-gray-400 ml-2">Sem instrutor</span>
                    )}
                    {classInstructors.length > 0 && (
                      <span className="text-xs font-medium text-gray-500 ml-4">
                        {classInstructors.length === 1 ? classInstructors[0].name : `${classInstructors.length} Professores`}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Users className="w-4 h-4" />
                      <span className="text-xs font-bold">{cls.capacity} Vagas</span>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => { 
                            setEditingClass(cls); 
                            setFormData({
                              title: cls.title || cls.name || '',
                              instructorIds: cls.instructorIds || [],
                              categories: cls.categories || [],
                              daysOfWeek: cls.daysOfWeek || (cls.dayOfWeek ? [cls.dayOfWeek] : []),
                              startTime: cls.startTime || '',
                              endTime: cls.endTime || '',
                              capacity: cls.capacity || 20,
                              isRecurring: cls.isRecurring || false,
                              recurrenceWeeks: 4
                            }); 
                            setIsModalOpen(true); 
                          }} 
                          className="p-2 text-gray-400 hover:text-black transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (cls.recurrenceId) {
                              setClassToDelete(cls);
                              setShowDeleteScopeModal(true);
                            } else if (confirm("Deseja excluir esta aula?")) {
                              setClassToDelete(cls);
                              performDelete('single');
                            }
                          }}
                          className="p-2 text-gray-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredClasses.length === 0 && (
              <div className="col-span-full py-12 text-center bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-200">
                <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Nenhuma aula encontrada para este dia.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showDeleteScopeModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowDeleteScopeModal(false)} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden p-8"
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto">
                  <Trash2 className="w-8 h-8 text-rose-500" />
                </div>
                <h2 className="text-2xl font-black text-black italic uppercase tracking-tighter">Excluir Aula Recorrente</h2>
                <p className="text-gray-500 font-medium">Esta aula faz parte de uma série. Como você deseja excluir?</p>
                
                <div className="grid grid-cols-1 gap-3 pt-4">
                  <button 
                    onClick={() => performDelete('single')}
                    className="w-full py-4 bg-gray-100 text-black font-bold rounded-2xl hover:bg-gray-200 transition-all"
                  >
                    Apenas esta aula
                  </button>
                  <button 
                    onClick={() => performDelete('all')}
                    className="w-full py-4 bg-rose-500 text-white font-black rounded-2xl hover:bg-rose-600 transition-all uppercase italic tracking-widest shadow-lg"
                  >
                    Excluir toda a série
                  </button>
                  <button 
                    onClick={() => setShowDeleteScopeModal(false)}
                    className="w-full py-4 text-gray-400 font-bold hover:text-gray-600 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showUpdateScopeModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowUpdateScopeModal(false)} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden p-8"
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto">
                  <Clock className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-black text-black italic uppercase tracking-tighter">Aula Recorrente</h2>
                <p className="text-gray-500 font-medium">Esta aula faz parte de uma série recorrente. Como você deseja aplicar as alterações?</p>
                
                <div className="grid grid-cols-1 gap-3 pt-4">
                  <button 
                    onClick={() => performSave(pendingUpdateData, 'single')}
                    className="w-full py-4 bg-gray-100 text-black font-bold rounded-2xl hover:bg-gray-200 transition-all"
                  >
                    Apenas nesta aula
                  </button>
                  <button 
                    onClick={() => performSave(pendingUpdateData, 'all')}
                    className="w-full py-4 bg-black text-white font-black rounded-2xl hover:bg-gray-800 transition-all uppercase italic tracking-widest shadow-lg"
                  >
                    Em todas as aulas da série
                  </button>
                  <button 
                    onClick={() => setShowUpdateScopeModal(false)}
                    className="w-full py-4 text-gray-400 font-bold hover:text-gray-600 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden p-8 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-black text-black italic uppercase tracking-tighter mb-6">{editingClass ? 'Editar Aula' : 'Nova Aula'}</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Título da Aula</label>
                  <input required placeholder="Ex: Jiu-Jitsu Iniciante" className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Professores</label>
                  <div className="grid grid-cols-2 gap-2">
                    {instructors.map(i => (
                      <button
                        key={i.id}
                        type="button"
                        onClick={() => {
                          const ids = (formData.instructorIds || []).includes(i.id)
                            ? (formData.instructorIds || []).filter(id => id !== i.id)
                            : [...(formData.instructorIds || []), i.id];
                          setFormData({...formData, instructorIds: ids});
                        }}
                        className={cn(
                          "px-4 py-3 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between",
                          (formData.instructorIds || []).includes(i.id) ? "bg-black text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                        )}
                      >
                        {i.name}
                        {(formData.instructorIds || []).includes(i.id) && <Check className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Categorias</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          const cats = (formData.categories || []).includes(cat)
                            ? (formData.categories || []).filter(c => c !== cat)
                            : [...(formData.categories || []), cat];
                          setFormData({...formData, categories: cats});
                        }}
                        className={cn(
                          "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                          (formData.categories || []).includes(cat) ? "bg-black text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Dias da Semana</label>
                  <div className="flex flex-wrap gap-2">
                    {days.map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          const selectedDays = (formData.daysOfWeek || []).includes(d)
                            ? (formData.daysOfWeek || []).filter(day => day !== d)
                            : [...(formData.daysOfWeek || []), d];
                          setFormData({...formData, daysOfWeek: selectedDays});
                        }}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          (formData.daysOfWeek || []).includes(d) ? "bg-black text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Capacidade</label>
                    <input type="number" className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none" value={formData.capacity || ''} onChange={e => setFormData({...formData, capacity: parseInt(e.target.value) || 0})} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Início</label>
                    <input required type="time" className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Fim</label>
                    <input required type="time" className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
                  </div>
                </div>

                {!editingClass && (
                  <div className="p-6 bg-gray-50 rounded-[32px] space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-900">Aula Recorrente?</span>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, isRecurring: !formData.isRecurring})}
                        className={cn(
                          "w-12 h-6 rounded-full transition-all relative",
                          formData.isRecurring ? "bg-black" : "bg-gray-200"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                          formData.isRecurring ? "right-1" : "left-1"
                        )} />
                      </button>
                    </div>
                    {formData.isRecurring && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Repetir por quantas semanas?</label>
                        <input type="number" min="1" max="52" className="w-full px-4 py-3 bg-white rounded-xl outline-none border border-gray-100" value={formData.recurrenceWeeks} onChange={e => setFormData({...formData, recurrenceWeeks: parseInt(e.target.value)})} />
                      </div>
                    )}
                  </div>
                )}

                <button type="submit" className="w-full py-5 bg-black text-white font-black rounded-[24px] hover:bg-gray-800 transition-all uppercase italic tracking-widest shadow-xl">
                  {editingClass ? 'Atualizar Aula' : 'Criar Aula'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
