
import React, { useState } from 'react';
import { BudgetEntry, Category } from '../types';
import { CURRENCY_FORMATTER } from '../constants';

interface BudgetTableProps {
  title: string;
  entries: BudgetEntry[];
  categories: string[];
  type: 'income' | 'expense';
  onAdd: (entry: Omit<BudgetEntry, 'id'>) => void;
  onDelete: (id: string) => void;
}

const BudgetTable: React.FC<BudgetTableProps> = ({ title, entries, categories, type, onAdd, onDelete }) => {
  const [newEntry, setNewEntry] = useState({ category: categories[0], description: '', amount: 0 });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEntry.description && newEntry.amount > 0) {
      onAdd(newEntry);
      setNewEntry({ category: categories[0], description: '', amount: 0 });
    }
  };

  const total = entries.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className={`px-4 sm:px-6 py-4 border-b border-slate-100 flex justify-between items-center ${type === 'income' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
        <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-sm sm:text-base">
          {type === 'income' ? (
            <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          )}
          <span className="truncate">{title}</span>
        </h3>
        <span className={`font-bold text-sm sm:text-base whitespace-nowrap ${type === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>
          {CURRENCY_FORMATTER.format(total)}
        </span>
      </div>

      <div className="p-4 sm:p-6 flex-1 flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={newEntry.category}
              onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value })}
              className="w-full rounded-lg bg-blue-50 border-blue-100 text-sm text-slate-700 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-colors h-11 px-3"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Descrição"
              value={newEntry.description}
              onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
              className="w-full rounded-lg bg-blue-50 border-blue-100 text-sm text-slate-700 placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-colors h-11 px-3"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Valor"
              value={newEntry.amount || ''}
              onChange={(e) => setNewEntry({ ...newEntry, amount: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-lg bg-blue-50 border-blue-100 text-sm text-slate-700 placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-colors h-11 px-3"
            />
          </div>
          <button
            type="submit"
            className={`w-full rounded-lg px-4 py-3 text-white text-sm font-bold transition-all shadow-sm active:scale-[0.98] ${
              type === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            Adicionar Lançamento
          </button>
        </form>

        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                <tr>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">{entry.category}</td>
                    <td className="px-4 py-3 text-slate-600 min-w-[120px]">{entry.description}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">{CURRENCY_FORMATTER.format(entry.amount)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onDelete(entry.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-2 rounded-full hover:bg-rose-50"
                        title="Excluir lançamento"
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
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">
                      Nenhum lançamento.
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
