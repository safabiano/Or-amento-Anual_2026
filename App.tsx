
import React, { useState, useEffect, useMemo, useRef } from 'react';
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

  // Função utilitária para mesclar dois orçamentos sem duplicar entradas por ID
  const mergeBudgets = (current: AnnualBudget, incoming: AnnualBudget): AnnualBudget => {
    const merged = JSON.parse(JSON.stringify(current)); // Deep clone
    
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
          // Mesclar Incomes
          monthData.income.forEach(incomingIncome => {
            const exists = merged[year][targetMonthIdx].income.some((i: BudgetEntry) => i.id === incomingIncome.id);
            if (!exists) merged[year][targetMonthIdx].income.push(incomingIncome);
          });
          // Mesclar Expenses
          monthData.expenses.forEach(incomingExpense => {
            const exists = merged[year][targetMonthIdx].expenses.some((e: BudgetEntry) => e.id === incomingExpense.id);
            if (!exists) merged[year][targetMonthIdx].expenses.push(incomingExpense);
          });
        }
      });
    });

    return merged;
  };

  // --- SINCRONIZAÇÃO E ARQUIVOS ---

  const exportToDrive = () => {
    const dataStr = JSON.stringify(budget, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `Controle_Financeiro_${CURRENT_YEAR}_Backup.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importFromDrive = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = event.target.files;
    if (!files || files.length === 0) return;

    fileReader.readAsText(files[0], "UTF-8");
    fileReader.onload = e => {
      try {
        const target = e.target;
        if (!target) return;
        const result = JSON.parse(target.result as string);
        if (result[CURRENT_YEAR]) {
          const choice = window.confirm(
            "Backup carregado!\n\nClique em OK para MESCLAR (manter dados atuais e adicionar os do arquivo).\nClique em CANCELAR se desejar apenas SUBSTITUIR (apaga tudo e usa só o arquivo)."
          );
          
          if (choice) {
            setBudget(prev => mergeBudgets(prev, result));
          } else {
            if (window.confirm("Certeza que deseja SUBSTITUIR? Isso apagará seus dados atuais não salvos.")) {
              setBudget(result);
            }
          }
        }
      } catch (err) {
        alert("Erro ao ler o arquivo de backup.");
      }
    };
    // Reset input para permitir carregar o mesmo arquivo novamente se necessário
    event.target.value = '';
  };

  const handleShare = () => {
    try {
      const compactData = budget[CURRENT_YEAR]
        .filter(m => m.income.length > 0 || m.expenses.length > 0)
        .map(m => [
          m.month,
          m.income.map(i => [INCOME_CATEGORIES.indexOf(i.category), i.description, i.amount, i.paid ? 1 : 0, i.id]),
          m.expenses.map(e => [EXPENSE_CATEGORIES.indexOf(e.category), e.description, e.amount, e.paid ? 1 : 0, e.id])
        ]);

      const dataString = JSON.stringify(compactData);
      const encodedData = btoa(encodeURIComponent(dataString));
      const shareUrl = `${window.location.origin}${window.location.pathname}#v2=${encodedData}`;
      
      navigator.clipboard.writeText(shareUrl).then(() => {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      });
    } catch (e) {
      alert("Erro ao gerar link. Os dados podem estar muito extensos.");
    }
  };

  useEffect(() => {
    setIsMounted(true);
    const hash = window.location.hash;
    
    // Processamento de Link de Sincronização
    if (hash.startsWith('#v2=')) {
      try {
        const encodedData = hash.replace('#v2=', '');
        const decodedData = decodeURIComponent(atob(encodedData));
        const compactData = JSON.parse(decodedData) as any[];
        // Fix: corrected typo INITIAL_BU+DGET to INITIAL_BUDGET
        const incomingBudget: AnnualBudget = JSON.parse(JSON.stringify(INITIAL_BUDGET));
        
        compactData.forEach(([monthIdx, incomeArr, expenseArr]) => {
          const mIdx = incomingBudget[CURRENT_YEAR].findIndex(m => m.month === monthIdx);
          if (mIdx !== -1) {
            incomingBudget[CURRENT_YEAR][mIdx].income = incomeArr.map(([catIdx, desc, val, paidStatus, id]: any) => ({
              id: id || crypto.randomUUID(),
              category: INCOME_CATEGORIES[catIdx] !== undefined ? INCOME_CATEGORIES[catIdx] : (typeof catIdx === 'string' ? catIdx : 'Outros'),
              description: desc,
              amount: val,
              paid: paidStatus === 1
            }));
            incomingBudget[CURRENT_YEAR][mIdx].expenses = expenseArr.map(([catIdx, desc, val, paidStatus, id]: any) => ({
              id: id || crypto.randomUUID(),
              category: EXPENSE_CATEGORIES[catIdx] !== undefined ? EXPENSE_CATEGORIES[catIdx] : (typeof catIdx === 'string' ? catIdx : 'Outros'),
              description: desc,
              amount: val,
              paid: paidStatus === 1
            }));
          }
        });

        const choice = window.confirm(
          "Dados recebidos via link!\n\nDeseja MESCLAR com seus dados atuais? (Recomendado)\nSe cancelar, os dados atuais serão SUBSTITUÍDOS."
        );

        if (choice) {
          setBudget(prev => mergeBudgets(prev, incomingBudget));
        } else {
          if (window.confirm("Deseja SUBSTITUIR seus dados pelos do link?")) {
            setBudget(incomingBudget);
          }
        }
        window.history.replaceState(null, "", window.location.pathname);
      } catch (e) { console.error("Erro importação v2", e); }
    }

    // Carregar dados salvos do LocalStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed[CURRENT_YEAR]) {
          setBudget(parsed);
        }
      }
    } catch (e) {
      console.warn("Nenhum dado prévio encontrado ou erro no parse.");
    }
  }, []);

  // Salvar sempre que o orçamento mudar
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(budget));
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

  const handleToggleStatus = (type: 'income' | 'expenses', id: string) => {
    setBudget(prev => {
      const newBudget = { ...prev };
      const monthIdx = newBudget[CURRENT_YEAR].findIndex(m => m.month === currentMonth);
      newBudget[CURRENT_YEAR][monthIdx][type] = newBudget[CURRENT_YEAR][monthIdx][type].map(e => 
        e.id === id ? { ...e, paid: !e.paid } : e
      );
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
      {showToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-6 py-3 rounded-full text-sm font-bold shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
          Sincronização Ativa (Merge Seguro)!
        </div>
      )}

      <header className="bg-indigo-700 text-white shadow-lg sticky top-0 z-50 backdrop-blur-xl bg-opacity-95 border-b border-indigo-600/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="p-2 bg-white/20 rounded-xl shrink-0">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-black tracking-tight leading-tight">Orçamento {CURRENT_YEAR}</h1>
              <p className="text-[10px] text-indigo-100 uppercase tracking-widest font-bold opacity-80">Proteção de Dados Ativa</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button 
              onClick={handleShare}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-xs font-black shadow-lg transition-all active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              COPIAR LINK
            </button>
            <div className="flex bg-black/10 p-1 rounded-2xl">
              <button
                onClick={() => setActiveTab('month')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'month' ? 'bg-white text-indigo-700 shadow-md' : 'text-indigo-50 hover:bg-white/5'}`}
              >
                MÊS
              </button>
              <button
                onClick={() => setActiveTab('year')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'year' ? 'bg-white text-indigo-700 shadow-md' : 'text-indigo-50 hover:bg-white/5'}`}
              >
                ANO
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 w-full flex-1 mb-12">
        <div className="bg-emerald-50 border border-emerald-200 rounded-[24px] p-5 shadow-sm mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-full">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <div>
              <p className="text-xs font-black text-emerald-800 uppercase tracking-tight">Segurança Anti-Perda</p>
              <p className="text-[10px] text-emerald-700 font-medium">Suas atualizações e backups agora oferecem opção de MESCLAR dados.</p>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={exportToDrive}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-xl text-[10px] font-black hover:bg-black transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              SALVAR BACKUP
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-slate-200 text-slate-600 rounded-xl text-[10px] font-black hover:bg-slate-50 transition-all"
            >
              ABRIR BACKUP
            </button>
            <input type="file" ref={fileInputRef} onChange={importFromDrive} accept=".json" className="hidden" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-200/60">
            <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2">Total Entradas</p>
            <h2 className="text-2xl font-black text-emerald-600 tracking-tighter">{CURRENCY_FORMATTER.format(totalAnnualIncome)}</h2>
          </div>
          <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-200/60">
            <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2">Total Saídas</p>
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
                onToggleStatus={(id) => handleToggleStatus('income', id)}
              />
              <BudgetTable
                title={`Saídas • ${MONTHS[currentMonth]}`}
                type="expense"
                entries={monthData.expenses}
                categories={EXPENSE_CATEGORIES}
                onAdd={(entry) => handleAddEntry('expenses', entry)}
                onDelete={(id) => handleDeleteEntry('expenses', id)}
                onToggleStatus={(id) => handleToggleStatus('expenses', id)}
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
        Gestão Financeira Protegida &copy; {CURRENT_YEAR}
      </footer>
    </div>
  );
};

export default App;
