import { PartialType } from '@nestjs/swagger';
import { CreateNfcTagDto } from './create-nfc-tag.dto';

export class UpdateNfcTagDto extends PartialType(CreateNfcTagDto) {}
