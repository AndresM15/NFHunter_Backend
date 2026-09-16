import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { snapshot: false });

  // Configuración de la documentación Swagger
  const config = new DocumentBuilder()
    .setTitle('NFHunter API')
    .setDescription('API Backend para el juego ARG basado en geolocalización y NFC')
    .setVersion('1.0')
    .addBearerAuth() // Soporte para probar tokens JWT
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Elimina campos adicionales que no estén en el DTO
    forbidNonWhitelisted: true, // Lanza error si envían campos no permitidos
  }));

  app.enableCors();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();