import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  CreditCard, 
  ShoppingCart, 
  Settings, 
  LogOut, 
  Menu, 
  ShieldAlert,
  Calendar,
  UserCheck,
  Scan,
  DollarSign,
  Package,
  Sun,
  Moon
} from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import { signInWithGoogle, logout } from './firebase';
import { 
  useBelts, 
  useStudents, 
  useClasses, 
  usePayments, 
  useInstructors, 
  usePlans, 
  useProducts, 
  useSales, 
  useUsers, 
  useExpenses, 
  useSettings,
  useCheckIns,
  useInstallments,
  useEvaluations,
  useGraduations,
  usePrivateSettings
} from './hooks/useFirebaseData';
import { cn } from './utils/formatters';
import { Logo } from './components/ui/Logo';
import { DashboardView } from './components/Dashboard/DashboardView';
import { StudentsView } from './components/Students/StudentsView';
import { FinanceiroView } from './components/Financeiro/FinanceiroView';
import { InventoryView } from './components/Inventory/InventoryView';
import { SettingsView } from './components/Settings/SettingsView';
import { InstructorsView } from './components/Instructors/InstructorsView';
import { ClassesView } from './components/Classes/ClassesView';
import { MensalidadesView } from './components/Financeiro/MensalidadesView';
import { PlansView } from './components/Financeiro/PlansView';
import { UsersView } from './components/Users/UsersView';
import { LoadingOverlay } from './components/ui/LoadingOverlay';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { CheckInTabletView } from './components/CheckIn/CheckInTabletView';
import { StudentPortalView } from './components/StudentPortal/StudentPortalView';

const AppContent = () => {
  const { user, loading: authLoading, role, permissions, isApproved, isAdmin, isReceptionist, isCheckInTablet } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode');
      return saved === 'true' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', isDarkMode.toString());
  }, [isDarkMode]);
  
  // Data Hooks
  const belts = useBelts(!!user);
  const students = useStudents(!!user, user?.email, isAdmin || permissions.students);
  const classes = useClasses(!!user);
  const instructors = useInstructors(!!user);
  const plans = usePlans(!!user);
  const products = useProducts(!!user);
  const sales = useSales(!!user);
  const users = useUsers(isAdmin || permissions.users);
  const expenses = useExpenses(isAdmin || permissions.finance);
  const settings = useSettings(!!user);
  const secrets = usePrivateSettings(isAdmin);

  // Derive linked student IDs for secure data fetching (for parents/students)
  const myStudentIds = React.useMemo(() => {
    if (isAdmin || permissions.students) return undefined;
    if (!students || students.length === 0) return [];
    return students.map(s => s.id);
  }, [students, isAdmin, permissions.students]);

  const checkIns = useCheckIns(!!user, isAdmin || permissions.students, myStudentIds);
  const installments = useInstallments(isAdmin || permissions.finance);
  const evaluations = useEvaluations(!!user, isAdmin || permissions.students, myStudentIds);
  const graduations = useGraduations(!!user, isAdmin || permissions.students, myStudentIds);
  const payments = usePayments(!!user, isAdmin || permissions.finance, myStudentIds);

  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (!!user && students.length >= 0) {
      // Small delay to ensure other hooks also have a chance to start
      const timer = setTimeout(() => setDataLoaded(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [user, students]);

  const isLoading = authLoading || (!!user && !dataLoaded);

  if (authLoading) return <LoadingOverlay isLoading={true} message="Autenticando..." />;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F9F9F7] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gray-100 rounded-full blur-[120px] opacity-50" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gray-200 rounded-full blur-[120px] opacity-30" />
        
        <div className="w-full max-w-md space-y-10 text-center relative z-10">
          <div className="space-y-6">
            <div className="w-20 h-20 bg-white rounded-[28px] flex items-center justify-center mx-auto shadow-2xl shadow-black/5 overflow-hidden p-3.5 group hover:scale-105 transition-transform duration-500">
              <Logo size="lg" settings={settings} />
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-serif font-bold text-black italic tracking-tighter leading-none">
                Gfteam <span className="text-gray-400 font-light not-italic">Limeira</span>
              </h1>
              <p className="text-gray-500 font-medium tracking-[0.2em] uppercase text-[9px]">Sistema de Gestão de Academia</p>
            </div>
          </div>

          <div className="p-1 bg-white rounded-[32px] shadow-2xl shadow-black/5 border border-gray-100">
            <button 
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-4 px-8 py-5 bg-black text-white font-bold text-lg rounded-[28px] hover:bg-gray-900 transition-all active:scale-[0.98] shadow-xl"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6 brightness-0 invert" alt="" />
              Acessar Sistema
            </button>
          </div>

          <p className="text-gray-400 text-xs font-medium">
            © {new Date().getFullYear()} GFTeam Limeira. Todos os direitos reservados.
          </p>
        </div>
      </div>
    );
  }

  if (!isApproved && !isAdmin) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-center">
        <div className="p-10 bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-[40px] max-w-md">
          <ShieldAlert className="w-16 h-16 text-amber-500 mx-auto mb-6" />
          <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-4">Acesso Pendente</h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Seu cadastro foi realizado com sucesso, mas o acesso ainda não foi liberado por um administrador.
            <br/><br/>
            Por favor, entre em contato com a recepção da academia para ativar seu perfil.
          </p>
          <button 
            onClick={logout} 
            className="w-full py-4 bg-white/10 text-white font-bold rounded-2xl hover:bg-white/20 transition-all border border-white/10"
          >
            Sair da Conta
          </button>
        </div>
      </div>
    );
  }

  if (isCheckInTablet) {
    return <CheckInTabletView students={students} classes={classes} settings={settings} />;
  }

  if (role === 'user') {
    return (
      <div className="min-h-screen bg-[#fafafa] relative">
        <div className="p-4 lg:p-10 max-w-5xl mx-auto">
          <Toaster position="top-right" />
          <StudentPortalView 
            students={students} 
            payments={payments} 
            checkIns={checkIns} 
            belts={belts} 
            settings={settings} 
            evaluations={evaluations}
            graduations={graduations}
          />
        </div>
        
        {/* Global Fallback Logout for Students */}
        <div className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 z-[100]">
          <button 
            onClick={logout}
            className="p-4 bg-white text-rose-500 rounded-2xl shadow-2xl border border-gray-100 flex items-center gap-2 font-black italic uppercase tracking-tighter hover:bg-rose-50 transition-all active:scale-95"
            title="Sair do Sistema"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView belts={belts} students={students} payments={payments} classes={classes} expenses={expenses} products={products} checkIns={checkIns} />;
      case 'students':
        return <StudentsView belts={belts} students={students} instructors={instructors} plans={plans} classes={classes} evaluations={evaluations} graduations={graduations} />;
      case 'instructors':
        return <InstructorsView instructors={instructors} />;
      case 'classes':
        return <ClassesView classes={classes} instructors={instructors} students={students} />;
      case 'mensalidades':
        return <MensalidadesView students={students} payments={payments} plans={plans} />;
      case 'plans':
        return <PlansView plans={plans} />;
      case 'checkin':
        return <CheckInTabletView students={students} classes={classes} settings={settings} />;
      case 'users':
        return <UsersView users={users} />;
      case 'finance':
        return <FinanceiroView payments={payments} students={students} plans={plans} expenses={expenses} installments={installments} />;
      case 'inventory':
        return <InventoryView products={products} sales={sales} students={students} />;
      case 'settings':
        return <SettingsView 
          belts={belts} 
          settings={settings} 
          secrets={secrets}
          allData={{ 
            students, 
            payments, 
            sales, 
            expenses, 
            products, 
            checkIns, 
            evaluations 
          }} 
        />;
      default:
        return <DashboardView belts={belts} students={students} payments={payments} classes={classes} expenses={expenses} products={products} checkIns={checkIns} />;
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp, permission: 'dashboard' },
    { id: 'students', label: 'Alunos', icon: Users, permission: 'students' },
    { id: 'instructors', label: 'Professores', icon: UserCheck, permission: 'instructors' },
    { id: 'classes', label: 'Aulas', icon: Calendar, permission: 'classes' },
    { id: 'plans', label: 'Planos', icon: Package, permission: 'finance' },
    { id: 'mensalidades', label: 'Mensalidades', icon: DollarSign, permission: 'mensalidades' },
    { id: 'checkin', label: 'Check-in', icon: Scan, permission: 'checkin' },
    { id: 'users', label: 'Acessos', icon: ShieldAlert, permission: 'users' },
    { id: 'finance', label: 'Financeiro', icon: CreditCard, permission: 'finance' },
    { id: 'inventory', label: 'Estoque', icon: ShoppingCart, permission: 'inventory' },
    { id: 'settings', label: 'Configurações', icon: Settings, permission: 'settings' },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-gray-950 flex transition-colors duration-300">
      <Toaster position="top-right" />
      <LoadingOverlay isLoading={isLoading} />
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-white/5 transition-transform lg:translate-x-0 lg:static",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col p-6">
          <div className="mb-12 px-2 flex items-center gap-3.5">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-xl shadow-black/5 overflow-hidden p-1.5 border border-gray-50">
              <Logo size="sm" settings={settings} />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-serif font-bold text-black dark:text-white italic tracking-tighter leading-none">Gfteam</span>
              <span className="text-[9px] tracking-[0.2em] font-bold text-gray-400 uppercase">Limeira</span>
            </div>
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="ml-auto p-2 bg-gray-50 dark:bg-white/10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/20 transition-all text-gray-400"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
          
          <nav className="flex-1 space-y-1">
            {menuItems.map(item => {
              // Priority for admin
              if (isAdmin) {
                // Admin sees everything
              } else if (item.permission && !permissions[item.permission]) {
                return null;
              }
              
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all group",
                    activeTab === item.id 
                      ? "bg-black text-white shadow-lg shadow-black/10" 
                      : "text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", activeTab === item.id ? "text-white" : "text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white")} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="pt-6 border-t border-gray-50">
            <div className="flex items-center gap-3 px-4 py-3 mb-4 bg-gray-50 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-gray-400 font-bold overflow-hidden">
                {user.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" /> : user.displayName?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{user.displayName}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider truncate">{role}</p>
              </div>
            </div>
            <button 
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm text-rose-500 hover:bg-rose-50 transition-all"
            >
              <LogOut className="w-5 h-5" />
              Sair do Sistema
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          <header className="flex items-center justify-between mb-8 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-xl shadow-black/5 overflow-hidden p-1.5 border border-gray-50">
                <Logo size="sm" settings={settings} />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-serif font-bold text-black italic tracking-tighter leading-none">Gfteam</span>
                <span className="text-[9px] tracking-[0.2em] font-bold text-gray-400 uppercase">Limeira</span>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(true)} className="p-2 bg-white rounded-xl border border-gray-100 shadow-sm">
              <Menu className="w-6 h-6" />
            </button>
          </header>
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
