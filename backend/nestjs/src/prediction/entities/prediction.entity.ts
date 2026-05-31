import { Image } from '../../batch/entities/image.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Detection } from './detection.entity';

@Entity('predictions')
export class Prediction {
  @PrimaryGeneratedColumn()
  prediction_id: number;

  @Column({ type: 'int', default: 0 })
  numOfHeterophils: number;

  @Column({ type: 'int', default: 0 })
  numOfEosinophils: number;

  @Column({ type: 'int', default: 0 })
  numOfBasophils: number;

  @Column({ type: 'int', default: 0 })
  numOfLymphocytes: number;

  @Column({ type: 'int', default: 0 })
  numOfMonocytes: number;

  @Column({ type: 'int', default: 0 })
  numOfThrombocytes: number;

  @Column({ type: 'float', default: 0 })
  confidenceHeterophils: number;

  @Column({ type: 'float', default: 0 })
  confidenceEosinophils: number;

  @Column({ type: 'float', default: 0 })
  confidenceBasophils: number;

  @Column({ type: 'float', default: 0 })
  confidenceLymphocytes: number;

  @Column({ type: 'float', default: 0 })
  confidenceMonocytes: number;

  @Column({ type: 'float', default: 0 })
  confidenceThrombocytes: number;

  @CreateDateColumn({ type: 'timestamp' })
  predicted_at: Date;

  @OneToOne(() => Image, (image) => image.prediction, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'image_id' })
  image: Image;

  @OneToMany(() => Detection, (detection) => detection.prediction, { cascade: true })
  detections: Detection[];
}
