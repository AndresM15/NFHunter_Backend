import { IsString, IsOptional, IsNumber, IsBoolean, IsUrl, Min, Max, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNfcTagDto {
  @ApiProperty({ example: 'tag-ultra-001' })
  @IsString()
  code!: string;

  @ApiProperty({ example: 'Estatua del Fundador' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'El tag está oculto detrás de la placa.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 20, default: 10 })
  @IsInt()
  @IsOptional()
  pointsReward?: number;

  // 📍 Pedimos latitud y longitud por separado para luego unirlos en PostGIS
  @ApiProperty({ example: 4.60971, description: 'Latitud (-90 a 90)' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({ example: -74.08175, description: 'Longitud (-180 a 180)' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isHidden?: boolean;

  @ApiPropertyOptional({ example: 'Busca donde el sol toca al mediodía' })
  @IsString()
  @IsOptional()
  clueText?: string;

  @ApiPropertyOptional({ example: 'Estatua Dorada' })
  @IsString()
  @IsOptional()
  cardTitle?: string;

  @ApiPropertyOptional({ example: 'https://midominio.com/img/estatua.jpg' })
  @IsUrl()
  @IsOptional()
  cardImageUrl?: string;

  @ApiPropertyOptional({ example: 'Esta estatua pesa 2 toneladas.' })
  @IsString()
  @IsOptional()
  cardFunFact?: string;

  @ApiPropertyOptional({ example: 1, description: 'ID del evento asociado' })
  @IsInt()
  @IsOptional()
  eventId?: number;
}