const { GoogleGenAI } = require('@google/genai');
const { FINANCIAL_TEXT_PROMPT, FINANCIAL_IMAGE_PROMPT, HELP_PROMPT } = require('../config/prompts');
const TimeService = require('../utils/timeService');

class GeminiService {
    constructor(apiKey) {
        this.genAI = new GoogleGenAI({ apiKey: apiKey });
        this.model = null; // We'll call the model directly through the client
        this.timeService = new TimeService();
    }

    async processTextMessage(message) {
        try {
            // Get current time context
            const timeContext = await this.timeService.formatTimeForPrompt();
            
            const prompt = `${FINANCIAL_TEXT_PROMPT}\n\n${timeContext}\n\nUser message: "${message}"`;
            
            const result = await this.genAI.models.generateContent({
                model: 'gemini-2.5-flash-preview-05-20',
                contents: prompt,
            });
            const text = result.text;
            
            // Try to parse JSON response
            try {
                const cleanText = text.replace(/```json|```/g, '').trim();
                return JSON.parse(cleanText);
            } catch (parseError) {
                console.error('Error parsing Gemini response:', parseError);
                console.log('Raw response:', text);
                return [];
            }
        } catch (error) {
            console.error('Error processing text with Gemini:', error);
            return [];
        }
    }

    async processImageMessage(imageBuffer) {
        try {
            // Get current time context
            const timeContext = await this.timeService.formatTimeForPrompt();
            
            const imageBase64 = imageBuffer.toString('base64');
            
            const result = await this.genAI.models.generateContent({
                model: 'gemini-2.5-flash-preview-05-20',
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: `${FINANCIAL_IMAGE_PROMPT}\n\n${timeContext}` },
                            {
                                inlineData: {
                                    mimeType: "image/jpeg",
                                    data: imageBase64
                                }
                            }
                        ]
                    }
                ]
            });
            const text = result.text;
            
            // Try to parse JSON response
            try {
                const cleanText = text.replace(/```json|```/g, '').trim();
                return JSON.parse(cleanText);
            } catch (parseError) {
                console.error('Error parsing Gemini image response:', parseError);
                console.log('Raw response:', text);
                return [];
            }
        } catch (error) {
            console.error('Error processing image with Gemini:', error);
            return [];
        }
    }

    async generateHelp() {
        try {
            const result = await this.genAI.models.generateContent({
                model: 'gemini-2.5-flash-preview-05-20',
                contents: HELP_PROMPT,
            });
            return result.text;
        } catch (error) {
            console.error('Error generating help with Gemini:', error);
            return 'Maaf, saya tidak dapat memberikan bantuan saat ini. Silakan coba lagi nanti.';
        }
    }
}

module.exports = GeminiService; 