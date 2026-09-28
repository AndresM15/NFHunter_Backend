import { IsString, IsNotEmpty, IsNumber, Min, Max, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateScanDto {
  @ApiProperty({
    example: 'NFC-MAN-001',
    description: 'Código leído del tag NFC con el celular',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  code!: string;

  @ApiProperty({ example: 5.0601, description: 'Latitud del jugador al escanear' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({ example: -75.4925, description: 'Longitud del jugador al escanear' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;
}
