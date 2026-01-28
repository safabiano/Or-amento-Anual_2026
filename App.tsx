
import React, { useState, useEffect, useMemo } from 'react';
import { AnnualBudget, MonthlyData, BudgetEntry } from './types';
import { MONTHS, INCOME_CATEGORIES, EXPENSE_CATEGORIES, CURRENCY_FORMATTER } from './constants';
import BudgetTable from './components/BudgetTable';
import { getFinancialInsights } from './services/geminiService';
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

  // Função para comprimir e gerar link
  const handleShare = () => {
    try {
      const dataString = JSON.stringify(budget);
      const encodedData = btoa(encodeURIComponent(dataString));
      const shareUrl = `${window.location.origin}${window.location.pathname}#data=${encodedData}`;
      
      navigator.clipboard.writeText(shareUrl).then(() => {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      });
    } catch (e) {
      alert("Erro ao gerar link de compartilhamento. Os dados podem estar muito grandes.");
    }
  };

  useEffect(() => {
    setIsMounted(true);
    
    // 1. Tentar carregar dados da URL (Prioridade)
    const hash = window.location.hash;
    if (hash.startsWith('#data=')) {
      try {
        const encodedData = hash.replace('#data=', '');
        const decodedData = decodeURIComponent(atob(encodedData));
        const parsedBudget = JSON.parse(decodedData);
        
        if (parsedBudget[CURRENT_YEAR]) {
          const confirmImport = window.confirm("Dados detectados no link! Deseja carregar esta versão da planilha? (Isso substituirá seus dados locais atuais)");
          if (confirmImport) {
            setBudget(parsedBudget);
            // Limpa o hash para evitar recargas acidentais
            window.history.replaceState(null, "", window.location.pathname);
            return;
          }
        }
      } catch (e) {
        console.error("Erro ao processar dados da URL");
      }
    }

    // 2. Se não houver dados na URL, carregar do LocalStorage
    try {
      const saved = localStorage.getItem('budget_data_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed[CURRENT_YEAR]) {
          setBudget(parsed);
        }
      }
    } catch (e) {
      console.warn("Falha ao carregar dados locais.");
    }
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('budget_data_v1', JSON.stringify(budget));
    }
  }, [budget, isMounted]);

  const monthData = useMemo(() => {
    return budget[CURRENT_YEAR].find(m => m.month === currentMonth) || budget[CURRENT_YEAR][0];
  }, [budget, currentMonth]);

  const annualSummary = useMemo(() => {
    return budget[CURRENT_YEAR].map(m => {
      const income = m.income.reduce((sum, item) => sum + item.amount, 0);
      const expenses = m.expenses.reduce((sum, item) => sum + item.amount, 0);
      return {
        name: MONTHS[m.month].substring(0, 3),
        renda: income,
        despesa: expenses,
        saldo: income - expenses
      };
    });
  }, [budget]);

  const totalAnnualIncome = annualSummary.reduce((sum, item) => sum + item.renda, 0);
  const totalAnnualExpenses = annualSummary.reduce((sum, item) => sum + item.despesa, 0);
  const totalAnnualBalance = totalAnnualIncome - totalAnnualExpenses;

  const handleAddEntry = (type: 'income' | 'expenses', entry: Omit<BudgetEntry, 'id'>) => {
    setBudget(prev => {
      const newBudget = { ...prev };
      const monthIdx = newBudget[CURRENT_YEAR].findIndex(m => m.month === currentMonth);
      const newEntry = { ...entry, id: crypto.randomUUID() };
      newBudget[CURRENT_YEAR][monthIdx][type].push(newEntry);
      return { ...newBudget };
    });
  };

  const handleDeleteEntry = (type: 'income' | 'expenses', id: string) => {
    setBudget(prev => {
      const newBudget = { ...prev };
      const monthIdx = newBudget[CURRENT_YEAR].findIndex(m => m.month === currentMonth);
      newBudget[CURRENT_YEAR][monthIdx][type] = newBudget[CURRENT_YEAR][monthIdx][type].filter(e => e.id !== id);
      return { ...newBudget };
    });
  };

  const expenseByCategory = useMemo(() => {
    const categories: Record<string, number> = {};
    monthData.expenses.forEach(e => {
      categories[e.category] = (categories[e.category] || 0) + e.amount;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [monthData]);

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-6 py-3 rounded-full text-sm font-bold shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
          Link de sincronização copiado!
        </div>
      )}

      <header className="bg-indigo-700 text-white shadow-lg sticky top-0 z-50 backdrop-blur-xl bg-opacity-90 border-b border-indigo-600/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="p-2 bg-white/20 rounded-xl shrink-0">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-black tracking-tight leading-tight">Controle de Despesas e Orçamento {CURRENT_YEAR}</h1>
              <p className="text-[10px] text-indigo-100 uppercase tracking-widest font-bold opacity-80">Gestão Patrimonial</p>
            </div>
            <button 
              onClick={handleShare}
              className="ml-2 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors group relative"
              title="Compartilhar link desta versão"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>

          <div className="flex bg-black/10 p-1 rounded-2xl w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('month')}
              className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'month' ? 'bg-white text-indigo-700 shadow-md' : 'text-indigo-50 hover:bg-white/5'}`}
            >
              MÊS
            </button>
            <button
              onClick={() => setActiveTab('year')}
              className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'year' ? 'bg-white text-indigo-700 shadow-md' : 'text-indigo-50 hover:bg-white/5'}`}
            >
              ANO
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 w-full flex-1 mb-12">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-8 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-amber-800 font-medium leading-relaxed">
            <strong>Dica de Sincronização:</strong> Como os dados são salvos no seu navegador, para que outras pessoas vejam suas atualizações, você deve clicar no ícone de <span className="inline-block px-1.5 py-0.5 bg-amber-100 rounded">compartilhar</span> no topo e enviar o novo link.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-200/60">
            <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2">Entradas Anuais</p>
            <h2 className="text-2xl font-black text-emerald-600 tracking-tighter">{CURRENCY_FORMATTER.format(totalAnnualIncome)}</h2>
          </div>
          <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-200/60">
            <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2">Saídas Anuais</p>
            <h2 className="text-2xl font-black text-rose-600 tracking-tighter">{CURRENCY_FORMATTER.format(totalAnnualExpenses)}</h2>
          </div>
          <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-200/60">
            <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2">Saldo Geral</p>
            <h2 className={`text-2xl font-black tracking-tighter ${totalAnnualBalance >= 0 ? 'text-indigo-600' : 'text-amber-600'}`}>
              {CURRENCY_FORMATTER.format(totalAnnualBalance)}
            </h2>
          </div>
        </div>

        {activeTab === 'month' ? (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide snap-x">
              {MONTHS.map((name, idx) => (
                <button
                  key={name}
                  onClick={() => setCurrentMonth(idx)}
                  className={`flex-shrink-0 px-6 py-3 rounded-2xl text-xs font-bold transition-all snap-start border ${
                    currentMonth === idx 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' 
                    : 'bg-white text-slate-500 border-slate-200'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <BudgetTable
                title={`Entradas • ${MONTHS[currentMonth]}`}
                type="income"
                entries={monthData.income}
                categories={INCOME_CATEGORIES}
                onAdd={(entry) => handleAddEntry('income', entry)}
                onDelete={(id) => handleDeleteEntry('income', id)}
              />
              <BudgetTable
                title={`Saídas • ${MONTHS[currentMonth]}`}
                type="expense"
                entries={monthData.expenses}
                categories={EXPENSE_CATEGORIES}
                onAdd={(entry) => handleAddEntry('expenses', entry)}
                onDelete={(id) => handleDeleteEntry('expenses', id)}
              />
            </div>

            {expenseByCategory.length > 0 && (
              <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200/60">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8">Composição do Mês</h3>
                <div className="w-full h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={8}
                        dataKey="value"
                        stroke="none"
                      >
                        {expenseByCategory.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(v) => CURRENCY_FORMATTER.format(v as number)}
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                      />
                      <Legend verticalAlign="bottom" align="center" iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-700">
            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200/60 overflow-hidden">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8">Fluxo Anual</h3>
              <div className="w-full h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={annualSummary} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip 
                      formatter={(v) => CURRENCY_FORMATTER.format(v as number)}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                    />
                    <Legend iconType="circle" verticalAlign="top" align="right" />
                    <Bar dataKey="renda" name="Renda" fill="#10b981" radius={[6, 6, 0, 0]} barSize={24} />
                    <Bar dataKey="despesa" name="Despesa" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="py-12 text-center text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
        Controle de Despesas e Orçamento &copy; {CURRENT_YEAR}
      </footer>
    </div>
  );
};

export default App;
