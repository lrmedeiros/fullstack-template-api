import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { User } from '../users/user.entity.js';

export enum TaskStatus {
  Todo = 'todo',
  InProgress = 'in_progress',
  Done = 'done',
}

@Entity('tasks')
export class Task {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_tasks' })
  id: string;

  @ApiProperty({ example: 'Escrever testes de integração' })
  @Column({ type: 'varchar', length: 160 })
  title: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({ enum: TaskStatus })
  @Column({
    type: 'enum',
    enum: TaskStatus,
    enumName: 'task_status',
    default: TaskStatus.Todo,
  })
  status: TaskStatus;

  @ApiProperty({ format: 'uuid' })
  @Index('IDX_tasks_owner_id')
  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id', foreignKeyConstraintName: 'FK_tasks_owner' })
  owner?: Relation<User>;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
