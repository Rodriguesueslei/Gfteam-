import React, { useState } from 'react';
import { Shield, Mail, User, CheckCircle2, XCircle, Edit2, Trash2, Search } from 'lucide-react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils/formatters';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface UsersViewProps {
  users: any[];
}

export const UsersView = ({ users }: UsersViewProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const { isAdmin } = useAuth();

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      toast.success("Cargo atualizado!");
    } catch (error) {
      toast.error("Erro ao atualizar cargo.");
    }
  };

  const handleToggleApproval = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { approved: !currentStatus });
      toast.success(!currentStatus ? "Usuário aprovado!" : "Acesso revogado!");
    } catch (error) {
      toast.error("Erro ao alterar status.");
    }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-4xl font-black text-black italic uppercase tracking-tighter">Usuários</h1>
        <p className="text-gray-500 font-medium">Gerencie permissões e acessos ao sistema.</p>
      </header>

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
                      <option value="admin">Administrador</option>
                      <option value="receptionist">Recepção</option>
                      <option value="professor">Professor</option>
                      <option value="user">Aluno</option>
                      <option value="checkin_tablet">Tablet Check-in</option>
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
                          await deleteDoc(doc(db, 'users', user.id));
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
    </div>
  );
};
