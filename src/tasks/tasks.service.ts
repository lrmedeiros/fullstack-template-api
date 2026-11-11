import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, type FindOptionsWhere, type Repository } from 'typeorm';
import { paginate, type Paginated } from '../common/dto/paginated.dto.js';
import type { CreateTaskDto } from './dto/create-task.dto.js';
import type { ListTasksQueryDto } from './dto/list-tasks-query.dto.js';
import type { UpdateTaskDto } from './dto/update-task.dto.js';
import { Task } from './task.entity.js';

/**
 * Toda operação é escopada pelo dono: um usuário nunca enxerga nem altera
 * tarefas de outro (responde 404, sem revelar que o recurso existe).
 */
@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
  ) {}

  async findAll(
    ownerId: string,
    { page, limit, status, search }: ListTasksQueryDto,
  ): Promise<Paginated<Task>> {
    const where: FindOptionsWhere<Task> = { ownerId };
    if (status) where.status = status;
    if (search) where.title = ILike(`%${escapeLike(search)}%`);

    const [data, total] = await this.tasks.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return paginate(data, total, page, limit);
  }

  async findOne(ownerId: string, id: string): Promise<Task> {
    const task = await this.tasks.findOneBy({ id, ownerId });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  create(ownerId: string, dto: CreateTaskDto): Promise<Task> {
    const task = this.tasks.create({
      title: dto.title,
      description: dto.description ?? null,
      status: dto.status,
      ownerId,
    });
    return this.tasks.save(task);
  }

  async update(ownerId: string, id: string, dto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOne(ownerId, id);
    this.tasks.merge(task, dto);
    return this.tasks.save(task);
  }

  async remove(ownerId: string, id: string): Promise<void> {
    const task = await this.findOne(ownerId, id);
    await this.tasks.remove(task);
  }
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
