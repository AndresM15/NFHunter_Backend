import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    // 1. Validar que el email o nickname no existan previamente
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: createUserDto.email }, { nickname: createUserDto.nickname }],
      },
    });

    if (existingUser) {
      throw new ConflictException('El correo o el apodo ya están registrados.');
    }

    // 2. Encriptar la contraseña
    const passwordHash = await bcrypt.hash(createUserDto.password, 10);
    
    // 3. Extraer el password plano para no enviarlo a Prisma y guardar el resto
    const { password, ...userData } = createUserDto;

    const newUser = await this.prisma.user.create({
      data: {
        ...userData,
        passwordHash,
      },
    });

    // 4. Retornar el usuario sin exponer el hash de la contraseña
    return this.sanitizeUser(newUser);
  }

  async findAll() {
    // Retornamos todos los usuarios, pero seleccionamos qué campos mostrar
    // para no filtrar los passwordHash de toda la base de datos por accidente.
    return this.prisma.user.findMany({
      select: {
        id: true,
        nickname: true,
        email: true,
        role: true,
        levelTitle: true,
        totalPoints: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado.`);
    }

    return this.sanitizeUser(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    // 1. Verificar que el usuario existe antes de actualizar
    await this.findOne(id); 

    // 2. Preparar los datos a actualizar
    const dataToUpdate: any = { ...updateUserDto };

    // 3. Si el admin envió una nueva contraseña, hay que encriptarla
    if (updateUserDto.password) {
      dataToUpdate.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
      delete dataToUpdate.password; // Borramos la clave en texto plano
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: dataToUpdate,
    });

    return this.sanitizeUser(updatedUser);
  }

  async remove(id: string) {
    // Verificar que existe antes de intentar borrar
    await this.findOne(id);
    
    return this.prisma.user.delete({
      where: { id },
    });
  }

  // Método auxiliar privado para limpiar el hash de la contraseña de las respuestas
  private sanitizeUser(user: any) {
    const { passwordHash, ...result } = user;
    return result;
  }
}