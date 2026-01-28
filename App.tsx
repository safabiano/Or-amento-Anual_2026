
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
    const data = budget[currentYear].map(m => {
      const income = m.income.reduce((sum, item) => sum + item.amount, 0);
      const expenses = m.expenses.reduce((sum, item) => sum + item.amount, 0);
      return {
        name: MONTHS[m.month].substring(0, 3),
        renda: income,
        despesa: expenses,
        saldo: income - expenses
      };
    });
    return data;
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
    <div className="min-h-screen sm:min-h-[100dvh] bg-slate-50 flex flex-col antialiased">
      {/* Header */}
      <header className="bg-indigo-700 text-white shadow-lg sticky top-0 z-50 backdrop-blur-md bg-opacity-95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="p-2 bg-white/20 rounded-lg shrink-0">
              <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">FinancialPro {currentYear}</h1>
              <p className="text-[10px] sm:text-xs text-indigo-100 uppercase tracking-widest font-medium">Controle de Orçamento Anual</p>
            </div>
          </div>

          <div className="flex bg-white/10 p-1 rounded-xl w-full sm:w-auto overflow-hidden">
            <button
              onClick={() => setActiveTab('month')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${activeTab === 'month' ? 'bg-white text-indigo-700 shadow-sm' : 'hover:bg-white/10'}`}
            >
              Visão Mensal
            </button>
            <button
              onClick={() => setActiveTab('year')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${activeTab === 'year' ? 'bg-white text-indigo-700 shadow-sm' : 'hover:bg-white/10'}`}
            >
              Visão Anual
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8 w-full flex-1 mb-12">
        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border-l-4 border-emerald-500 hover:shadow-md transition-all">
            <p className="text-[10px] sm:text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">Total Renda Anual</p>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">{CURRENCY_FORMATTER.format(totalAnnualIncome)}</h2>
          </div>
          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border-l-4 border-rose-500 hover:shadow-md transition-all">
            <p className="text-[10px] sm:text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">Total Despesa Anual</p>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">{CURRENCY_FORMATTER.format(totalAnnualExpenses)}</h2>
          </div>
          <div className={`bg-white p-5 sm:p-6 rounded-2xl shadow-sm border-l-4 hover:shadow-md transition-all ${totalAnnualBalance >= 0 ? 'border-indigo-500' : 'border-amber-500'}`}>
            <p className="text-[10px] sm:text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">Saldo Líquido Anual</p>
            <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${totalAnnualBalance >= 0 ? 'text-indigo-700' : 'text-amber-700'}`}>
              {CURRENCY_FORMATTER.format(totalAnnualBalance)}
            </h2>
          </div>
        </div>

        {activeTab === 'month' ? (
          <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Month Selector - Native-like touch scroll */}
            <div className="relative group">
              <div className="flex overflow-x-auto gap-2 pb-4 pt-1 px-1 scrollbar-hide snap-x touch-pan-x">
                {MONTHS.map((name, idx) => (
                  <button
                    key={name}
                    onClick={() => setCurrentMonth(idx)}
                    className={`flex-shrink-0 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all snap-center ${
                      currentMonth === idx 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-105' 
                      : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-slate-50 to-transparent pointer-events-none sm:hidden"></div>
            </div>

            {/* Monthly Insights Section */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-5 sm:p-8 rounded-2xl border border-indigo-100 flex flex-col md:flex-row items-center gap-6 shadow-inner">
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-base sm:text-lg font-black text-indigo-900 mb-2 flex items-center justify-center md:justify-start gap-2">
                  <span className="p-1.5 bg-indigo-200 text-indigo-700 rounded-lg">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z" />
                    </svg>
                  </span>
                  AI Insights
                </h3>
                <p className="text-sm text-indigo-700 mb-4 md:mb-0">Sua análise financeira inteligente para {MONTHS[currentMonth]}.</p>
                {insights && (
                  <div className="mt-4 p-5 bg-white/80 rounded-2xl text-sm text-slate-700 leading-relaxed border border-white shadow-sm text-left backdrop-blur-sm">
                    {insights}
                  </div>
                )}
              </div>
              <button
                onClick={handleGetInsights}
                disabled={isGeneratingInsights}
                className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-8 py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-2 active:scale-95 touch-manipulation"
              >
                {isGeneratingInsights ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : 'Obter Dicas'}
              </button>
            </div>

            {/* Tables Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              <BudgetTable
                title={`Rendas de ${MONTHS[currentMonth]}`}
                type="income"
                entries={monthData.income}
                categories={INCOME_CATEGORIES}
                onAdd={(entry) => handleAddEntry('income', entry)}
                onDelete={(id) => handleDeleteEntry('income', id)}
              />
              <BudgetTable
                title={`Despesas de ${MONTHS[currentMonth]}`}
                type="expense"
                entries={monthData.expenses}
                categories={EXPENSE_CATEGORIES}
                onAdd={(entry) => handleAddEntry('expenses', entry)}
                onDelete={(id) => handleDeleteEntry('expenses', id)}
              />
            </div>

            {/* Monthly Chart Container */}
            {expenseByCategory.length > 0 && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                  <div className="w-2 h-6 bg-indigo-500 rounded-full"></div>
                  Onde foi o dinheiro?
                </h3>
                <div className="w-full relative" style={{ height: '350px', minHeight: '350px' }}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <PieChart>
                      <Pie
                        data={expenseByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={window.innerWidth < 640 ? 60 : 80}
                        outerRadius={window.innerWidth < 640 ? 95 : 120}
                        paddingAngle={4}
                        dataKey="value"
                        animationDuration={800}
                      >
                        {expenseByCategory.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => CURRENCY_FORMATTER.format(value as number)}
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px'}}
                      />
                      <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Annual Chart Container */}
            <div className="bg-white p-5 sm:p-8 rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <h3 className="text-lg sm:text-xl font-black text-slate-800 mb-6 sm:mb-8 flex items-center gap-2">
                 <div className="w-2 h-6 bg-indigo-500 rounded-full"></div>
                 Evolução Anual
              </h3>
              <div className="w-full relative" style={{ height: '400px', minHeight: '400px' }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={annualSummary} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} 
                      dy={10} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 10}} 
                      tickFormatter={(val) => `R$${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`} 
                    />
                    <Tooltip 
                      formatter={(val) => CURRENCY_FORMATTER.format(val as number)}
                      contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontSize: '12px'}}
                      cursor={{fill: '#f8fafc'}}
                    />
                    <Legend iconType="circle" verticalAlign="top" align="right" wrapperStyle={{paddingBottom: '20px', fontSize: '11px'}} />
                    <Bar dataKey="renda" name="Renda" fill="#10b981" radius={[6, 6, 0, 0]} barSize={window.innerWidth < 640 ? 12 : 28} />
                    <Bar dataKey="despesa" name="Despesa" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={window.innerWidth < 640 ? 12 : 28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Consolidado Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <div className="w-2 h-5 bg-indigo-400 rounded-full"></div>
                <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Resumo Consolidado</h3>
              </div>
              <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full text-xs sm:text-sm text-left">
                  <thead className="text-[10px] sm:text-xs text-slate-400 uppercase bg-slate-50/50">
                    <tr>
                      <th className="px-6 py-4 font-bold">Mês</th>
                      <th className="px-6 py-4 text-right font-bold">Renda</th>
                      <th className="px-6 py-4 text-right font-bold">Despesa</th>
                      <th className="px-6 py-4 text-right font-bold">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {annualSummary.map((m, idx) => (
                      <tr key={m.name} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-700">{MONTHS[idx]}</td>
                        <td className="px-6 py-4 text-right text-emerald-600 font-medium whitespace-nowrap">{CURRENCY_FORMATTER.format(m.renda)}</td>
                        <td className="px-6 py-4 text-right text-rose-600 font-medium whitespace-nowrap">{CURRENCY_FORMATTER.format(m.despesa)}</td>
                        <td className={`px-6 py-4 text-right font-black whitespace-nowrap ${m.saldo >= 0 ? 'text-indigo-600' : 'text-amber-600'}`}>
                          {CURRENCY_FORMATTER.format(m.saldo)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-indigo-50/50 font-bold text-slate-900 border-t border-slate-200">
                    <tr>
                      <td className="px-6 py-5 uppercase text-[10px] tracking-tight">Consolidado</td>
                      <td className="px-6 py-5 text-right text-emerald-700 whitespace-nowrap">{CURRENCY_FORMATTER.format(totalAnnualIncome)}</td>
                      <td className="px-6 py-5 text-right text-rose-700 whitespace-nowrap">{CURRENCY_FORMATTER.format(totalAnnualExpenses)}</td>
                      <td className={`px-6 py-5 text-right font-black whitespace-nowrap ${totalAnnualBalance >= 0 ? 'text-indigo-800' : 'text-amber-800'}`}>
                        {CURRENCY_FORMATTER.format(totalAnnualBalance)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 py-10 text-center border-t border-slate-200 w-full">
        <div className="flex flex-col items-center gap-2">
          <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest">
            FinancialPro {currentYear} • macOS & iOS Optimized
          </p>
          <p className="text-[9px] text-slate-300">Seus dados residem apenas localmente.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
