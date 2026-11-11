import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Task, TaskStatus } from './task.entity.js';
import { TasksService } from './tasks.service.js';

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const TASK_ID = '22222222-2222-4222-8222-222222222222';

function makeTask(overrides: Partial<Task> = {}): Task {
  return Object.assign(new Task(), {
    id: TASK_ID,
    title: 'Write tests',
    description: null,
    status: TaskStatus.Todo,
    ownerId: OWNER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

describe('TasksService', () => {
  let service: TasksService;
  const repository = {
    findAndCount: vi.fn(),
    findOneBy: vi.fn(),
    create: vi.fn((data: Partial<Task>) => makeTask(data)),
    merge: vi.fn((target: Task, source: Partial<Task>) =>
      Object.assign(target, source),
    ),
    save: vi.fn(async (task: Task) => task),
    remove: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: getRepositoryToken(Task), useValue: repository },
      ],
    }).compile();

    service = moduleRef.get(TasksService);
  });

  it('paginates and always scopes the query by owner', async () => {
    repository.findAndCount.mockResolvedValue([[makeTask()], 21]);

    const result = await service.findAll(OWNER_ID, {
      page: 3,
      limit: 10,
      status: TaskStatus.Done,
    });

    expect(repository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ownerId: OWNER_ID, status: TaskStatus.Done },
        skip: 20,
        take: 10,
      }),
    );
    expect(result.meta).toEqual({
      page: 3,
      limit: 10,
      total: 21,
      totalPages: 3,
    });
  });

  it('escapes LIKE wildcards in the search term', async () => {
    repository.findAndCount.mockResolvedValue([[], 0]);

    await service.findAll(OWNER_ID, { page: 1, limit: 10, search: '100%_' });

    const { where } = repository.findAndCount.mock.calls[0][0] as {
      where: { title: { value: string } };
    };
    expect(where.title.value).toBe('%100\\%\\_%');
  });

  it('throws 404 when the task does not belong to the user', async () => {
    repository.findOneBy.mockResolvedValue(null);

    await expect(service.findOne(OWNER_ID, TASK_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.findOneBy).toHaveBeenCalledWith({
      id: TASK_ID,
      ownerId: OWNER_ID,
    });
  });

  it('creates the task for the authenticated owner', async () => {
    const task = await service.create(OWNER_ID, { title: 'New task' });

    expect(repository.create).toHaveBeenCalledWith({
      title: 'New task',
      description: null,
      status: undefined,
      ownerId: OWNER_ID,
    });
    expect(task.ownerId).toBe(OWNER_ID);
  });

  it('merges only the provided fields on update', async () => {
    repository.findOneBy.mockResolvedValue(makeTask());

    const task = await service.update(OWNER_ID, TASK_ID, {
      status: TaskStatus.InProgress,
    });

    expect(task.status).toBe(TaskStatus.InProgress);
    expect(task.title).toBe('Write tests');
  });

  it('removes an owned task', async () => {
    const existing = makeTask();
    repository.findOneBy.mockResolvedValue(existing);

    await service.remove(OWNER_ID, TASK_ID);

    expect(repository.remove).toHaveBeenCalledWith(existing);
  });
});
