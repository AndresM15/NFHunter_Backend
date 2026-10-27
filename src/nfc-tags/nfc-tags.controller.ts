import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, ParseIntPipe, ParseUUIDPipe } from '@nestjs/common';
import { NfcTagsService } from './nfc-tags.service';
import { CreateNfcTagDto } from './dto/create-nfc-tag.dto';
import { UpdateNfcTagDto } from './dto/update-nfc-tag.dto';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UsuarioAutenticado } from '../auth/decorators/current-user.decorator';

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

  // Las consultas también las usan los jugadores, pero les llega una vista
  // recortada (ver findAllForPlayer en el service).
  @ApiQuery({ name: 'eventId', required: false, type: Number })
  @Roles('ADMIN', 'USER')
  @Get()
  findAll(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Query('eventId', new ParseIntPipe({ optional: true })) eventId?: number,
  ) {
    return usuario.role === 'ADMIN'
      ? this.nfcTagsService.findAll(eventId)
      : this.nfcTagsService.findAllForPlayer(usuario.id, eventId);
  }

  @Roles('ADMIN', 'USER')
  @Get(':id')
  findOne(@CurrentUser() usuario: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return usuario.role === 'ADMIN'
      ? this.nfcTagsService.findOne(id)
      : this.nfcTagsService.findOneForPlayer(id, usuario.id);
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