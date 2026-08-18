import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { Phase2Module } from '../phase2/phase2.module';

@Module({
  imports: [Phase2Module],
  controllers: [HealthController],
})
export class HealthModule {}
