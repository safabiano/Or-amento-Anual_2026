
export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const INCOME_CATEGORIES = ['Salário', 'Freelance', 'Investimentos', 'Presentes', 'Outros'];
export const EXPENSE_CATEGORIES = ['Moradia', 'Alimentação', 'Transporte', 'Lazer', 'Educação', 'Saúde', 'Seguros', 'Assinaturas', 'Outros'];

export const CURRENCY_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});
