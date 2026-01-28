
export type Category = 'Salário' | 'Investimentos' | 'Outros' | 'Moradia' | 'Alimentação' | 'Transporte' | 'Lazer' | 'Educação' | 'Saúde';

export interface BudgetEntry {
  id: string;
  category: string;
  description: string;
  amount: number;
}

export interface MonthlyData {
  month: number;
  income: BudgetEntry[];
  expenses: BudgetEntry[];
}

export interface AnnualBudget {
  [year: number]: MonthlyData[];
}
