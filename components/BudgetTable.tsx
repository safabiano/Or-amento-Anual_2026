
import React, { useState } from 'react';
import { BudgetEntry } from '../types';
import { CURRENCY_FORMATTER } from '../constants';

interface BudgetTableProps {
  title: string;
  entries: BudgetEntry[];
  categories: string[];
  type: 'income' | 'expense';
  onAdd: (entry: Omit<BudgetEntry, 'id'>) => void;
  onDelete: (id: string) => void;
  onToggleStatus?: (id: string) => void;
}

const BudgetTable: React.FC<BudgetTableProps> = ({ title, entries, categories, type, onAdd, onDelete, onToggleStatus }) => {
  const [newEntry, setNewEntry] = useState({ category: categories[0], description: '', amount: 0 });
  const [customCategory, setCustomCategory] = useState('');
  const [isCustom, setIsCustom] = useState(false);

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
      onAdd({
        ...newEntry,
        category: finalCategory,
        paid: type === 'income' // Entradas costumam ser consideradas recebidas por padrão
      });
      setNewEntry({ category: categories[0], description: '', amount: 0 });
      setCustomCategory('');
      setIsCustom(false);
    }
  };

  const total = entries.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full transform transition-transform duration-200">
      <div className={`px-4 sm:px-6 py-4 border-b border-slate-100 flex justify-between items-center ${type === 'income' ? 'bg-emerald-50/50' : 'bg-rose-50/50'}`}>
        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm sm:text-base">
          {type === 'income' ? (
            <div className="p-1.5 bg-emerald-100 rounded-lg shrink-0">
              <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          ) : (
            <div className="p-1.5 bg-rose-100 rounded-lg shrink-0">
              <svg className="w-4 h-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
              </svg>
            </div>
          )}
          <span className="truncate tracking-tight">{title}</span>
        </h3>
        <span className={`font-black text-sm sm:text-base whitespace-nowrap tracking-tight ${type === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>
          {CURRENCY_FORMATTER.format(total)}
        </span>
      </div>

      <div className="p-4 sm:p-6 flex-1 flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="relative">
              {!isCustom ? (
                <>
                  <select
                    value={newEntry.category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full rounded-xl bg-blue-50 border-transparent text-sm text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all h-12 px-4 shadow-inner appearance-none"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="NEW_CUSTOM" className="text-indigo-600 font-bold">+ Nova Categoria...</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Qual categoria?"
                    autoFocus
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full rounded-xl bg-indigo-50 border-indigo-200 border text-sm text-slate-700 font-bold placeholder-indigo-300 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all h-12 px-4 shadow-inner pr-10"
                  />
                  <button 
                    type="button"
                    onClick={() => setIsCustom(false)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              )}
            </div>
            <input
              type="text"
              placeholder="Descrição"
              value={newEntry.description}
              onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
              className="w-full rounded-xl bg-blue-50 border-transparent text-sm text-slate-700 font-medium placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all h-12 px-4 shadow-inner"
            />
            <input
              type="number"
              step="0.01"
              placeholder="R$ 0,00"
              value={newEntry.amount || ''}
              onChange={(e) => setNewEntry({ ...newEntry, amount: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-xl bg-blue-50 border-transparent text-sm text-slate-700 font-medium placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all h-12 px-4 shadow-inner"
            />
          </div>
          <button
            type="submit"
            className={`w-full rounded-xl px-4 py-4 text-white text-xs sm:text-sm font-black uppercase tracking-widest transition-all shadow-md active:scale-[0.97] touch-manipulation ${
              type === 'income' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-100'
            }`}
          >
            Adicionar Lançamento
          </button>
        </form>

        <div className="overflow-x-auto scrollbar-hide -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle px-4 sm:px-0">
            <table className="min-w-full text-sm text-left">
              <thead className="text-[10px] text-slate-400 uppercase tracking-widest bg-slate-50/30">
                <tr>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Cat.</th>
                  <th className="px-4 py-3 font-bold">Descrição</th>
                  <th className="px-4 py-3 text-right font-bold">Valor</th>
                  <th className="px-4 py-3 text-right font-bold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry) => (
                  <tr key={entry.id} className={`hover:bg-slate-50/50 transition-colors ${entry.paid ? 'bg-emerald-50/20' : ''}`}>
                    <td className="px-4 py-4">
                      <button 
                        onClick={() => onToggleStatus?.(entry.id)}
                        className={`p-1.5 rounded-lg transition-all border ${
                          entry.paid 
                            ? 'bg-emerald-100 border-emerald-200 text-emerald-600' 
                            : 'bg-slate-100 border-slate-200 text-slate-400'
                        }`}
                        title={entry.paid ? 'Marcar como Pendente' : 'Marcar como Pago'}
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                      </button>
                    </td>
                    <td className="px-4 py-4 font-bold text-slate-600 whitespace-nowrap text-xs">
                      <span className="inline-block px-2 py-0.5 bg-slate-100 rounded-md">{entry.category}</span>
                    </td>
                    <td className="px-4 py-4 text-slate-500 min-w-[120px] text-xs font-medium">{entry.description}</td>
                    <td className="px-4 py-4 text-right font-black text-slate-800 whitespace-nowrap text-xs">{CURRENCY_FORMATTER.format(entry.amount)}</td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => onDelete(entry.id)}
                        className="text-slate-300 hover:text-rose-600 transition-all p-2 rounded-xl hover:bg-rose-50 active:bg-rose-100 touch-manipulation"
                        title="Remover"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-300 italic text-xs font-medium">
                      Sem registros
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetTable;
