
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AnnualBudget, MonthlyData, BudgetEntry } from './types';
import { MONTHS, INCOME_CATEGORIES, EXPENSE_CATEGORIES, CURRENCY_FORMATTER } from './constants';
import BudgetTable from './components/BudgetTable';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const CURRENT_YEAR = 2026;
const STORAGE_KEY = 'budget_data_v1';

const INITIAL_BUDGET: AnnualBudget = {
  [CURRENT_YEAR]: Array.from({ length: 12 }, (_, i) => ({
    month: i,
    income: [],
    expenses: []
  }))
};

const App: React.FC = () => {
  const [budget, setBudget] = useState<AnnualBudget>(INITIAL_BUDGET);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [activeTab, setActiveTab] = useState<'month' | 'year'>('month');
  const [isMounted, setIsMounted] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Lógica de Dados ---
  const mergeBudgets = (current: AnnualBudget, incoming: AnnualBudget): AnnualBudget => {
    const merged = JSON.parse(JSON.stringify(current));
    Object.keys(incoming).forEach((yearStr) => {
      const year = parseInt(yearStr);
      if (!merged[year]) {
        merged[year] = incoming[year];
        return;
      }
      incoming[year].forEach((monthData: MonthlyData) => {
        const targetMonthIdx = merged[year].findIndex((m: MonthlyData) => m.month === monthData.month);
        if (targetMonthIdx === -1) {
          merged[year].push(monthData);
        } else {
          // Evitar duplicados por ID
          monthData.income.forEach(inc => {
            if (!merged[year][targetMonthIdx].income.some((i: any) => i.id === inc.id)) 
              merged[year][targetMonthIdx].income.push(inc);
          });
          monthData.expenses.forEach(exp => {
            if (!merged[year][targetMonthIdx].expenses.some((e: any) => e.id === exp.id)) 
              merged[year][targetMonthIdx].expenses.push(exp);
          });
        }
      });
    });
    return merged;
  };

  const exportData = () => {
    const dataStr = JSON.stringify(budget, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Backup_Financeiro_${CURRENT_YEAR}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (window.confirm("Mesclar com dados existentes? (Cancela para substituir tudo)")) {
          setBudget(prev => mergeBudgets(prev, json));
        } else {
          setBudget(json);
        }
      } catch (err) { alert("Arquivo inválido."); }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleShare = () => {
    const compact = budget[CURRENT_YEAR].filter(m => m.income.length > 0 || m.expenses.length > 0);
    const encoded = btoa(encodeURIComponent(JSON.stringify(compact)));
    navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#v2=${encoded}`).then(() => {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    });
  };

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) try { setBudget(JSON.parse(saved)); } catch (e) {}
  }, []);

  useEffect(() => { 
    if (isMounted) localStorage.setItem(STORAGE_KEY, JSON.stringify(budget)); 
  }, [budget, isMounted]);

  // --- Cálculos ---
  const monthData = useMemo(() => budget[CURRENT_YEAR][currentMonth], [budget, currentMonth]);
  
  const monthSummary = useMemo(() => {
    const income = monthData.income.reduce((s, i) => s + i.amount, 0);
    const expenses = monthData.expenses.reduce((s, e) => s + e.amount, 0);
    return { income, expenses, balance: income - expenses };
  }, [monthData]);

  const annualData = useMemo(() => budget[CURRENT_YEAR].map(m => {
    const inc = m.income.reduce((s, i) => s + i.amount, 0);
    const exp = m.expenses.reduce((s, e) => s + e.amount, 0);
    return { 
      name: MONTHS[m.month].substring(0, 3), 
      renda: inc, 
      despesa: exp,
      saldo: inc - exp
    };
  }), [budget]);

  const annualTotals = useMemo(() => {
    return annualData.reduce((acc, curr) => ({
      renda: acc.renda + curr.renda,
      despesa: acc.despesa + curr.despesa
    }), { renda: 0, despesa: 0 });
  }, [annualData]);

  // --- Handlers ---
  const handleAdd = (type: 'income' | 'expenses', entry: any) => {
    setBudget(prev => {
      const nb = { ...prev };
      nb[CURRENT_YEAR][currentMonth][type].push({ ...entry, id: crypto.randomUUID() });
      return nb;
    });
  };

  const handleUpdate = (type: 'income' | 'expenses', updated: any) => {
    setBudget(prev => {
      const nb = { ...prev };
      nb[CURRENT_YEAR][currentMonth][type] = nb[CURRENT_YEAR][currentMonth][type].map((e: any) => e.id === updated.id ? updated : e);
      return nb;
    });
  };

  const handleDelete = (type: 'income' | 'expenses', id: string) => {
    setBudget(prev => {
      const nb = { ...prev };
      nb[CURRENT_YEAR][currentMonth][type] = nb[CURRENT_YEAR][currentMonth][type].filter((e: any) => e.id !== id);
      return nb;
    });
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-6 py-3 rounded-full text-xs font-black shadow-2xl animate-bounce">
          LINK DE COMPARTILHAMENTO COPIADO!
        </div>
      )}

      {/* Modern Header */}
      <header className="bg-indigo-700 text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <span className="font-black tracking-tighter text-lg">PLANNER {CURRENT_YEAR}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-indigo-900/40 p-1 rounded-full flex gap-1">
              <button 
                onClick={() => setActiveTab('month')}
                className={`px-5 py-1.5 rounded-full text-[10px] font-black transition-all ${activeTab === 'month' ? 'bg-white text-indigo-700' : 'text-indigo-200'}`}
              >
                MÊS
              </button>
              <button 
                onClick={() => setActiveTab('year')}
                className={`px-5 py-1.5 rounded-full text-[10px] font-black transition-all ${activeTab === 'year' ? 'bg-white text-indigo-700' : 'text-indigo-200'}`}
              >
                ANO
              </button>
            </div>
            <button onClick={handleShare} className="hidden sm:block bg-emerald-500 hover:bg-emerald-400 p-2 rounded-full transition-colors shadow-lg shadow-emerald-900/20">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeWidth={3} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            </button>
          </div>
        </div>

        {/* Action Bar Sub-Header (Backup) */}
        <div className="bg-indigo-800/50 border-t border-indigo-400/20 px-4 py-2">
          <div className="max-w-7xl mx-auto flex justify-end gap-3">
            <button onClick={exportData} className="text-[9px] font-black flex items-center gap-1.5 hover:text-emerald-300 transition-colors uppercase tracking-widest opacity-80 hover:opacity-100">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Exportar
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="text-[9px] font-black flex items-center gap-1.5 hover:text-emerald-300 transition-colors uppercase tracking-widest opacity-80 hover:opacity-100">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Importar
            </button>
            <input type="file" ref={fileInputRef} onChange={importData} accept=".json" className="hidden" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-4 py-6 flex-1">
        {activeTab === 'month' ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-200 group hover:border-emerald-200 transition-all">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Entradas • {MONTHS[currentMonth]}</p>
                <h3 className="text-3xl font-black text-emerald-600 tracking-tight">{CURRENCY_FORMATTER.format(monthSummary.income)}</h3>
              </div>
              <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-200 group hover:border-rose-200 transition-all">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Saídas • {MONTHS[currentMonth]}</p>
                <h3 className="text-3xl font-black text-rose-600 tracking-tight">{CURRENCY_FORMATTER.format(monthSummary.expenses)}</h3>
              </div>
              <div className="bg-indigo-50 rounded-[24px] p-6 shadow-sm border border-indigo-100">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Saldo Disponível</p>
                <h3 className={`text-3xl font-black tracking-tight ${monthSummary.balance >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>
                  {CURRENCY_FORMATTER.format(monthSummary.balance)}
                </h3>
              </div>
            </div>

            {/* Month Navigator */}
            <div className="relative group">
              <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide snap-x">
                {MONTHS.map((m, i) => (
                  <button 
                    key={m} 
                    onClick={() => setCurrentMonth(i)}
                    className={`shrink-0 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all snap-start ${
                      currentMonth === i ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 ring-4 ring-indigo-50' : 'bg-white text-slate-400 border border-slate-200 hover:border-indigo-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <BudgetTable 
                title="Rendas Mensais" 
                type="income" 
                entries={monthData.income} 
                categories={INCOME_CATEGORIES}
                onAdd={(e) => handleAdd('income', e)}
                onUpdate={(e) => handleUpdate('income', e)}
                onDelete={(id) => handleDelete('income', id)}
                onToggleStatus={(id) => {
                  const entry = monthData.income.find((e:any) => e.id === id);
                  if (entry) handleUpdate('income', { ...entry, paid: !entry.paid });
                }}
              />
              <BudgetTable 
                title="Despesas Mensais" 
                type="expense" 
                entries={monthData.expenses} 
                categories={EXPENSE_CATEGORIES}
                onAdd={(e) => handleAdd('expenses', e)}
                onUpdate={(e) => handleUpdate('expenses', e)}
                onDelete={(id) => handleDelete('expenses', id)}
                onToggleStatus={(id) => {
                  const entry = monthData.expenses.find((e:any) => e.id === id);
                  if (entry) handleUpdate('expenses', { ...entry, paid: !entry.paid });
                }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Annual Totals */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Renda Total {CURRENT_YEAR}</p>
                <h2 className="text-3xl font-black text-emerald-600 tracking-tighter">{CURRENCY_FORMATTER.format(annualTotals.renda)}</h2>
              </div>
              <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Despesa Total {CURRENT_YEAR}</p>
                <h2 className="text-3xl font-black text-rose-600 tracking-tighter">{CURRENCY_FORMATTER.format(annualTotals.despesa)}</h2>
              </div>
              <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Acumulado</p>
                <h2 className={`text-3xl font-black tracking-tighter ${annualTotals.renda - annualTotals.despesa >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                  {CURRENCY_FORMATTER.format(annualTotals.renda - annualTotals.despesa)}
                </h2>
              </div>
            </div>

            {/* Chart Section */}
            <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                <div>
                  <h3 className="text-lg font-black tracking-tight text-slate-800">EVOLUÇÃO ANUAL</h3>
                  <p className="text-xs text-slate-400 font-medium">Comparativo mensal entre entradas e saídas</p>
                </div>
                <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest">
                  <div className="flex items-center gap-2"><span className="w-3 h-3 bg-emerald-500 rounded-sm"></span> Renda</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 bg-rose-500 rounded-sm"></span> Despesa</div>
                </div>
              </div>

              <div className="w-full h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={annualData} 
                    margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                    barGap={8}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} 
                      dy={15}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 10}}
                      tickFormatter={(v) => `R$ ${v > 1000 ? (v/1000).toFixed(0)+'k' : v}`}
                    />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                      formatter={(v: number) => [CURRENCY_FORMATTER.format(v), '']}
                      labelStyle={{ fontWeight: 900, marginBottom: '4px', textTransform: 'uppercase' }}
                    />
                    <Bar dataKey="renda" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
                    <Bar dataKey="despesa" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="py-8 text-center text-[10px] text-slate-300 font-black uppercase tracking-[0.3em]">
        Financial Master &bull; v2.0 &bull; {CURRENT_YEAR}
      </footer>
    </div>
  );
};

export default App;
