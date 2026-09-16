import { IsString, IsOptional, IsDateString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEventDto {
  @ApiProperty({ example: 'Torneo de Primavera' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: 'Primer evento de recolección de tags en el campus.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '2026-10-01T08:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @ApiProperty({ example: '2026-10-31T18:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  endDate!: string;
}