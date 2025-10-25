// src/modules/ai/ai.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ReportService } from '../report/report.service';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly reportService: ReportService,
  ) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!this.apiKey) {
      this.logger.error(
        '⚠️ GEMINI_API_KEY is missing in environment variables',
      );
    }
  }

  private async analyze(prompt: string): Promise<string> {
    const start = Date.now();
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 128 },
        }),
      },
    );

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    const time = Date.now() - start;
    this.logger.debug(`Gemini responded in ${time}ms: ${text}`);
    return text ?? '';
  }

  async detectRedirectIntent(
    message: string,
    partnerId: string,
  ): Promise<boolean> {
    const prompt = `{
      "role": "system",
      "purpose": "You are a strict message classifier.",
      "task": "Detect if the given user message attempts to redirect users to another communication platform or share personal contact information externally.",
      "rules": {
        "positive_examples": ["add zalo 09 chín 45", "ib tele nhé", "kết bạn fb đi", "liên hệ qua phây búc", "chat zalo hoặc tlgram", "z@lo chính chủ nhé", "09 tám bảy 65 bốn ba"],
        "negative_examples": ["hôm nay bạn thế nào", "ship tới địa chỉ nào vậy", "mình sẽ gửi hàng chiều nay", "bạn ở khu vực nào thế"],
        "keywords_to_detect": ["zalo","tele","telegram","facebook","fb","mess","messenger","whatsapp","sdt","số điện thoại","call","liên hệ","phây búc","fbook"]
      },
      "output_format": {"type": "json", "example": "{ \\"redirectDetected\\": true }"},
      "input": {"message": "${message}"}
    }`;

    const response = await this.analyze(prompt);

    let detected = false;
    try {
      const parsed = JSON.parse(response);
      detected = Boolean(parsed.redirectDetected);
    } catch {
      detected = response.toLowerCase().includes('true');
    }

    if (detected) {
      await this.reportService.createReport({
        message,
        reason: `Thợ ${partnerId} có hành vi điều hướng quá nền tảng khác để gian lận với tin nhắn ${message}`,
      });
    }

    return detected;
  }
}
