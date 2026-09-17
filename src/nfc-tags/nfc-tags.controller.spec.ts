import { Test, TestingModule } from '@nestjs/testing';
import { NfcTagsController } from './nfc-tags.controller';
import { NfcTagsService } from './nfc-tags.service';


describe('NfcTagsController', () => {
  let controller: NfcTagsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NfcTagsController],
      providers: [NfcTagsService],
    }).compile();

    controller = module.get<NfcTagsController>(NfcTagsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
