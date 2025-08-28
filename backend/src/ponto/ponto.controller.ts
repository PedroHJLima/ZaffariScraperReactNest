import { Body, Controller, Post } from '@nestjs/common';
import { PontoService } from './ponto.service';

@Controller('ponto')
export class PontoController {
  constructor(private readonly pontoService: PontoService) {}

  @Post()
  async getPonto(@Body() body: { usuario: string; senha: string }) {
    const { usuario, senha } = body;
    const dados = await this.pontoService.getPontoData(usuario, senha);
    return { dados };
  }
}
