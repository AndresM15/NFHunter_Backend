import { PrismaClient } from '@prisma/client'; // <-- Quita la importación de 'Role'
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando la siembra de datos de prueba (Seed)...');
  

  // 1. Limpiar datos existentes
  await prisma.scansHistory.deleteMany();
  await prisma.nfcTag.deleteMany();
  await prisma.user.deleteMany();
  await prisma.event.deleteMany();

  // 2. Crear Evento de prueba
  const event = await prisma.event.create({
    data: {
      name: 'Lanzamiento NFHunter Manizales',
      description: 'Evento beta para probar la búsqueda de tags en el sector El Cable y la Avenida Santander.',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  });


  const hashedPassword = await bcrypt.hash('admin123', 10);

  // 3. Crear Usuarios de prueba usando strings directamente
  const adminUser = await prisma.user.create({
    data: {
      nickname: 'admin_manizales',
      email: 'admin@nfhunter.com',
      passwordHash: hashedPassword,
      role: 'ADMIN', // <-- Pasar string directo
      levelTitle: 'Administrador del Juego',
    },
  });

  const player1 = await prisma.user.create({
    data: {
      nickname: 'andres_hunter',
      email: 'andres@example.com',
      passwordHash: 'scrypt_hashed_password_placeholder',
      role: 'USER', // <-- Pasar string directo
      levelTitle: 'Explorador Urbano',
      totalPoints: 25,
    },
  });

  const player2 = await prisma.user.create({
    data: {
      nickname: 'felipe_explorer',
      email: 'felipe@example.com',
      passwordHash: 'scrypt_hashed_password_placeholder',
      role: 'USER',
      levelTitle: 'Cazador Experto',
      totalPoints: 50,
    },
  });

  // 4. Crear Etiquetas NFC (PostGIS)
  await prisma.$executeRaw`
    INSERT INTO "nfc_tags" ("id", "code", "name", "description", "points_reward", "location", "is_hidden", "clue_text", "card_title", "card_fun_fact", "event_id")
    VALUES (
      gen_random_uuid(),
      'NFC-MAN-001',
      'Torre de Herveo',
      'Sticker visible cerca de la estructura metálica.',
      15,
      ST_SetSRID(ST_MakePoint(-75.4925, 5.0601), 4326)::geography,
      false,
      NULL,
      'Monumento Torre del Cable',
      'Sabías que fue traída desde Inglaterra para transportar café en el cable aéreo más largo del mundo.',
      ${event.id}
    );
  `;

  await prisma.$executeRaw`
    INSERT INTO "nfc_tags" ("id", "code", "name", "description", "points_reward", "location", "is_hidden", "clue_text", "card_title", "card_fun_fact", "event_id")
    VALUES (
      gen_random_uuid(),
      'NFC-MAN-002',
      'Catedral Basílica',
      'Sticker oculto cerca del corredor del corredor polaco.',
      30,
      ST_SetSRID(ST_MakePoint(-75.5174, 5.0689), 4326)::geography,
      true,
      'Busca bajo la sombra del templo de hormigón armado más alto de la ciudad.',
      'Catedral Basílica',
      'Posee 113 metros de altura y es una de las catedrales más altas de América.',
      ${event.id}
    );
  `;

  console.log('seed ejecutada correctamente');
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });