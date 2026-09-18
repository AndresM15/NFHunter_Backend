import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  create(createEventDto: CreateEventDto) {
    const { startDate, endDate, ...eventData } = createEventDto;

    return this.prisma.event.create({
      data: {
        ...eventData,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });
  }

  findAll() {
    return this.prisma.event.findMany();
  }

  async findOne(id: number) {
    const event = await this.prisma.event.findUnique({ where: { id } });

    if (!event) {
      throw new NotFoundException(`Evento con ID ${id} no encontrado.`);
    }

    return event;
  }

  async update(id: number, updateEventDto: UpdateEventDto) {
    await this.findOne(id);
    const { startDate, endDate, ...eventData } = updateEventDto;

    return this.prisma.event.update({
      where: { id },
      data: {
        ...eventData,
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: new Date(endDate) }),
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.event.delete({ where: { id } });
  }
}