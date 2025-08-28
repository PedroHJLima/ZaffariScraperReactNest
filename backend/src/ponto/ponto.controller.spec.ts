import { Test, TestingModule } from '@nestjs/testing';
import { PontoController } from './ponto.controller';

describe('PontoController', () => {
  let controller: PontoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PontoController],
    }).compile();

    controller = module.get<PontoController>(PontoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
