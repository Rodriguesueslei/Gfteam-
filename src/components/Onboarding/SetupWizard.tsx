import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Database, ShieldCheck, Rocket, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../../utils/formatters';

export const SetupWizard = () => {
  const { user, updateTenantConfig } = useAuth();
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateTenantConfig(config);
      setStep(3);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row">
        {/* Sidebar */}
        <div className="md:w-64 bg-black p-8 text-white flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-8">
              <Rocket className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="space-y-6">
              <StepIndicator num={1} title="Boas-vindas" active={step === 1} done={step > 1} />
              <StepIndicator num={2} title="Configuração" active={step === 2} done={step > 2} />
              <StepIndicator num={3} title="Concluído" active={step === 3} done={step > 3} />
            </div>
          </div>
          <div className="text-[10px] uppercase font-black tracking-widest text-white/40">
            SaaS Setup v2.0
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-12">
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-3xl font-black text-black italic uppercase tracking-tighter mb-4">Bem-vindo ao Next Level</h2>
              <p className="text-gray-500 font-medium mb-8 leading-relaxed">
                Estamos felizes em ter você conosco! Para começar, precisamos conectar o sistema ao seu próprio banco de dados Firebase.
              </p>
              <div className="space-y-4 mb-10">
                <FeatureItem icon={<Database className="w-4 h-4" />} text="Seus dados, seu controle" desc="Toda a informação da sua academia fica no seu projeto." />
                <FeatureItem icon={<ShieldCheck className="w-4 h-4" />} text="Segurança Total" desc="Você mantém as chaves de acesso do seu banco." />
              </div>
              <button 
                onClick={() => setStep(2)}
                className="w-full py-4 bg-black text-white font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-800 transition-all uppercase italic tracking-tighter shadow-xl shadow-black/10"
              >
                Começar Configuração
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-3xl font-black text-black italic uppercase tracking-tighter mb-4">Configurar Firebase</h2>
              <p className="text-gray-400 text-sm mb-8">Cole abaixo as credenciais do seu projeto Firebase Console.</p>
              
              <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                {Object.keys(config).map((key) => (
                  <div key={key} className={cn("space-y-1", key === 'apiKey' || key === 'authDomain' ? "col-span-2" : "")}>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{key}</label>
                    <input 
                      required
                      type="text"
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-200 outline-none transition-all font-mono text-xs"
                      value={(config as any)[key]}
                      onChange={e => setConfig({ ...config, [key]: e.target.value })}
                    />
                  </div>
                ))}
                
                <div className="col-span-2 pt-6">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full py-5 bg-black text-white font-black text-lg rounded-2xl hover:bg-gray-800 transition-all shadow-xl uppercase italic tracking-tighter disabled:opacity-50"
                  >
                    {loading ? 'Salvando...' : 'Finalizar Configuração'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {step === 3 && (
            <div className="text-center animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className="text-3xl font-black text-black italic uppercase tracking-tighter mb-4">Tudo Pronto!</h2>
              <p className="text-gray-500 font-medium mb-10 leading-relaxed">
                Suas configurações foram salvas com sucesso. O sistema agora está conectado ao seu banco de dados.
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="w-full py-4 bg-emerald-500 text-white font-black rounded-2xl hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 uppercase tracking-tighter italic"
              >
                Acessar Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StepIndicator = ({ num, title, active, done }: any) => (
  <div className="flex items-center gap-4">
    <div className={cn(
      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all",
      active ? "bg-emerald-400 text-black scale-110 shadow-lg shadow-emerald-400/20" : 
      done ? "bg-emerald-400/20 text-emerald-400 border border-emerald-400/30" : 
      "bg-white/5 text-white/30 border border-white/10"
    )}>
      {num}
    </div>
    <span className={cn(
      "text-sm font-bold transition-all",
      active ? "text-white opacity-100" : "text-white/30"
    )}>{title}</span>
  </div>
);

const FeatureItem = ({ icon, text, desc }: any) => (
  <div className="flex gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 group hover:border-black/10 transition-all">
    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-black shadow-sm group-hover:bg-black group-hover:text-white transition-all">
      {icon}
    </div>
    <div>
      <h4 className="text-sm font-black text-black uppercase tracking-tight">{text}</h4>
      <p className="text-xs text-gray-400 font-medium">{desc}</p>
    </div>
  </div>
);
