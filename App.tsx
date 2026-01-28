
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

  // --- Lógica de Sincronização e Backup ---
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
        if (window.confirm("Mesclar com dados existentes? (OK para mesclar, Cancelar para substituir)")) {
          setBudget(prev => mergeBudgets(prev, json));
        } else if (window.confirm("Substituir TODOS os dados atuais pelos do arquivo?")) {
          setBudget(json);
        }
      } catch (err) { alert("Erro ao ler arquivo."); }
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

  // --- Cálculos de Resumo ---
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

  const annualBalance = annualTotals.renda - annualTotals.despesa;

  // --- Handlers de Ação ---
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
      {/* Notificação Toast */}
      {showToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-6 py-3 rounded-full text-xs font-black shadow-2xl animate-bounce">
          LINK COPIADO COM SUCESSO!
        </div>
      )}

      {/* Header Premium */}
      <header className="bg-indigo-700 text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            </div>
            <span className="font-black tracking-tighter text-lg">PLANNER {CURRENT_YEAR}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-indigo-900/40 p-1 rounded-full flex gap-1 border border-white/10">
              <button 
                onClick={() => setActiveTab('month')}
                className={`px-6 py-2 rounded-full text-[10px] font-black transition-all ${activeTab === 'month' ? 'bg-white text-indigo-700 shadow-sm' : 'text-indigo-200'}`}
              >
                MÊS
              </button>
              <button 
                onClick={() => setActiveTab('year')}
                className={`px-6 py-2 rounded-full text-[10px] font-black transition-all ${activeTab === 'year' ? 'bg-white text-indigo-700 shadow-sm' : 'text-indigo-200'}`}
              >
                ANO
              </button>
            </div>
            <button onClick={handleShare} className="bg-emerald-500 hover:bg-emerald-400 p-2.5 rounded-full transition-all shadow-lg active:scale-90">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeWidth={3} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            </button>
          </div>
        </div>

        {/* Barra de Ações de Backup */}
        <div className="bg-indigo-800/60 border-t border-white/5 px-4 py-2">
          <div className="max-w-7xl mx-auto flex justify-end gap-5">
            <button onClick={exportData} className="text-[10px] font-black flex items-center gap-2 hover:text-emerald-300 transition-colors uppercase tracking-widest text-indigo-100">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Exportar Backup
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-black flex items-center gap-2 hover:text-emerald-300 transition-colors uppercase tracking-widest text-indigo-100">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Abrir Backup
            </button>
            <input type="file" ref={fileInputRef} onChange={importData} accept=".json" className="hidden" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-4 py-8 flex-1">
        {activeTab === 'month' ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Cards de Resumo Mensal */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-200 group hover:border-emerald-300 transition-all">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2">Ganhos • {MONTHS[currentMonth]}</p>
                <h3 className="text-3xl font-black text-emerald-600 tracking-tight">{CURRENCY_FORMATTER.format(monthSummary.income)}</h3>
              </div>
              <div className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-200 group hover:border-rose-300 transition-all">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2">Gastos • {MONTHS[currentMonth]}</p>
                <h3 className="text-3xl font-black text-rose-600 tracking-tight">{CURRENCY_FORMATTER.format(monthSummary.expenses)}</h3>
              </div>
              
              {/* CARD DE SALDO / DÍVIDA DINÂMICO */}
              <div className={`rounded-[28px] p-7 shadow-lg border transition-all duration-500 ${
                monthSummary.balance >= 0 
                  ? 'bg-indigo-600 border-indigo-500 text-white' 
                  : 'bg-rose-50 border-rose-300 text-rose-700 ring-4 ring-rose-100/50'
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <p className={`text-[10px] font-black uppercase tracking-[0.15em] ${monthSummary.balance >= 0 ? 'text-indigo-200' : 'text-rose-500'}`}>
                    {monthSummary.balance >= 0 ? 'Saldo Disponível' : 'DÍVIDA / FALTA DE RECURSOS'}
                  </p>
                  {monthSummary.balance < 0 && <span className="text-lg">⚠️</span>}
                  {monthSummary.balance >= 0 && <span className="text-lg opacity-40">💰</span>}
                </div>
                <h3 className="text-3xl font-black tracking-tight">
                  {CURRENCY_FORMATTER.format(monthSummary.balance)}
                </h3>
              </div>
            </div>

            {/* Seletor de Meses */}
            <div className="relative group">
              <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-hide snap-x px-1">
                {MONTHS.map((m, i) => (
                  <button 
                    key={m} 
                    onClick={() => setCurrentMonth(i)}
                    className={`shrink-0 px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all snap-start ${
                      currentMonth === i 
                        ? 'bg-indigo-700 text-white shadow-xl shadow-indigo-200 ring-4 ring-indigo-50' 
                        : 'bg-white text-slate-400 border border-slate-200 hover:border-indigo-300 hover:text-indigo-500 shadow-sm'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div className="absolute right-0 top-0 bottom-6 w-12 bg-gradient-to-l from-slate-50 pointer-events-none rounded-r-2xl"></div>
            </div>

            {/* Tabelas de Lançamento */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <BudgetTable 
                title="Minhas Receitas" 
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
                title="Minhas Despesas" 
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
          <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-700">
            {/* Resumo Anual */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="bg-white p-7 rounded-[28px] border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ganhos no Ano</p>
                <h2 className="text-3xl font-black text-emerald-600 tracking-tighter">{CURRENCY_FORMATTER.format(annualTotals.renda)}</h2>
              </div>
              <div className="bg-white p-7 rounded-[28px] border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gastos no Ano</p>
                <h2 className="text-3xl font-black text-rose-600 tracking-tighter">{CURRENCY_FORMATTER.format(annualTotals.despesa)}</h2>
              </div>
              <div className={`p-7 rounded-[28px] border shadow-md transition-all ${
                annualBalance >= 0 ? 'bg-indigo-700 text-white border-indigo-800' : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${annualBalance >= 0 ? 'text-indigo-200' : 'text-rose-500'}`}>
                  {annualBalance >= 0 ? 'Lucro Acumulado' : 'DÉFICIT / DÍVIDA TOTAL'}
                </p>
                <h2 className="text-3xl font-black tracking-tighter">
                  {CURRENCY_FORMATTER.format(annualBalance)}
                </h2>
              </div>
            </div>

            {/* Gráfico de Evolução Anual */}
            <div className="bg-white p-10 rounded-[36px] border border-slate-200 shadow-sm overflow-hidden min-h-[600px]">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                  <h3 className="text-xl font-black tracking-tight text-slate-800 uppercase">Fluxo de Caixa Mensal</h3>
                  <p className="text-sm text-slate-400 font-medium">Análise visual de rendimentos versus gastos</p>
                </div>
                <div className="flex gap-6 text-[11px] font-black uppercase tracking-[0.2em]">
                  <div className="flex items-center gap-2.5"><span className="w-4 h-4 bg-emerald-500 rounded-md"></span> Renda</div>
                  <div className="flex items-center gap-2.5"><span className="w-4 h-4 bg-rose-500 rounded-md"></span> Despesa</div>
                </div>
              </div>

              <div className="w-full h-[450px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={annualData} 
                    margin={{ top: 10, right: 10, left: 10, bottom: 50 }}
                    barGap={10}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 900}} 
                      dy={25}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}}
                      tickFormatter={(v) => `R$ ${v > 1000 ? (v/1000).toFixed(0)+'k' : v}`}
                    />
                    <Tooltip 
                      cursor={{fill: '#f8fafc', radius: 8}}
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', padding: '16px' }}
                      formatter={(v: number) => [CURRENCY_FORMATTER.format(v), '']}
                      labelStyle={{ fontWeight: 900, marginBottom: '10px', textTransform: 'uppercase', color: '#1e293b', letterSpacing: '0.1em' }}
                    />
                    <Bar dataKey="renda" fill="#10b981" radius={[6, 6, 0, 0]} barSize={32} />
                    <Bar dataKey="despesa" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="py-16 text-center">
        <div className="inline-block px-6 py-2 bg-slate-200/50 rounded-full text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">
          Controle Financeiro &bull; 2026 &bull; Premium Edition
        </div>
      </footer>
    </div>
  );
};

export default App;
