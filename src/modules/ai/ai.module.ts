import { Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';

@Module({
  providers: [AIService],
  controllers: [AIController],
  exports: [AIService],
})
export class AIModule {}
