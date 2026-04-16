import React, { useState, useEffect, useMemo } from 'react';
import { 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Camera, 
  Search, 
  X, 
  ChevronRight, 
  History,
  LogOut,
  ExternalLink,
  HelpCircle
} from 'lucide-react';
import { format, subMinutes, isWithinInterval, addMinutes, differenceInMinutes, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Timestamp, addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db, logout } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Logo } from '../ui/Logo';
import { cn } from '../../utils/formatters';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { getFaceDescriptor, loadModels, createFaceMatcher } from '../../services/faceRecognitionService';
import * as faceapi from 'face-api.js';

interface CheckInTabletViewProps {
  students: any[];
  classes: any[];
  settings: any;
}

export const CheckInTabletView = ({ students, classes, settings }: CheckInTabletViewProps) => {
  const { isCheckInTablet } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: "" });
  const [mode, setMode] = useState<'selection' | 'manual' | 'facial'>('selection');
  const [recentCheckIns, setRecentCheckIns] = useState<any[]>([]);
  const [isModelsLoading, setIsModelsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const faceMatcherRef = React.useRef<faceapi.FaceMatcher | null>(null);
  const detectionIntervalRef = React.useRef<any>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const allCheckIns: any[] = [];
    classes.forEach((cls: any) => {
      if (cls.presence && cls.presence.length > 0) {
        cls.presence.forEach((studentId: string) => {
          const student = students.find((s: any) => s.id === studentId);
          if (student) {
            allCheckIns.push({
              id: `${cls.id}-${student.id}`,
              studentName: student.name,
              className: cls.name || cls.title || 'Aula',
              time: cls.startTime,
              studentPhoto: student.facePhoto
            });
          }
        });
      }
    });

    const sorted = allCheckIns
      .filter(ci => ci.time?.seconds)
      .sort((a, b) => b.time.seconds - a.time.seconds)
      .slice(0, 5);
    setRecentCheckIns(sorted);
  }, [classes, students]);

  useEffect(() => {
    if (mode === 'facial') {
      startFacialRecognition();
    } else {
      stopFacialRecognition();
    }
    return () => stopFacialRecognition();
  }, [mode]);

  const startFacialRecognition = async () => {
    try {
      setIsModelsLoading(true);
      setLoadingStep("Iniciando câmera...");
      
      // 1. Request camera FIRST to trigger permission prompt immediately
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      }).catch(async (err) => {
        console.warn("Primary camera constraints failed, trying fallback...", err);
        return await navigator.mediaDevices.getUserMedia({ video: true });
      });

      // 2. Load models while camera is starting
      setLoadingStep("Carregando Inteligência Artificial...");
      try {
        await loadModels();
      } catch (modelError) {
        console.error("Failed to load AI models:", modelError);
        toast.error("Erro ao carregar inteligência artificial. Verifique sua conexão.");
        setIsModelsLoading(false);
        setMode('selection');
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      
      setLoadingStep("Preparando reconhecimento...");
      
      // Prepare face matcher
      const activeStudents = students.filter(s => s.status === 'Active');
      const studentsWithFace = activeStudents.filter(s => s.faceDescriptor);
      
      if (studentsWithFace.length === 0) {
        toast.error("Nenhum aluno com biometria facial cadastrada.");
        setIsModelsLoading(false);
        setMode('selection');
        // Stop stream if no students
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      const labeledDescriptors = studentsWithFace.map(s => {
        try {
          let descriptorArray: any;
          
          if (typeof s.faceDescriptor === 'string') {
            try {
              descriptorArray = JSON.parse(s.faceDescriptor);
            } catch (e) {
              console.error(`Error parsing faceDescriptor string for ${s.name}:`, e);
              return null;
            }
          } else {
            descriptorArray = Array.isArray(s.faceDescriptor) 
              ? s.faceDescriptor 
              : Object.values(s.faceDescriptor);
          }
          
          // Filter only numbers and ensure exactly 128 elements
          const cleanDescriptor = (Array.isArray(descriptorArray) ? descriptorArray : [])
            .map(v => Number(v))
            .filter(v => !isNaN(v));

          if (cleanDescriptor.length !== 128) {
            console.warn(`Student ${s.name} has invalid descriptor length: ${cleanDescriptor.length}. Expected 128.`);
            return null;
          }
          
          const descriptor = new Float32Array(cleanDescriptor);
          return new faceapi.LabeledFaceDescriptors(s.id, [descriptor]);
        } catch (e) {
          console.error(`Error processing descriptor for ${s.name}:`, e);
          return null;
        }
      }).filter((d): d is faceapi.LabeledFaceDescriptors => d !== null);

      if (labeledDescriptors.length > 0) {
        faceMatcherRef.current = createFaceMatcher(labeledDescriptors);
      } else {
        toast.error("Erro ao processar dados faciais.");
        setIsModelsLoading(false);
        setMode('selection');
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      // Final step: Attach stream to video element
      if (videoRef.current) {
        try {
          videoRef.current.srcObject = stream;
          await Promise.race([
            videoRef.current.play(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Video play timeout")), 5000))
          ]);
        } catch (playError) {
          console.warn("Video play failed, but continuing...", playError);
        }
      }
      
      setIsModelsLoading(false);
      setLoadingStep("");
      
      // Start detection loop
      if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = setInterval(async () => {
        if (videoRef.current && faceMatcherRef.current && mode === 'facial') {
          try {
            setIsScanning(true);
            const detection = await getFaceDescriptor(videoRef.current);
            if (detection && detection.descriptor) {
              // Safety check: ensure detection descriptor is also 128
              if (detection.descriptor.length === 128) {
                const bestMatch = faceMatcherRef.current.findBestMatch(detection.descriptor);
                if (bestMatch.label !== 'unknown' && bestMatch.distance < 0.55) {
                  const student = students.find(s => s.id === bestMatch.label);
                  if (student) {
                    handleCheckIn(student);
                    stopFacialRecognition();
                    setIsScanning(false);
                    return;
                  }
                }
              } else {
                console.warn("Detected face descriptor has invalid length:", detection.descriptor.length);
              }
            }
            setTimeout(() => setIsScanning(false), 300);
          } catch (e) {
            console.error("Detection loop error:", e);
            setIsScanning(false);
          }
        }
      }, 600); // Faster detection (was 1000ms)
    } catch (error: any) {
      console.error("Facial recognition error:", error);
      const errorMessage = error?.message || String(error);
      
      if (errorMessage.includes("Permission denied") || errorMessage.includes("NotAllowedError") || error?.name === "NotAllowedError") {
        toast.error("Acesso à câmera negado.");
        setStatus({ 
          type: 'error', 
          message: "Câmera bloqueada. Clique no ícone de cadeado na barra de endereços e mude 'Câmera' para 'Permitir'. Se estiver no modo de visualização, tente abrir o app em uma nova aba." 
        });
      } else if (error?.name === "NotFoundError" || error?.name === "DevicesNotFoundError") {
        toast.error("Nenhuma câmera encontrada neste dispositivo.");
        setStatus({ type: 'error', message: "Nenhuma câmera detectada. Conecte uma câmera e tente novamente." });
      } else {
        toast.error(`Erro ao iniciar câmera: ${errorMessage}`);
        setStatus({ type: 'error', message: `Erro: ${errorMessage}` });
      }
      
      setIsModelsLoading(false);
      // Removed timeout to allow user to read and click "Open in New Tab"
    }
  };

  const stopFacialRecognition = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('Camera track stopped');
      });
      videoRef.current.srcObject = null;
    }
  };

  const getTodayPortuguese = () => {
    try {
      const dayName = format(new Date(), 'EEEE', { locale: ptBR });
      const today = dayName.split('-')[0].charAt(0).toUpperCase() + dayName.split('-')[0].slice(1);
      console.log("Today is (locale):", today);
      return today;
    } catch (e) {
      const daysMap: { [key: string]: string } = {
        '0': 'Domingo',
        '1': 'Segunda',
        '2': 'Terça',
        '3': 'Quarta',
        '4': 'Quinta',
        '5': 'Sexta',
        '6': 'Sábado'
      };
      const today = daysMap[new Date().getDay().toString()];
      console.log("Today is (fallback):", today);
      return today;
    }
  };

  const activeAndUpcomingClasses = useMemo(() => {
    const now = currentTime;
    const today = getTodayPortuguese();
    
    console.log("Filtering classes for today:", today, "Total classes:", classes.length);
    
    const filtered = classes.filter((cls: any) => {
      // If the class has a specific date, check if it's today
      if (cls.date) {
        const classDate = cls.date.seconds ? new Date(cls.date.seconds * 1000) : new Date(cls.date);
        if (!isSameDay(classDate, now)) return false;
      } else {
        // Fallback for old classes without date field
        if (cls.isRecurring && cls.weekOffset !== 0) return false;
        const match = cls.dayOfWeek === today || (cls.daysOfWeek && cls.daysOfWeek.includes(today));
        if (!match) return false;
      }
      
      let start: Date;
      let end: Date;

      if (typeof cls.startTime === 'string' && typeof cls.endTime === 'string') {
        const [startH, startM] = cls.startTime.split(':').map(Number);
        const [endH, endM] = cls.endTime.split(':').map(Number);
        start = new Date(now);
        start.setHours(startH, startM, 0, 0);
        end = new Date(now);
        end.setHours(endH, endM, 0, 0);
      } else if (cls.startTime?.seconds && cls.endTime?.seconds) {
        start = new Date(cls.startTime.seconds * 1000);
        end = new Date(cls.endTime.seconds * 1000);
      } else {
        return false;
      }

      return true;
    });

    // Deduplicate by title + startTime + endTime
    const uniqueClasses = new Map();
    filtered.forEach((cls: any) => {
      const timeStr = typeof cls.startTime === 'string' ? cls.startTime : format(new Date(cls.startTime.seconds * 1000), 'HH:mm');
      const endTimeStr = typeof cls.endTime === 'string' ? cls.endTime : format(new Date(cls.endTime.seconds * 1000), 'HH:mm');
      const key = `${cls.title || cls.name}-${timeStr}-${endTimeStr}`;
      
      if (!uniqueClasses.has(key)) {
        uniqueClasses.set(key, cls);
      }
    });

    const result = Array.from(uniqueClasses.values()).sort((a, b) => {
      const timeA = typeof a.startTime === 'string' ? a.startTime : format(new Date(a.startTime.seconds * 1000), 'HH:mm');
      const timeB = typeof b.startTime === 'string' ? b.startTime : format(new Date(b.startTime.seconds * 1000), 'HH:mm');
      return timeA.localeCompare(timeB);
    });

    console.log("Filtered unique classes for today:", result.length);
    return result;
  }, [classes, currentTime]);

  const getClassStatus = (cls: any) => {
    const now = currentTime;
    let start: Date;
    let end: Date;

    if (typeof cls.startTime === 'string' && typeof cls.endTime === 'string') {
      const [startH, startM] = cls.startTime.split(':').map(Number);
      const [endH, endM] = cls.endTime.split(':').map(Number);
      start = new Date(now);
      start.setHours(startH, startM, 0, 0);
      end = new Date(now);
      end.setHours(endH, endM, 0, 0);
    } else if (cls.startTime?.seconds && cls.endTime?.seconds) {
      start = new Date(cls.startTime.seconds * 1000);
      end = new Date(cls.endTime.seconds * 1000);
    } else {
      return { label: 'Horário Inválido', color: 'text-gray-500' };
    }

    if (now < start) {
      const diff = differenceInMinutes(start, now);
      if (diff > 60) {
        return { label: `Hoje às ${format(start, 'HH:mm')}`, color: 'text-gray-400' };
      }
      return { label: `Começa em ${diff} min`, color: 'text-blue-400' };
    } else if (now <= end) {
      const diff = differenceInMinutes(end, now);
      return { label: `Em andamento (${diff} min restantes)`, color: 'text-emerald-400' };
    }
    return { label: 'Finalizada', color: 'text-gray-500' };
  };

  const handleCheckIn = async (student: any) => {
    const now = new Date();
    const todayPortuguese = getTodayPortuguese();

    const activeClass = classes.find((cls: any) => {
      if (cls.dayOfWeek !== todayPortuguese && !(cls.daysOfWeek && cls.daysOfWeek.includes(todayPortuguese))) return false;
      
      // Handle both string times (HH:mm) and Timestamps
      let start: Date;
      let end: Date;

      if (typeof cls.startTime === 'string' && typeof cls.endTime === 'string') {
        const [startH, startM] = cls.startTime.split(':').map(Number);
        const [endH, endM] = cls.endTime.split(':').map(Number);
        
        start = new Date(now);
        start.setHours(startH, startM, 0, 0);
        
        end = new Date(now);
        end.setHours(endH, endM, 0, 0);
      } else if (cls.startTime?.seconds && cls.endTime?.seconds) {
        start = new Date(cls.startTime.seconds * 1000);
        end = new Date(cls.endTime.seconds * 1000);
      } else {
        return false;
      }

      const bufferStart = subMinutes(start, 45);
      const bufferEnd = end;
      return isWithinInterval(now, { start: bufferStart, end: bufferEnd });
    });

    if (!activeClass) {
      setStatus({ type: 'error', message: "Nenhuma aula ativa no momento para check-in." });
      toast.error("Nenhuma aula ativa no momento.");
      setTimeout(() => setStatus({ type: null, message: "" }), 5000);
      return;
    }

    const currentPresence = activeClass.presence || [];
    if (currentPresence.includes(student.id)) {
      setStatus({ type: 'success', message: `Check-in já realizado para ${student.name}!` });
    } else {
      await updateDoc(doc(db, 'classes', activeClass.id), {
        presence: [...currentPresence, student.id]
      });

      await addDoc(collection(db, 'checkins'), {
        studentId: student.id,
        studentName: student.name,
        classId: activeClass.id,
        className: activeClass.name || activeClass.title || 'Aula',
        time: Timestamp.now(),
        source: 'tablet'
      });

      setStatus({ type: 'success', message: `Check-in realizado com sucesso: ${student.name}` });
    }
    setSearchTerm("");
    setMode('selection');
    setTimeout(() => setStatus({ type: null, message: "" }), 5000);
  };

  const filteredStudents = students.filter((s: any) => 
    s.status === 'Active' && 
    (s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.email.toLowerCase().includes(searchTerm.toLowerCase()))
  ).slice(0, 5);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
      <div className="absolute top-6 left-6 z-50">
        <button 
          onClick={logout}
          className="p-2 bg-white/5 hover:bg-white/10 text-white/20 hover:text-rose-500 rounded-xl transition-all border border-white/10 shadow-xl backdrop-blur-sm"
          title="Sair do Modo Tablet"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      <div className="absolute top-6 right-6 z-50 flex gap-3">
        <button 
          onClick={() => window.location.reload()}
          className="p-2 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-xl transition-all border border-white/10"
          title="Recarregar Sistema"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500 rounded-full blur-[120px]" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-2xl space-y-10 relative z-10">
        <div className="text-center space-y-6">
          <div className="relative inline-block group">
            <div className="w-48 h-24 bg-white rounded-[28px] flex items-center justify-center shadow-2xl shadow-black/20 overflow-hidden p-4">
              <Logo size="lg" className="w-full h-full" settings={settings} />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-serif font-bold text-white italic tracking-tighter leading-none">
              Gfteam <span className="text-gray-400 font-light not-italic">Limeira</span>
            </h1>
            <div className="text-emerald-500 font-mono text-xl font-bold tracking-widest">
              {format(currentTime, 'HH:mm:ss')}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {status.type && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className={cn(
                "p-6 rounded-3xl border flex items-center gap-4 shadow-2xl",
                status.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
              )}
            >
              {status.type === 'success' ? <CheckCircle2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
              <p className="text-lg font-bold">{status.message}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-6">
          {activeAndUpcomingClasses.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeAndUpcomingClasses.map((cls: any) => {
                const status = getClassStatus(cls);
                return (
                  <div key={cls.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                        {typeof cls.startTime === 'string' ? cls.startTime : format(new Date(cls.startTime.seconds * 1000), 'HH:mm')}
                      </span>
                      <span className={cn("text-[10px] font-bold uppercase", status.color)}>
                        {status.label}
                      </span>
                    </div>
                    <h4 className="text-white font-bold truncate uppercase italic">{cls.title || cls.name}</h4>
                  </div>
                );
              })}
            </div>
          )}

          {classes.length > 0 && activeAndUpcomingClasses.length === 0 && (
            <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-3xl text-blue-400 flex items-center gap-4">
              <AlertCircle className="w-8 h-8" />
              <p className="font-bold">Não há aulas agendadas para hoje ({getTodayPortuguese()}).</p>
            </div>
          )}

          {classes.length === 0 && (
            <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-3xl text-amber-400 flex items-center gap-4">
              <AlertCircle className="w-8 h-8" />
              <p className="font-bold">Aviso: Nenhuma aula cadastrada no sistema. O check-in não funcionará sem aulas.</p>
            </div>
          )}

          {mode === 'selection' && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <button 
                  onClick={() => setMode('facial')}
                  className="group p-8 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[32px] transition-all text-center space-y-4"
                >
                  <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto">
                    <Camera className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Reconhecimento Facial</h3>
                </button>

                <button 
                  onClick={() => setMode('manual')}
                  className="group p-8 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[32px] transition-all text-center space-y-4"
                >
                  <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto">
                    <Search className="w-8 h-8 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Busca Manual</h3>
                </button>
              </div>

              {/* Recent Check-ins List (No Photos) */}
              {recentCheckIns.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-400 px-2">
                    <History className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Check-ins Recentes</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden">
                    {recentCheckIns.map((checkIn, index) => (
                      <div 
                        key={`${checkIn.id}-${index}`} 
                        className={cn(
                          "p-4 flex items-center justify-between border-white/5",
                          index !== recentCheckIns.length - 1 && "border-b"
                        )}
                      >
                        <div className="flex flex-col">
                          <span className="text-white font-bold text-sm uppercase italic">{checkIn.studentName}</span>
                          <span className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">{checkIn.className}</span>
                        </div>
                        <div className="text-emerald-500 font-mono text-xs font-bold">
                          {checkIn.time?.seconds ? format(new Date(checkIn.time.seconds * 1000), 'HH:mm') : '--:--'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === 'manual' && (
            <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-white">Busca de Aluno</h3>
                <button onClick={() => setMode('selection')} className="text-gray-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <input 
                type="text"
                placeholder="Seu nome ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/10 border-none rounded-2xl py-4 px-6 text-white text-lg focus:ring-2 focus:ring-blue-500"
              />
              <div className="space-y-3">
                {searchTerm.length >= 2 && filteredStudents.map((student: any) => (
                  <button
                    key={student.id}
                    onClick={() => handleCheckIn(student)}
                    className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-white font-bold">
                        {student.name[0]}
                      </div>
                      <div className="text-left text-white font-bold">{student.name}</div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-gray-600" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'facial' && (
            <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 space-y-6 text-center">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-white">Reconhecimento Facial</h3>
                <button onClick={() => setMode('selection')} className="text-gray-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                {/* Video element should ALWAYS be in DOM when mode is facial to keep ref stable */}
                <video 
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className={cn(
                    "w-full h-full object-cover transition-opacity duration-500",
                    isModelsLoading || status.type === 'error' ? "opacity-0" : "opacity-100"
                  )}
                />

                {status.type === 'error' && (status.message.includes("Câmera") || status.message.includes("bloqueada")) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center gap-6 bg-gray-900/90 z-[60]">
                    <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center">
                      <Camera className="w-8 h-8 text-rose-500" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-white font-bold text-lg">Acesso à Câmera Bloqueado</h4>
                      <p className="text-gray-400 text-sm leading-relaxed">
                        Para usar o reconhecimento facial, você precisa permitir o acesso à câmera nas configurações do seu navegador ou abrir o app em uma aba dedicada.
                      </p>
                    </div>
                    
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 w-full text-left space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Como resolver:</p>
                      <ul className="text-xs text-gray-300 space-y-2">
                        <li className="flex gap-2">
                          <span className="text-emerald-500 font-bold">1.</span>
                          <span>Clique no ícone de <b>cadeado</b> ao lado da URL.</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-emerald-500 font-bold">2.</span>
                          <span>Ative a opção <b>Câmera</b>.</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-emerald-500 font-bold">3.</span>
                          <span>Se o erro persistir, use o botão <b>Abrir em Nova Aba</b> abaixo.</span>
                        </li>
                      </ul>
                    </div>

                    <div className="flex flex-col w-full gap-3">
                      <button 
                        onClick={() => {
                          setStatus({ type: null, message: "" });
                          startFacialRecognition();
                        }}
                        className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-all"
                      >
                        Tentar Novamente
                      </button>
                      <button 
                        onClick={() => window.open(window.location.href, '_blank')}
                        className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
                      >
                        Abrir em Nova Aba
                      </button>
                    </div>
                  </div>
                )}

                {isModelsLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 text-emerald-500 bg-black/80 z-50">
                    <div className="relative">
                      <RefreshCw className="w-16 h-16 animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                      </div>
                    </div>
                    <div className="space-y-2 text-center">
                      <p className="font-black animate-pulse uppercase tracking-[0.2em] text-xs">Aguarde um momento</p>
                      <p className="text-[10px] text-emerald-500/60 font-medium uppercase tracking-widest">{loadingStep}</p>
                    </div>
                    <button 
                      onClick={() => setMode('selection')}
                      className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest rounded-full transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  {/* Circular Overlay Mask */}
                  <div className="absolute inset-0 bg-black/40" style={{ clipPath: 'path("M0,0 H1920 V1080 H0 Z M960,540 m-240,0 a240,240 0 1,0 480,0 a240,240 0 1,0 -480,0")' }}></div>
                  
                  {/* Responsive Circle Frame */}
                  <div className={cn(
                    "w-[min(80%,480px)] aspect-square rounded-full border-2 relative transition-all duration-500",
                    isScanning ? "border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.4)]" : "border-emerald-500/30"
                  )}>
                    {/* Animated Scanning Ring */}
                    {isScanning && (
                      <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1.1, opacity: [0, 0.5, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                        className="absolute inset-0 rounded-full border-4 border-emerald-500/30"
                      />
                    )}

                    {/* Corner accents (adapted for circle) */}
                    <div className={cn("absolute -top-1 -left-1 w-12 h-12 border-t-4 border-l-4 rounded-tl-[60px] transition-colors", isScanning ? "border-emerald-500" : "border-emerald-500/50")} />
                    <div className={cn("absolute -top-1 -right-1 w-12 h-12 border-t-4 border-r-4 rounded-tr-[60px] transition-colors", isScanning ? "border-emerald-500" : "border-emerald-500/50")} />
                    <div className={cn("absolute -bottom-1 -left-1 w-12 h-12 border-b-4 border-l-4 rounded-bl-[60px] transition-colors", isScanning ? "border-emerald-500" : "border-emerald-500/50")} />
                    <div className={cn("absolute -bottom-1 -right-1 w-12 h-12 border-b-4 border-r-4 rounded-br-[60px] transition-colors", isScanning ? "border-emerald-500" : "border-emerald-500/50")} />
                    
                    {/* Scanning Line (adapted for circle) */}
                    {isScanning && (
                      <motion.div 
                        initial={{ top: "10%" }}
                        animate={{ top: "90%" }}
                        transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                        className="absolute left-[10%] right-[10%] h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_15px_rgba(16,185,129,0.8)] z-10"
                      />
                    )}
                  </div>
                </div>
              </div>
              
              <p className="text-gray-400 font-medium">Posicione seu rosto no centro da moldura</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
