import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'nuevo_cazador' })
  @IsString()
  @IsNotEmpty()
  nickname!: string;

  @ApiProperty({ example: 'cazador@nfhunter.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password!: string;

  @ApiPropertyOptional({ enum: ['USER', 'ADMIN'], default: 'USER' })
  @IsOptional()
  @IsIn(['USER', 'ADMIN'])
  role: 'USER' | 'ADMIN' = 'USER';

  @ApiPropertyOptional({ example: 'Novato' })
  @IsString()
  @IsOptional()
  levelTitle?: string;
}