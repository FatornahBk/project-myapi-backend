import { User } from 'src/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Image } from './image.entity';

@Entity('batches')
export class Batch {
  @PrimaryGeneratedColumn()
  batch_id: number;

  @Column()
  smear_id: string;

  @Column()
  chicken_type: string;

  @Column()
  province: string;

  @Column({ type: 'int' })
  age: number;

  @Column()
  stain_type: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn()
  create_at: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Image, (image) => image.batch, { cascade: true })
  images: Image[];
}
