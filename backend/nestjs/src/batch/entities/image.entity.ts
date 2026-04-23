import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Batch } from './batch.entity';

@Entity('images')
export class Image {
  @PrimaryGeneratedColumn()
  image_id: number;

  @Column()
  image_name: string;

  @Column({ default: 'pending' })
  image_status: string;

  @Column()
  image_path: string;

  @ManyToOne(() => Batch, (batch) => batch.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'batch_id' })
  batch: Batch;
}
