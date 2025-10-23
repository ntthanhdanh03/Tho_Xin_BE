import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly apiKey = process.env.GEMINI_API_KEY;

  async analyze(prompt: string): Promise<string> {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
          }),
        },
      );

      const data = await res.json();
      const text =
        data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';

      this.logger.debug(`Gemini Response: ${text}`);
      return text;
    } catch (error) {
      this.logger.error('Gemini API error', error);
      throw error;
    }
  }

  /**
   * Kiểm tra xem tin nhắn có hướng người dùng sang app khác không.
   * Trả về true / false.
   */
  async detectRedirectIntent(message: string): Promise<boolean> {
    const prompt = `
      You are a strict message classifier.
      Decide if the following message tries to redirect the user
      to another app, service, or share contact info externally (Zalo, Telegram, FB...).
      Respond only with "true" or "false".

      Message: "${message}"
    `;

    const response = await this.analyze(prompt);
    return response.toLowerCase().startsWith('true');
  }
}
