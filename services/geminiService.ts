
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getFinancialInsights = async (annualData: any) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analise este resumo financeiro anual e forneça 3 dicas práticas em português para melhorar a saúde financeira. Responda apenas com as dicas em formato markdown curto. Dados: ${JSON.stringify(annualData)}`,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text;
  } catch (error) {
    console.error("Erro ao obter insights:", error);
    return "Não foi possível carregar os insights no momento. Verifique sua conexão ou tente novamente mais tarde.";
  }
};
