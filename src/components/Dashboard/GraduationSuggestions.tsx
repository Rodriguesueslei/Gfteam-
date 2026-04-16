import React, { useMemo } from 'react';
import { Award, TrendingUp, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../../utils/formatters';

interface GraduationSuggestionsProps {
  students: any[];
  checkIns: any[];
  belts: any[];
}

export const GraduationSuggestions = ({ students, checkIns, belts }: GraduationSuggestionsProps) => {
  const suggestions = useMemo(() => {
    const activeStudents = students.filter(s => s.status === 'Active');
    
    return activeStudents.map(student => {
      const studentCheckIns = checkIns.filter(c => c.studentId === student.id);
      const attendanceCount = studentCheckIns.length;
      
      // Calculate time in current rank (using joinDate if lastGraduation is missing)
      const startTimestamp = student.lastGraduationDate || student.joinDate;
      if (!startTimestamp?.seconds) return null;
      
      const startDate = new Date(startTimestamp.seconds * 1000);
      const monthsInRank = (new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
      
      let progress = 0;
      let reason = "";
      let type: 'belt' | 'stripe' = 'stripe';

      // Simple logic for stripes (every 3 months + 25 classes)
      if (student.stripes < 4) {
        const stripeProgress = Math.min(100, (attendanceCount % 25) * 4);
        const timeProgress = Math.min(100, (monthsInRank % 3) * 33);
        progress = (stripeProgress + timeProgress) / 2;
        reason = `${attendanceCount} aulas, ${Math.floor(monthsInRank)} meses`;
        type = 'stripe';
      } else {
        // Belt promotion logic (example)
        const beltCriteria: any = {
          'Branca': { months: 12, classes: 100 },
          'Azul': { months: 24, classes: 200 },
          'Roxa': { months: 18, classes: 150 },
          'Marrom': { months: 12, classes: 100 },
        };

        const criteria = beltCriteria[student.belt];
        if (criteria) {
          const classProgress = Math.min(100, (attendanceCount / criteria.classes) * 100);
          const timeProgress = Math.min(100, (monthsInRank / criteria.months) * 100);
          progress = (classProgress + timeProgress) / 2;
          reason = `${attendanceCount}/${criteria.classes} aulas, ${Math.floor(monthsInRank)}/${criteria.months} meses`;
          type = 'belt';
        }
      }

      return {
        ...student,
        progress: Math.round(progress),
        reason,
        type,
        startDate
      };
    })
    .filter(s => s.progress >= 80) // Only show those close to promotion
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 5);
  }, [students, checkIns]);

  if (suggestions.length === 0) return null;

  return (
    <div className="p-8 bg-white border border-gray-100 shadow-sm rounded-[40px] space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-xl">
            <Award className="w-5 h-5 text-amber-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Sugestões de Graduação</h3>
        </div>
        <TrendingUp className="w-5 h-5 text-emerald-500" />
      </div>

      <div className="space-y-4">
        {suggestions.map(student => (
          <div key={student.id} className="group p-4 bg-gray-50 hover:bg-gray-100 rounded-3xl transition-all border border-transparent hover:border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400 font-bold">
                  {student.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{student.name}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    {student.belt} • {student.stripes} Graus
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={cn(
                  "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                  student.progress >= 100 ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                )}>
                  {student.progress}% Pronto
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-1000",
                    student.progress >= 100 ? "bg-emerald-500" : "bg-amber-500"
                  )}
                  style={{ width: `${Math.min(100, student.progress)}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400 font-medium italic">
                {student.type === 'belt' ? 'Próxima Faixa' : 'Próximo Grau'}: {student.reason}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      <button className="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-lg active:scale-95">
        Ver Relatório Completo
      </button>
    </div>
  );
};
