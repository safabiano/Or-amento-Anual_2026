
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
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
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

const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

const App: React.FC = () => {
  const [budget, setBudget] = useState<AnnualBudget>(INITIAL_BUDGET);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [activeTab, setActiveTab] = useState<'month' | 'year'>('month');
  const [isMounted, setIsMounted] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          monthData.income.forEach(incomingIncome => {
            const exists = merged[year][targetMonthIdx].income.some((i: BudgetEntry) => i.id === incomingIncome.id);
            if (!exists) merged[year][targetMonthIdx].income.push(incomingIncome);
          });
          monthData.expenses.forEach(incomingExpense => {
            const exists = merged[year][targetMonthIdx].expenses.some((e: BudgetEntry) => e.id === incomingExpense.id);
            if (!exists) merged[year][targetMonthIdx].expenses.push(incomingExpense);
          });
        }
      });
    });
    return merged;
  };

  const exportToDrive = () => {
    const dataStr = JSON.stringify(budget, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `Controle_Financeiro_${CURRENT_YEAR}.json`);
    linkElement.click();
  };

  const importFromDrive = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = event.target.files;
    if (!files || files.length === 0) return;
    fileReader.readAsText(files[0], "UTF-8");
    fileReader.onload = e => {
      try {
        const result = JSON.parse(e.target?.result as string);
        if (result[CURRENT_YEAR]) {
          if (window.confirm("Deseja MESCLAR os dados?")) setBudget(prev => mergeBudgets(prev, result));
          else if (window.confirm("Deseja SUBSTITUIR tudo?")) setBudget(result);
        }
      } catch (err) { alert("Erro ao ler o arquivo."); }
    };
    event.target.value = '';
  };

  const handleShare = () => {
    try {
      const compactData = budget[CURRENT_YEAR].filter(m => m.income.length > 0 || m.expenses.length > 0).map(m => [
        m.month,
        m.income.map(i => [INCOME_CATEGORIES.indexOf(i.category), i.description, i.amount, i.paid ? 1 : 0, i.id]),
        m.expenses.map(e => [EXPENSE_CATEGORIES.indexOf(e.category), e.description, e.amount, e.paid ? 1 : 0, e.id])
      ]);
      const encoded = btoa(encodeURIComponent(JSON.stringify(compactData)));
      navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#v2=${encoded}`).then(() => {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      });
    } catch (e) { alert("Erro ao gerar link."); }
  };

  useEffect(() => {
    setIsMounted(true);
    const hash = window.location.hash;
    if (hash.startsWith('#v2=')) {
      try {
        const decoded = JSON.parse(decodeURIComponent(atob(hash.replace('#v2=', ''))));
        const incoming: AnnualBudget = JSON.parse(JSON.stringify(INITIAL_BUDGET));
        decoded.forEach(([mIdx, inc, exp]: any) => {
          const idx = incoming[CURRENT_YEAR].findIndex(m => m.month === mIdx);
          if (idx !== -1) {
            incoming[CURRENT_YEAR][idx].income = inc.map(([c, d, v, p, id]: any) => ({ id: id || crypto.randomUUID(), category: INCOME_CATEGORIES[c] ?? c, description: d, amount: v, paid: p === 1 }));
            incoming[CURRENT_YEAR][idx].expenses = exp.map(([c, d, v, p, id]: any) => ({ id: id || crypto.randomUUID(), category: EXPENSE_CATEGORIES[c] ?? c, description: d, amount: v, paid: p === 1 }));
          }
        });
        if (window.confirm("Mesclar dados recebidos?")) setBudget(prev => mergeBudgets(prev, incoming));
        window.history.replaceState(null, "", window.location.pathname);
      } catch (e) { console.error(e); }
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) try { setBudget(JSON.parse(saved)); } catch (e) {}
  }, []);

  useEffect(() => { if (isMounted) localStorage.setItem(STORAGE_KEY, JSON.stringify(budget)); }, [budget, isMounted]);

  const monthData = useMemo(() => budget[CURRENT_YEAR].find(m => m.month === currentMonth) || budget[CURRENT_YEAR][0], [budget, currentMonth]);
  
  const monthSummary = useMemo(() => {
    const incT = monthData.income.reduce((s, i) => s + i.amount, 0);
    const incP = incT - monthData.income.filter(i => i.paid).reduce((s, i) => s + i.amount, 0);
    const expT = monthData.expenses.reduce((s, e) => s + e.amount, 0);
    const expP = expT - monthData.expenses.filter(e => e.paid).reduce((s, e) => s + e.amount, 0);
    return { incT, incP, expT, expP, balance: incT - expT };
  }, [monthData]);

  const annualSummary = useMemo(() => budget[CURRENT_YEAR].map(m => {
    const inc = m.income.reduce((s, i) => s + i.amount, 0);
    const exp = m.expenses.reduce((s, e) => s + e.amount, 0);
    return { name: MONTHS[m.month].substring(0, 3), renda: inc, despesa: exp, saldo: inc - exp };
  }), [budget]);

  const handleAddEntry = (type: 'income' | 'expenses', entry: Omit<BudgetEntry, 'id'>) => {
    setBudget(prev => {
      const nb = { ...prev };
      const idx = nb[CURRENT_YEAR].findIndex(m => m.month === currentMonth);
      nb[CURRENT_YEAR][idx][type].push({ ...entry, id: crypto.randomUUID() });
      return nb;
    });
  };

  const handleUpdateEntry = (type: 'income' | 'expenses', updated: BudgetEntry) => {
    setBudget(prev => {
      const nb = { ...prev };
      const idx = nb[CURRENT_YEAR].findIndex(m => m.month === currentMonth);
      nb[CURRENT_YEAR][idx][type] = nb[CURRENT_YEAR][idx][type].map(e => e.id === updated.id ? updated : e);
      return nb;
    });
  };

  const handleDeleteEntry = (type: 'income' | 'expenses', id: string) => {
    setBudget(prev => {
      const nb = { ...prev };
      const idx = nb[CURRENT_YEAR].findIndex(m => m.month === currentMonth);
      nb[CURRENT_YEAR][idx][type] = nb[CURRENT_YEAR][idx][type].filter(e => e.id !== id);
      return nb;
    });
  };

  const handleToggleStatus = (type: 'income' | 'expenses', id: string) => {
    setBudget(prev => {
      const nb = { ...prev };
      const idx = nb[CURRENT_YEAR].findIndex(m => m.month === currentMonth);
      nb[CURRENT_YEAR][idx][type] = nb[CURRENT_YEAR][idx][type].map(e => e.id === id ? { ...e, paid: !e.paid } : e);
      return nb;
    });
  };

  const expenseByCategory = useMemo(() => {
    const cats: Record<string, number> = {};
    monthData.expenses.forEach(e => cats[e.category] = (cats[e.category] || 0) + e.amount);
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [monthData]);

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {showToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-6 py-3 rounded-full text-sm font-bold shadow-2xl flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
          Link copiado com sucesso!
        </div>
      )}

      <header className="bg-indigo-700 text-white shadow-lg sticky top-0 z-50 py-4 border-b border-indigo-600/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg></div>
            <div><h1 className="text-lg font-black tracking-tight">Orçamento {CURRENT_YEAR}</h1><p className="text-[10px] uppercase opacity-70">Edição Ativada</p></div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleShare} className="bg-emerald-500 px-4 py-2 rounded-xl text-xs font-black shadow-lg">COPIAR LINK</button>
            <div className="bg-black/10 p-1 rounded-2xl">
              <button onClick={() => setActiveTab('month')} className={`px-4 py-2 rounded-xl text-xs font-bold ${activeTab === 'month' ? 'bg-white text-indigo-700 shadow-md' : 'text-indigo-50'}`}>MÊS</button>
              <button onClick={() => setActiveTab('year')} className={`px-4 py-2 rounded-xl text-xs font-bold ${activeTab === 'year' ? 'bg-white text-indigo-700 shadow-md' : 'text-indigo-50'}`}>ANO</button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 flex-1 mb-12">
        {activeTab === 'month' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-[24px] border border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase">Entradas {MONTHS[currentMonth]}</p>
                <h2 className="text-2xl font-black text-emerald-600">{CURRENCY_FORMATTER.format(monthSummary.incT)}</h2>
              </div>
              <div className="bg-white p-6 rounded-[24px] border border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase">Saídas {MONTHS[currentMonth]}</p>
                <h2 className="text-2xl font-black text-rose-600">{CURRENCY_FORMATTER.format(monthSummary.expT)}</h2>
              </div>
              <div className="bg-white p-6 rounded-[24px] border border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase">Saldo</p>
                <h2 className={`text-2xl font-black ${monthSummary.balance >= 0 ? 'text-indigo-600' : 'text-amber-600'}`}>{CURRENCY_FORMATTER.format(monthSummary.balance)}</h2>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {MONTHS.map((m, i) => (
                <button key={m} onClick={() => setCurrentMonth(i)} className={`shrink-0 px-6 py-3 rounded-2xl text-xs font-bold border transition-all ${currentMonth === i ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-500 border-slate-200'}`}>{m}</button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <BudgetTable 
                title={`Entradas • ${MONTHS[currentMonth]}`} 
                type="income" 
                entries={monthData.income} 
                categories={INCOME_CATEGORIES} 
                onAdd={(e) => handleAddEntry('income', e)} 
                onUpdate={(e) => handleUpdateEntry('income', e)}
                onDelete={(id) => handleDeleteEntry('income', id)} 
                onToggleStatus={(id) => handleToggleStatus('income', id)} 
              />
              <BudgetTable 
                title={`Saídas • ${MONTHS[currentMonth]}`} 
                type="expense" 
                entries={monthData.expenses} 
                categories={EXPENSE_CATEGORIES} 
                onAdd={(e) => handleAddEntry('expenses', e)} 
                onUpdate={(e) => handleUpdateEntry('expenses', e)}
                onDelete={(id) => handleDeleteEntry('expenses', id)} 
                onToggleStatus={(id) => handleToggleStatus('expenses', id)} 
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[32px] border border-slate-200 h-[400px]">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-8">Evolução Anual</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={annualSummary}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => CURRENCY_FORMATTER.format(v as number)} />
                  <Bar dataKey="renda" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesa" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </main>

      <footer className="py-8 text-center"><button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors">Importar/Exportar Backup</button><input type="file" ref={fileInputRef} onChange={importFromDrive} accept=".json" className="hidden" /></footer>
    </div>
  );
};

export default App;
