import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { AIService } from './ai.service';

@Controller('ai')
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Get('analyze')
  async analyze(@Query('q') q: string) {
    if (!q) throw new BadRequestException('Missing query param: q');
    const result = await this.aiService['analyze'](q);
    return { result };
  }
  // @Get('detect')
  // async detect(@Query('message') message: string) {
  //   if (!message) throw new BadRequestException('Missing query param: message');
  //   const redirectDetected = await this.aiService.detectRedirectIntent(message);
  //   return { redirectDetected };
  // }
}
