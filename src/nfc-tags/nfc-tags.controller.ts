import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { NfcTagsService } from './nfc-tags.service';
import { CreateNfcTagDto } from './dto/create-nfc-tag.dto';
import { UpdateNfcTagDto } from './dto/update-nfc-tag.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('NFC Tags')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard) // 🛡️ Escudo JWT y de Roles
@Roles('ADMIN')                      // 👮‍♂️ Exclusivo para administradores
@Controller('nfc-tags')
export class NfcTagsController {
  constructor(private readonly nfcTagsService: NfcTagsService) {}

  @Post()
  create(@Body() createNfcTagDto: CreateNfcTagDto) {
    return this.nfcTagsService.create(createNfcTagDto);
  }

  @Get()
  findAll() {
    return this.nfcTagsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.nfcTagsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateNfcTagDto: UpdateNfcTagDto) {
    return this.nfcTagsService.update(id, updateNfcTagDto);
  } 

  // La actualización requerirá una lógica raw similar, por ahora la dejamos mapeada
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.nfcTagsService.remove(id);
  }
}