import { Body, Controller, Post } from '@nestjs/common';
import { AIService } from './ai.service';

@Controller('ai')
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Post('checkMessage')
  async checkMessage(@Body('message') message: string) {
    if (!message) {
      return { error: 'Missing message field' };
    }

    const result = await this.aiService.detectRedirectIntent(message);
    return { message, isRedirect: result };
  }
}
