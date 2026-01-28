
import { GoogleGenAI } from "@google/genai";

export const getFinancialInsights = async (annualData: any) => {
  try {
    const apiKey = typeof process !== 'undefined' ? process.env.API_KEY : '';
    if (!apiKey) {
      return "Configure uma chave de API para obter insights inteligentes.";
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analise este resumo financeiro anual e forneça 3 dicas práticas em português para melhorar a saúde financeira. Responda apenas com as dicas em formato markdown curto. Dados: ${JSON.stringify(annualData)}`,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    
    return response.text || "Sem recomendações no momento.";
  } catch (error) {
    console.error("Erro ao obter insights:", error);
    return "O assistente está temporariamente indisponível.";
  }
};
