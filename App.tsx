
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

const INITIAL_BUDGET: AnnualBudget = {
  2024: Array.from({ length: 12 }, (_, i) => ({
    month: i,
    income: [],
    expenses: []
  }))
};

const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

const App: React.FC = () => {
  const [budget, setBudget] = useState<AnnualBudget>(() => {
    const saved = localStorage.getItem('budget_data_v1');
    return saved ? JSON.parse(saved) : INITIAL_BUDGET;
  });
  
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear] = useState(2024);
  const [activeTab, setActiveTab] = useState<'month' | 'year'>('month');
  const [insights, setInsights] = useState<string | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  useEffect(() => {
    localStorage.setItem('budget_data_v1', JSON.stringify(budget));
  }, [budget]);

  const monthData = useMemo(() => {
    return budget[currentYear].find(m => m.month === currentMonth) || budget[currentYear][0];
  }, [budget, currentMonth, currentYear]);

  const annualSummary = useMemo(() => {
    return budget[currentYear].map(m => {
      const income = m.income.reduce((sum, item) => sum + item.amount, 0);
      const expenses = m.expenses.reduce((sum, item) => sum + item.amount, 0);
      return {
        name: MONTHS[m.month].substring(0, 3),
        renda: income,
        despesa: expenses,
        saldo: income - expenses
      };
    });
  }, [budget, currentYear]);

  const totalAnnualIncome = annualSummary.reduce((sum, item) => sum + item.renda, 0);
  const totalAnnualExpenses = annualSummary.reduce((sum, item) => sum + item.despesa, 0);
  const totalAnnualBalance = totalAnnualIncome - totalAnnualExpenses;

  const handleAddEntry = (type: 'income' | 'expenses', entry: Omit<BudgetEntry, 'id'>) => {
    setBudget(prev => {
      const newBudget = { ...prev };
      const monthIdx = newBudget[currentYear].findIndex(m => m.month === currentMonth);
      const newEntry = { ...entry, id: crypto.randomUUID() };
      newBudget[currentYear][monthIdx][type].push(newEntry);
      return newBudget;
    });
  };

  const handleDeleteEntry = (type: 'income' | 'expenses', id: string) => {
    setBudget(prev => {
      const newBudget = { ...prev };
      const monthIdx = newBudget[currentYear].findIndex(m => m.month === currentMonth);
      newBudget[currentYear][monthIdx][type] = newBudget[currentYear][monthIdx][type].filter(e => e.id !== id);
      return newBudget;
    });
  };

  const handleGetInsights = async () => {
    setIsGeneratingInsights(true);
    const summary = annualSummary.map(s => `${s.name}: Renda ${s.renda}, Despesa ${s.despesa}`).join('; ');
    const res = await getFinancialInsights(summary);
    setInsights(res || "Erro ao processar.");
    setIsGeneratingInsights(false);
  };

  const expenseByCategory = useMemo(() => {
    const categories: Record<string, number> = {};
    monthData.expenses.forEach(e => {
      categories[e.category] = (categories[e.category] || 0) + e.amount;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [monthData]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased selection:bg-indigo-100">
      <header className="bg-indigo-700 text-white shadow-lg sticky top-0 z-50 backdrop-blur-xl bg-opacity-90 border-b border-indigo-600/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="p-2 bg-white/20 rounded-xl shrink-0 backdrop-blur-md">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-black tracking-tight leading-tight">FinancialPro {currentYear}</h1>
              <p className="text-[10px] text-indigo-100 uppercase tracking-widest font-bold opacity-80">Gestão Patrimonial</p>
            </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-200/60">
            <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2">Entradas Totais</p>
            <h2 className="text-2xl font-black text-emerald-600 tracking-tighter">{CURRENCY_FORMATTER.format(totalAnnualIncome)}</h2>
          </div>
          <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-200/60">
            <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2">Saídas Totais</p>
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
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide snap-x">
              {MONTHS.map((name, idx) => (
                <button
                  key={name}
                  onClick={() => setCurrentMonth(idx)}
                  className={`flex-shrink-0 px-6 py-3 rounded-2xl text-xs font-bold transition-all snap-start border ${
                    currentMonth === idx 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg scale-[1.02]' 
                    : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-200'
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
                title={`Gastos • ${MONTHS[currentMonth]}`}
                type="expense"
                entries={monthData.expenses}
                categories={EXPENSE_CATEGORIES}
                onAdd={(entry) => handleAddEntry('expenses', entry)}
                onDelete={(id) => handleDeleteEntry('expenses', id)}
              />
            </div>

            {expenseByCategory.length > 0 && (
              <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200/60">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8">Composição de Gastos</h3>
                <div className="w-full" style={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%" debounce={50}>
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
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200/60 overflow-hidden">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8">Fluxo de Caixa Anual</h3>
              <div className="w-full" style={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%" debounce={50}>
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

            <div className="bg-white rounded-[32px] shadow-sm border border-slate-200/60 overflow-hidden">
              <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-100">
                <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Resumo Consolidado</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] text-slate-400 uppercase tracking-widest bg-slate-50/30">
                    <tr>
                      <th className="px-8 py-4 font-bold">Mês</th>
                      <th className="px-8 py-4 text-right font-bold">Renda</th>
                      <th className="px-8 py-4 text-right font-bold">Gasto</th>
                      <th className="px-8 py-4 text-right font-bold">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {annualSummary.map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-8 py-4 font-bold text-slate-700">{MONTHS[idx]}</td>
                        <td className="px-8 py-4 text-right text-emerald-600 font-medium">{CURRENCY_FORMATTER.format(m.renda)}</td>
                        <td className="px-8 py-4 text-right text-rose-600 font-medium">{CURRENCY_FORMATTER.format(m.despesa)}</td>
                        <td className={`px-8 py-4 text-right font-black ${m.saldo >= 0 ? 'text-indigo-600' : 'text-amber-600'}`}>
                          {CURRENCY_FORMATTER.format(m.saldo)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="py-12 text-center">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
          FinancialPro &copy; {new Date().getFullYear()} • Otimizado para macOS & iOS
        </p>
      </footer>
    </div>
  );
};

export default App;
