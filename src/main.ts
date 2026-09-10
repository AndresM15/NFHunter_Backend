import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuración de la documentación Swagger
  const config = new DocumentBuilder()
    .setTitle('NFHunter API')
    .setDescription('API Backend para el juego ARG basado en geolocalización y NFC')
    .setVersion('1.0')
    .addBearerAuth() // Soporte para probar tokens JWT
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilitar CORS para permitir peticiones desde React Native / Expo
  app.enableCors();
  await app.listen(process.env.PORT ?? 3000);
  
  }

  


}
bootstrap();