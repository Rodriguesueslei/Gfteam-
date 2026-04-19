import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Upload, 
  X, 
  AlertCircle, 
  Download, 
  Database,
  Shield,
  Palette,
  Layout as LayoutIcon,
  FileJson,
  Package,
  CreditCard
} from 'lucide-react';
import { collection, doc, addDoc, updateDoc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils/formatters';
import { Logo } from '../ui/Logo';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

interface SettingsViewProps {
  belts: any[];
  settings: any;
  secrets?: any;
  allData?: {
    students: any[];
    payments: any[];
    sales: any[];
    expenses: any[];
    products: any[];
    checkIns: any[];
    evaluations: any[];
  };
}

export const SettingsView = ({ belts, settings, secrets, allData }: SettingsViewProps) => {
  const [activeSubTab, setActiveSubTab] = useState('belts');
  
  // Belts State
  const [isBeltModalOpen, setIsBeltModalOpen] = useState(false);
  const [beltForm, setBeltForm] = useState({ 
    name: '', 
    color: '#000000', 
    color2: '', 
    category: 'Adulto', 
    order: 0 
  });
  const [editingBelt, setEditingBelt] = useState<any>(null);

  const [logoPreview, setLogoPreview] = useState<string | null>(settings?.logoUrl || null);
  const [isSavingLogo, setIsSavingLogo] = useState(false);
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    stripePublicKey: settings?.stripePublicKey || '',
    stripeSecretKey: secrets?.stripeSecretKey || '',
    paymentProvider: settings?.paymentProvider || 'None'
  });

  const [isSavingIntegrations, setIsSavingIntegrations] = useState(false);
  const [gympassForm, setGympassForm] = useState({
    clientId: secrets?.gympassClientId || '',
    clientSecret: secrets?.gympassClientSecret || ''
  });

  const { isAdmin } = useAuth();

  useEffect(() => {
    if (settings || secrets) {
      if (settings?.logoUrl) setLogoPreview(settings.logoUrl);
      setPaymentForm({
        stripePublicKey: settings?.stripePublicKey || '',
        stripeSecretKey: secrets?.stripeSecretKey || '',
        paymentProvider: settings?.paymentProvider || 'None'
      });
      setGympassForm({
        clientId: secrets?.gympassClientId || '',
        clientSecret: secrets?.gympassClientSecret || ''
      });
    }
  }, [settings, secrets]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit to 1MB to avoid Firestore document size limits with base64
    if (file.size > 1024 * 1024) {
      toast.error("A imagem deve ter menos de 1MB");
      return;
    }

    setIsSavingLogo(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        await setDoc(doc(db, 'settings', 'global'), {
          logoUrl: base64String,
          updatedAt: serverTimestamp()
        }, { merge: true });
        setLogoPreview(base64String);
        toast.success("Logo atualizada com sucesso!");
      } catch (error) {
        console.error("Error saving logo:", error);
        toast.error("Erro ao salvar logo.");
      } finally {
        setIsSavingLogo(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBelt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBelt) {
        await updateDoc(doc(db, 'belts', editingBelt.id), beltForm);
        toast.success("Faixa atualizada!");
      } else {
        await addDoc(collection(db, 'belts'), beltForm);
        toast.success("Faixa criada!");
      }
      setIsBeltModalOpen(false);
    } catch (error) {
      toast.error("Erro ao salvar faixa.");
    }
  };

  const handleSavePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPayment(true);
    try {
      // Split public and private
      const publicData = {
        stripePublicKey: paymentForm.stripePublicKey,
        paymentProvider: paymentForm.paymentProvider,
        updatedAt: serverTimestamp()
      };
      
      const privateData = {
        stripeSecretKey: paymentForm.stripeSecretKey,
        updatedAt: serverTimestamp()
      };

      await Promise.all([
        setDoc(doc(db, 'settings', 'global'), publicData, { merge: true }),
        setDoc(doc(db, 'secret_settings', 'global'), privateData, { merge: true })
      ]);

      toast.success("Configurações de pagamento atualizadas!");
    } catch (error) {
      console.error("Error saving payment settings:", error);
      toast.error("Erro ao salvar configurações de pagamento.");
    } finally {
      setIsSavingPayment(false);
    }
  };

  const handleSaveGympassSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingIntegrations(true);
    try {
      const privateData = {
        gympassClientId: gympassForm.clientId,
        gympassClientSecret: gympassForm.clientSecret,
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'secret_settings', 'global'), privateData, { merge: true });
      toast.success("Configurações do Gympass atualizadas!");
    } catch (error) {
      console.error("Error saving Gympass settings:", error);
      toast.error("Erro ao salvar configurações do Gympass.");
    } finally {
      setIsSavingIntegrations(false);
    }
  };

  const handleExportAllData = () => {
    if (!allData) return;
    try {
      const wb = XLSX.utils.book_new();
      
      // Add each collection as a sheet
      Object.entries(allData).forEach(([name, data]) => {
        if (Array.isArray(data) && data.length > 0) {
          const ws = XLSX.utils.json_to_sheet(data.map(item => {
            const newItem = { ...item };
            // Flatten timestamps
            Object.keys(newItem).forEach(key => {
              if (newItem[key]?.seconds) {
                newItem[key] = new Date(newItem[key].seconds * 1000).toLocaleString();
              }
            });
            return newItem;
          }));
          XLSX.utils.book_append_sheet(wb, ws, name.charAt(0).toUpperCase() + name.slice(1));
        }
      });

      XLSX.writeFile(wb, `OssManager_Backup_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success("Exportação concluída!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Erro ao exportar dados.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-black italic uppercase tracking-tighter">Configurações</h1>
          <p className="text-gray-500 font-medium">Gerencie as definições do sistema.</p>
        </div>
      </header>

      <div className="flex gap-4 border-b border-gray-100 pb-4 overflow-x-auto">
        {[
          { id: 'belts', label: 'Faixas', icon: Shield },
          { id: 'logo', label: 'Identidade', icon: Palette },
          { id: 'payments', label: 'Pagamentos', icon: CreditCard },
          { id: 'integrations', label: 'Integrações', icon: Package },
          { id: 'data', label: 'Dados & Backup', icon: Database }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-6 py-2 rounded-xl font-bold text-sm transition-all whitespace-nowrap",
              activeSubTab === tab.id ? "bg-black text-white shadow-lg" : "text-gray-400 hover:bg-gray-50"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeSubTab === 'belts' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Graduações</h2>
            <button 
              onClick={() => { setEditingBelt(null); setIsBeltModalOpen(true); }}
              className="px-4 py-2 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-all shadow-md text-sm"
            >
              Nova Faixa
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {belts.map((belt) => (
              <div key={belt.id} className="p-6 bg-white border border-gray-100 rounded-[32px] shadow-sm flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-2xl shadow-inner border border-gray-100 overflow-hidden relative" 
                    style={{ backgroundColor: belt.color }}
                  >
                    {belt.color2 && (
                      <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${belt.color} 50%, ${belt.color2} 50%)` }} />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{belt.name}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{belt.category || 'Adulto'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setEditingBelt(belt); setBeltForm(belt); setIsBeltModalOpen(true); }}
                  className="p-2 text-gray-400 hover:text-black transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'logo' && (
        <div className="max-w-2xl p-8 bg-white border border-gray-100 rounded-[32px] shadow-sm space-y-8">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Logo da Academia</h2>
            <p className="text-sm text-gray-500">Personalize a identidade visual do seu sistema.</p>
          </div>
          <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-100 rounded-[32px] bg-gray-50/50 relative">
            {isSavingLogo && (
              <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-sm flex items-center justify-center rounded-[32px]">
                <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <div className="relative group">
              <div className="max-h-48 rounded-2xl shadow-lg overflow-hidden bg-white p-4">
                <Logo customSrc={logoPreview} size="md" />
              </div>
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                <label className="cursor-pointer p-4 bg-white rounded-full shadow-xl hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6 text-gray-900" />
                  <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={isSavingLogo} />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'payments' && (
        <div className="max-w-2xl space-y-6">
          <div className="p-8 bg-white border border-gray-100 rounded-[32px] shadow-sm space-y-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 rounded-2xl">
                <CreditCard className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Integração de Pagamentos</h2>
                <p className="text-sm text-gray-500">Configure as APIs para recebimento online.</p>
              </div>
            </div>

            <form onSubmit={handleSavePaymentSettings} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Provedor de Pagamento</label>
                <select 
                  className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none appearance-none font-bold"
                  value={paymentForm.paymentProvider}
                  onChange={e => setPaymentForm({...paymentForm, paymentProvider: e.target.value})}
                >
                  <option value="None">Desativado</option>
                  <option value="Stripe">Stripe (Global)</option>
                  <option value="MercadoPago">Mercado Pago (Brasil) - Em breve</option>
                </select>
              </div>

              {paymentForm.paymentProvider === 'Stripe' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 pt-4 border-t border-gray-100"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Stripe Publishable Key</label>
                    <input 
                      type="text"
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-mono text-xs"
                      placeholder="pk_test_..."
                      value={paymentForm.stripePublicKey}
                      onChange={e => setPaymentForm({...paymentForm, stripePublicKey: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Stripe Secret Key</label>
                    <input 
                      type="password"
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-mono text-xs"
                      placeholder="sk_test_..."
                      value={paymentForm.stripeSecretKey}
                      onChange={e => setPaymentForm({...paymentForm, stripeSecretKey: e.target.value})}
                    />
                  </div>
                  <div className="p-4 bg-amber-50 rounded-2xl flex gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                    <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                      Lembre-se: Chaves secretas nunca devem ser compartilhadas. Elas serão salvas de forma segura no seu banco de dados privado.
                    </p>
                  </div>
                </motion.div>
              )}

              <button 
                type="submit" 
                disabled={isSavingPayment}
                className="w-full py-4 bg-black text-white font-black rounded-2xl hover:bg-gray-800 transition-all uppercase italic shadow-lg active:scale-95 flex items-center justify-center gap-2"
              >
                {isSavingPayment ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Salvar Configurações"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeSubTab === 'integrations' && (
        <div className="max-w-2xl space-y-6">
          <div className="p-8 bg-white border border-gray-100 rounded-[32px] shadow-sm space-y-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-2xl">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Integração Wellhub (Gympass)</h2>
                <p className="text-sm text-gray-500">Conecte sua academia ao ecossistema global da Wellhub.</p>
              </div>
            </div>

            <form onSubmit={handleSaveGympassSettings} className="space-y-6">
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <p className="text-xs text-blue-700 leading-relaxed">
                  Para obter suas chaves de API, acesse o <strong>Portal do Parceiro Wellhub</strong> e solicite acesso às <strong>Partner APIs</strong>.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Client ID (API Key)</label>
                  <input 
                    type="text"
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-mono text-xs"
                    placeholder="Seu Client ID fornecido pelo Gympass"
                    value={gympassForm.clientId}
                    onChange={e => setGympassForm({...gympassForm, clientId: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Client Secret</label>
                  <input 
                    type="password"
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-mono text-xs"
                    placeholder="Seu Client Secret (Segredo da API)"
                    value={gympassForm.clientSecret}
                    onChange={e => setGympassForm({...gympassForm, clientSecret: e.target.value})}
                  />
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl flex gap-3">
                <Shield className="w-5 h-5 text-emerald-500 shrink-0" />
                <p className="text-[10px] text-emerald-700 font-medium leading-relaxed">
                  Estes dados são sensíveis e ficarão armazenados em um bando de dados isolado e criptografado, acessível apenas por administradores do sistema.
                </p>
              </div>

              <button 
                type="submit" 
                disabled={isSavingIntegrations}
                className="w-full py-4 bg-black text-white font-black rounded-2xl hover:bg-gray-800 transition-all uppercase italic shadow-lg active:scale-95 flex items-center justify-center gap-2"
              >
                {isSavingIntegrations ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Ativar Integração"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeSubTab === 'data' && (
        <div className="max-w-2xl space-y-6">
          <div className="p-8 bg-white border border-gray-100 rounded-[32px] shadow-sm space-y-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-2xl">
                <Database className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Exportação de Dados</h2>
                <p className="text-sm text-gray-500">Baixe todo o conteúdo do seu banco de dados.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                onClick={handleExportAllData}
                className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-[32px] border border-gray-100 hover:bg-gray-100 transition-all group"
              >
                <div className="p-4 bg-white rounded-2xl shadow-sm mb-4 group-hover:scale-110 transition-transform">
                  <Download className="w-6 h-6 text-emerald-600" />
                </div>
                <span className="font-bold text-gray-900">Exportar Excel</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase mt-1">Planilha Completa</span>
              </button>

              <button 
                onClick={() => {
                  const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(JSON.stringify(allData, null, 2))}`;
                  const link = document.createElement("a");
                  link.href = jsonString;
                  link.download = `OssManager_Backup_${new Date().toISOString().split('T')[0]}.json`;
                  link.click();
                  toast.success("Backup JSON baixado!");
                }}
                className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-[32px] border border-gray-100 hover:bg-gray-100 transition-all group"
              >
                <div className="p-4 bg-white rounded-2xl shadow-sm mb-4 group-hover:scale-110 transition-transform">
                  <FileJson className="w-6 h-6 text-blue-600" />
                </div>
                <span className="font-bold text-gray-900">Exportar JSON</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase mt-1">Backup Técnico</span>
              </button>
            </div>
          </div>
        </div>
      )}
      <AnimatePresence>
        {isBeltModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsBeltModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden p-8">
              <h2 className="text-2xl font-black text-black italic uppercase tracking-tighter mb-6">{editingBelt ? 'Editar Faixa' : 'Nova Faixa'}</h2>
              <form onSubmit={handleSaveBelt} className="space-y-4">
                <input required placeholder="Nome da Faixa" className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none" value={beltForm.name} onChange={e => setBeltForm({...beltForm, name: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 ml-2">Cor Principal</label>
                    <input type="color" className="w-full h-12 bg-gray-50 rounded-xl outline-none p-1" value={beltForm.color} onChange={e => setBeltForm({...beltForm, color: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 ml-2">Cor Secundária (Opcional)</label>
                    <input type="color" className="w-full h-12 bg-gray-50 rounded-xl outline-none p-1" value={beltForm.color2} onChange={e => setBeltForm({...beltForm, color2: e.target.value})} />
                  </div>
                </div>
                <select className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none appearance-none" value={beltForm.category} onChange={e => setBeltForm({...beltForm, category: e.target.value})}>
                  <option value="Adulto">Adulto</option>
                  <option value="Infantil">Infantil</option>
                </select>
                <button type="submit" className="w-full py-4 bg-black text-white font-black rounded-2xl hover:bg-gray-800 transition-all uppercase italic">Salvar</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
