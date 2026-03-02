import { GoogleGenAI } from "@google/genai";

export async function generateCELExpression(apiKey: string, prompt: string): Promise<string> {
    if (!apiKey) {
        throw new Error("Gemini API key is required");
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: prompt,
        config: {
            systemInstruction: "You are an expert in the Common Expression Language (CEL). The user will provide you a prompt that contains a description of what they want to achieve and context about the environment. You must respond with ONLY the raw CEL expression. Do not wrap it in markdown blockquotes, do not explain it, do not provide any conversational text.",
            temperature: 0.0,
        }
    });

    return (response.text || "").trim();
}
