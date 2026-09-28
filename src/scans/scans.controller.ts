import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ScansService } from './scans.service';
import { CreateScanDto } from './dto/create-scan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UsuarioAutenticado } from '../auth/decorators/current-user.decorator';

@ApiTags('Escaneos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('scans')
export class ScansController {
  constructor(private readonly scansService: ScansService) {}

  @ApiOperation({
    summary: 'Registrar el escaneo de un tag NFC',
    description:
      'Valida que el jugador esté dentro del radio permitido, que no haya escaneado antes ese tag y suma los puntos del tag a su total.',
  })
  @Post()
  create(@CurrentUser() usuario: UsuarioAutenticado, @Body() createScanDto: CreateScanDto) {
    return this.scansService.create(usuario.id, createScanDto);
  }

  @ApiOperation({ summary: 'Ver mi historial de escaneos' })
  @Get('me')
  findMine(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.scansService.findMine(usuario.id);
  }

  @ApiOperation({ summary: 'Ver todos los escaneos del sistema' })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'tagId', required: false, type: String })
  @Roles('ADMIN')
  @Get()
  findAll(
    @Query('userId', new ParseUUIDPipe({ optional: true })) userId?: string,
    @Query('tagId', new ParseUUIDPipe({ optional: true })) tagId?: string,
  ) {
    return this.scansService.findAll(userId, tagId);
  }
}
