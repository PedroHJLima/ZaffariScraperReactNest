import { Module } from '@nestjs/common';
import { PontoModule } from './ponto/ponto.module';

@Module({
  imports: [PontoModule],
})
export class AppModule {}