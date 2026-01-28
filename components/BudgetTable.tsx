
import React, { useState } from 'react';
import { BudgetEntry } from '../types';
import { CURRENCY_FORMATTER } from '../constants';

interface BudgetTableProps {
  title: string;
  entries: BudgetEntry[];
  categories: string[];
  type: 'income' | 'expense';
  onAdd: (entry: Omit<BudgetEntry, 'id'>) => void;
  onUpdate: (entry: BudgetEntry) => void;
  onDelete: (id: string) => void;
  onToggleStatus?: (id: string) => void;
}

const BudgetTable: React.FC<BudgetTableProps> = ({ 
  title, 
  entries, 
  categories, 
  type, 
  onAdd, 
  onUpdate,
  onDelete, 
  onToggleStatus 
}) => {
  const [newEntry, setNewEntry] = useState({ category: categories[0], description: '', amount: 0 });
  const [customCategory, setCustomCategory] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  // Estados para edição inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<BudgetEntry | null>(null);

  const handleCategoryChange = (val: string) => {
    if (val === 'NEW_CUSTOM') {
      setIsCustom(true);
      setNewEntry({ ...newEntry, category: '' });
    } else {
      setIsCustom(false);
      setNewEntry({ ...newEntry, category: val });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = isCustom ? customCategory : newEntry.category;
    if (finalCategory && newEntry.description && newEntry.amount > 0) {
      onAdd({ ...newEntry, category: finalCategory, paid: type === 'income' });
      setNewEntry({ category: categories[0], description: '', amount: 0 });
      setCustomCategory('');
      setIsCustom(false);
    }
  };

  const startEditing = (entry: BudgetEntry) => {
    setEditingId(entry.id);
    setEditForm({ ...entry });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const saveEdit = () => {
    if (editForm && editForm.description && editForm.amount > 0) {
      onUpdate(editForm);
      setEditingId(null);
      setEditForm(null);
    }
  };

  const total = entries.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className={`px-4 sm:px-6 py-4 border-b border-slate-100 flex justify-between items-center ${type === 'income' ? 'bg-emerald-50/50' : 'bg-rose-50/50'}`}>
        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm sm:text-base tracking-tight">
          <span className={`w-2 h-2 rounded-full ${type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
          {title}
        </h3>
        <span className={`font-black text-sm sm:text-base ${type === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>
          {CURRENCY_FORMATTER.format(total)}
        </span>
      </div>

      <div className="p-4 sm:p-6 flex-1 flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="relative">
              {!isCustom ? (
                <select
                  value={newEntry.category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 border-transparent text-sm text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 h-11 px-4 shadow-inner appearance-none"
                >
                  {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                  <option value="NEW_CUSTOM">+ Outra...</option>
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Categoria"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full rounded-xl bg-indigo-50 border-indigo-200 border text-sm text-slate-700 font-bold h-11 px-4"
                />
              )}
            </div>
            <input
              type="text"
              placeholder="Descrição"
              value={newEntry.description}
              onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
              className="w-full rounded-xl bg-slate-50 border-transparent text-sm h-11 px-4 shadow-inner focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="number"
              step="0.01"
              placeholder="R$ 0,00"
              value={newEntry.amount || ''}
              onChange={(e) => setNewEntry({ ...newEntry, amount: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-xl bg-slate-50 border-transparent text-sm h-11 px-4 shadow-inner focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            className={`w-full rounded-xl py-3 text-white text-xs font-black uppercase tracking-widest shadow-md transition-all active:scale-[0.98] ${
              type === 'income' ? 'bg-emerald-600' : 'bg-rose-600'
            }`}
          >
            Adicionar Lançamento
          </button>
        </form>

        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="min-w-full text-left">
            <thead>
              <tr className="text-[10px] text-slate-400 uppercase tracking-widest bg-slate-50/50">
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Cat.</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((entry) => {
                const isEditing = editingId === entry.id;
                
                return (
                  <tr key={entry.id} className={`transition-colors ${isEditing ? 'bg-indigo-50/50' : (entry.paid ? 'bg-emerald-50/10' : '')}`}>
                    <td className="px-4 py-3">
                      <button 
                        onClick={() => onToggleStatus?.(entry.id)}
                        disabled={isEditing}
                        className={`p-1.5 rounded-lg border transition-all ${
                          entry.paid ? 'bg-emerald-100 border-emerald-200 text-emerald-600' : 'bg-slate-100 border-slate-200 text-slate-400'
                        } ${isEditing ? 'opacity-30' : ''}`}
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      </button>
                    </td>
                    
                    <td className="px-4 py-3 text-xs">
                      {isEditing ? (
                        <input 
                          type="text" 
                          value={editForm?.category} 
                          onChange={e => setEditForm(f => f ? {...f, category: e.target.value} : null)}
                          className="w-20 bg-white border border-slate-200 rounded px-1 py-0.5"
                        />
                      ) : (
                        <span className="font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded uppercase text-[10px]">{entry.category}</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-xs">
                      {isEditing ? (
                        <input 
                          type="text" 
                          value={editForm?.description} 
                          onChange={e => setEditForm(f => f ? {...f, description: e.target.value} : null)}
                          className="w-full bg-white border border-slate-200 rounded px-1 py-0.5"
                        />
                      ) : (
                        <span className="text-slate-500 font-medium">{entry.description}</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right text-xs">
                      {isEditing ? (
                        <input 
                          type="number" 
                          value={editForm?.amount} 
                          onChange={e => setEditForm(f => f ? {...f, amount: parseFloat(e.target.value) || 0} : null)}
                          className="w-20 bg-white border border-slate-200 rounded px-1 py-0.5 text-right"
                        />
                      ) : (
                        <span className="font-black text-slate-800">{CURRENCY_FORMATTER.format(entry.amount)}</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {isEditing ? (
                          <>
                            <button onClick={saveEdit} className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-lg" title="Salvar">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            </button>
                            <button onClick={cancelEditing} className="text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg" title="Cancelar">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEditing(entry)} className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg transition-colors" title="Editar">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={() => onDelete(entry.id)} className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition-colors" title="Excluir">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {entries.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-300 italic text-xs">Sem registros</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BudgetTable;
