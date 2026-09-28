import {
  Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseUUIDPipe, Query,
  ParseIntPipe, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator,
  FileTypeValidator, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

// Importamos los Guards y el Decorador de roles
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UsuarioAutenticado } from '../auth/decorators/current-user.decorator';

@ApiTags('Gestión de Usuarios (Admin)') // Agrupa los endpoints en Swagger
@ApiBearerAuth() // Indica en Swagger que requiere token
@UseGuards(JwtAuthGuard, RolesGuard) // 1. Verifica el token, 2. Verifica el rol
@Roles('ADMIN') // Restringe todos los endpoints de esta clase al rol ADMIN
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Crear un nuevo usuario manualmente' })
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @ApiOperation({ summary: 'Obtener la lista de todos los usuarios' })
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  // Rutas de cualquier usuario autenticado. Van antes de ':id' para que
  // "me" y "ranking" no se lean como un id.

  @ApiOperation({ summary: 'Mi perfil, con mis tags encontrados y mi puesto' })
  @Roles('ADMIN', 'USER')
  @Get('me')
  findMe(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.usersService.findMe(usuario.id);
  }

  @ApiOperation({ summary: 'Ranking de jugadores, general o de un evento' })
  @ApiQuery({ name: 'eventId', required: false, type: Number })
  @Roles('ADMIN', 'USER')
  @Get('ranking')
  ranking(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Query('eventId', new ParseIntPipe({ optional: true })) eventId?: number,
  ) {
    return this.usersService.ranking(usuario.id, eventId);
  }

  @ApiOperation({ summary: 'Cambiar mi foto de perfil (JPEG o PNG, máx. 2 MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { avatar: { type: 'string', format: 'binary' } } } })
  @Roles('ADMIN', 'USER')
  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  updateAvatar(
    @CurrentUser() usuario: UsuarioAutenticado,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png)$/ }),
        ],
        // La app muestra este mensaje tal cual: nada de "Validation failed".
        exceptionFactory: () => new BadRequestException('La foto debe ser JPEG o PNG y pesar máximo 2 MB.'),
      }),
    )
    archivo: Express.Multer.File,
  ) {
    return this.usersService.updateAvatar(usuario.id, archivo);
  }

  @ApiOperation({ summary: 'Obtener el detalle de un usuario por su ID' })
  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.findOne(id);
  }

  @ApiOperation({ summary: 'Actualizar los datos o el rol de un usuario' })
  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @ApiOperation({ summary: 'Eliminar un usuario del sistema' })
  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.remove(id);
  }
}