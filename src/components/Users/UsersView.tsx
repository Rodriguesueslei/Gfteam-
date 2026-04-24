import React, { useState } from 'react';
import { Shield, Mail, User as UserIcon, CheckCircle2, XCircle, Edit2, Trash2, Search, Settings as SettingsIcon, Plus, X, Lock, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUsers } from '../../application/hooks/useUsers';
import { useRoles } from '../../application/hooks/useRoles';
import { cn } from '../../utils/formatters';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

const AVAILABLE_PERMISSIONS = [
  { id: 'dashboard', label: 'Dashboard', description: 'Acesso ao painel principal e estatísticas' },
  { id: 'students', label: 'Alunos', description: 'Gestão de alunos, matrículas e graduações' },
  { id: 'instructors', label: 'Professores', description: 'Gestão de professores e instrutores' },
  { id: 'classes', label: 'Aulas', description: 'Criação e gestão de horários de aulas' },
  { id: 'mensalidades', label: 'Mensalidades', description: 'Controle de pagamentos de alunos' },
  { id: 'finance', label: 'Financeiro', description: 'Gestão de despesas e fluxo de caixa completo' },
  { id: 'inventory', label: 'Estoque', icon: 'ShoppingCart', description: 'Controle de produtos e vendas' },
  { id: 'users', label: 'Usuários', description: 'Gestão de acessos e cargos do sistema' },
  { id: 'settings', label: 'Configurações', description: 'Configurações gerais da academia' },
  { id: 'checkin', label: 'Check-in', description: 'Acesso ao módulo de check-in' },
  { id: 'reports', label: 'Relatórios', description: 'Visualização de relatórios detalhados' }
];

export const UsersView = () => {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'roles'>('users');
  const [searchTerm, setSearchTerm] = useState("");
  const { isAdmin } = useAuth();
  const { users, updateUser, deleteUser } = useUsers(true);
  const { roles, addRole, updateRole, deleteRole } = useRoles(isAdmin);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [roleFormData, setRoleFormData] = useState({
    name: '',
    permissions: AVAILABLE_PERMISSIONS.reduce((acc, curr) => ({ ...acc, [curr.id]: false }), {} as any)
  });

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await updateUser(userId, { role: newRole });
      toast.success("Cargo atualizado!");
    } catch (error) {
      toast.error("Erro ao atualizar cargo.");
    }
  };

  const handleToggleApproval = async (userId: string, currentStatus: boolean) => {
    try {
      await updateUser(userId, { approved: !currentStatus });
      toast.success(!currentStatus ? "Usuário aprovado!" : "Acesso revogado!");
    } catch (error) {
      toast.error("Erro ao alterar status.");
    }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRole) {
        await updateRole(editingRole.id, roleFormData);
        toast.success("Cargo atualizado!");
      } else {
        await addRole(roleFormData);
        toast.success("Cargo criado!");
      }
      setIsRoleModalOpen(false);
      setEditingRole(null);
      setRoleFormData({
        name: '',
        permissions: AVAILABLE_PERMISSIONS.reduce((acc, curr) => ({ ...acc, [curr.id]: false }), {} as any)
      });
    } catch (error) {
      toast.error("Erro ao salvar cargo.");
    }
  };

  const handleEditRole = (role: any) => {
    setEditingRole(role);
    setRoleFormData({
      name: role.name,
      permissions: {
        ...AVAILABLE_PERMISSIONS.reduce((acc, curr) => ({ ...acc, [curr.id]: false }), {} as any),
        ...(role.permissions || {})
      }
    });
    setIsRoleModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-black italic uppercase tracking-tighter">Acessos</h1>
          <p className="text-gray-500 font-medium">Gerencie usuários, cargos e permissões do sistema.</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-2xl">
          <button 
            onClick={() => setActiveSubTab('users')}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeSubTab === 'users' ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-gray-600"
            )}
          >
            Usuários
          </button>
          <button 
            onClick={() => setActiveSubTab('roles')}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeSubTab === 'roles' ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-gray-600"
            )}
          >
            Cargos
          </button>
        </div>
      </header>

      {activeSubTab === 'users' ? (
        <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-[32px]">
          <div className="relative mb-8">
            <Search className="absolute w-5 h-5 text-gray-400 left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar usuários..." 
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-50">
                  <th className="pb-4 px-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Usuário</th>
                  <th className="pb-4 px-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Cargo</th>
                  <th className="pb-4 px-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                  <th className="pb-4 px-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="group hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 font-bold overflow-hidden">
                          {user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" alt="" /> : user.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{user.name}</p>
                          <p className="text-[10px] text-gray-400 font-medium">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <select 
                        className="bg-transparent border-none text-xs font-bold text-gray-600 focus:ring-0 cursor-pointer"
                        value={user.role || 'user'}
                        onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                      >
                        <optgroup label="Cargos Padrão">
                          <option value="admin">Administrador</option>
                          <option value="receptionist">Recepção</option>
                          <option value="professor">Professor</option>
                          <option value="user">Aluno</option>
                          <option value="checkin_tablet">Tablet Check-in</option>
                        </optgroup>
                        {roles.length > 0 && (
                          <optgroup label="Cargos Personalizados">
                            {roles.map(r => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </td>
                    <td className="py-4 px-4">
                      <button 
                        onClick={() => handleToggleApproval(user.id, user.approved)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                          user.approved ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        )}
                      >
                        {user.approved ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {user.approved ? 'Aprovado' : 'Pendente'}
                      </button>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button 
                        onClick={async () => {
                          if (confirm("Excluir este usuário permanentemente?")) {
                            await deleteUser(user.id);
                            toast.success("Usuário removido");
                          }
                        }}
                        className="p-2 text-gray-300 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <button 
              onClick={() => {
                setEditingRole(null);
                setRoleFormData({
                  name: '',
                  permissions: AVAILABLE_PERMISSIONS.reduce((acc, curr) => ({ ...acc, [curr.id]: false }), {} as any)
                });
                setIsRoleModalOpen(true);
              }}
              className="p-8 border-2 border-dashed border-gray-200 rounded-[32px] flex flex-col items-center justify-center gap-4 hover:border-black hover:bg-gray-50 transition-all group"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-black group-hover:text-white transition-all">
                <Plus className="w-6 h-6" />
              </div>
              <p className="text-sm font-black uppercase italic tracking-widest">Novo Cargo</p>
            </button>

            {roles.map(role => (
              <div key={role.id} className="p-8 bg-white border border-gray-100 rounded-[32px] shadow-sm hover:shadow-xl transition-all relative group">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-black">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEditRole(role)}
                      className="p-2 text-gray-400 hover:text-black transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={async () => {
                        if (confirm(`Excluir o cargo "${role.name}"?`)) {
                          await deleteRole(role.id);
                          toast.success("Cargo excluído");
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h3 className="text-xl font-black text-black italic uppercase tracking-tighter mb-2">{role.name}</h3>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                  {Object.values(role.permissions || {}).filter(v => v === true).length} Permissões Ativas
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {isRoleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsRoleModalOpen(false)} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div>
                  <h2 className="text-2xl font-black text-black italic uppercase tracking-tighter">
                    {editingRole ? 'Editar Cargo' : 'Novo Cargo'}
                  </h2>
                  <p className="text-sm text-gray-500 font-medium">Defina o nome e as permissões de acesso.</p>
                </div>
                <button 
                  onClick={() => setIsRoleModalOpen(false)}
                  className="p-3 bg-white rounded-2xl shadow-sm text-gray-400 hover:text-black transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSaveRole} className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Nome do Cargo</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Ex: Consultor Técnico"
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 outline-none transition-all font-bold"
                    value={roleFormData.name}
                    onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Permissões de Módulo</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {AVAILABLE_PERMISSIONS.map(permission => (
                      <button
                        key={permission.id}
                        type="button"
                        onClick={() => setRoleFormData({
                          ...roleFormData,
                          permissions: {
                            ...roleFormData.permissions,
                            [permission.id]: !roleFormData.permissions[permission.id]
                          }
                        })}
                        className={cn(
                          "flex items-start gap-4 p-4 rounded-3xl border-2 transition-all text-left group",
                          roleFormData.permissions[permission.id] 
                            ? "bg-black border-black text-white shadow-lg" 
                            : "bg-white border-gray-50 text-gray-900 hover:border-gray-200"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                          roleFormData.permissions[permission.id] ? "bg-white/10" : "bg-gray-50 text-gray-400"
                        )}>
                          {roleFormData.permissions[permission.id] ? <Check className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="text-sm font-black uppercase italic tracking-tighter leading-tight">{permission.label}</p>
                          <p className={cn(
                            "text-[10px] font-bold mt-1 leading-snug",
                            roleFormData.permissions[permission.id] ? "text-gray-400" : "text-gray-400"
                          )}>
                            {permission.description}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full py-5 bg-black text-white font-black rounded-[24px] hover:bg-gray-800 transition-all uppercase italic tracking-widest shadow-xl flex items-center justify-center gap-3"
                >
                  <Check className="w-6 h-6" />
                  {editingRole ? 'Atualizar Cargo' : 'Criar Cargo'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
