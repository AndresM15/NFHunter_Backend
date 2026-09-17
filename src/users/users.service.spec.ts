import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  const prisma = {
    user: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, PrismaService],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('deletes a user and does not expose the password hash', async () => {
    const user = {
      id: '6f7d1e4a-9f7d-4f1d-8e1a-123456789abc',
      nickname: 'cazador',
      email: 'cazador@example.com',
      passwordHash: 'secret-hash',
    };
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.user.delete.mockResolvedValue(user);

    await expect(service.remove(user.id)).resolves.toEqual({
      id: user.id,
      nickname: user.nickname,
      email: user.email,
    });
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: user.id } });
  });
});
