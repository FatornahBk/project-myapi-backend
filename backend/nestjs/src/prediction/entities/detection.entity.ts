import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Prediction } from './prediction.entity';

@Entity('detections')
export class Detection {
  @PrimaryGeneratedColumn()
  detection_id: number;

  @Column()
  class_name: string;

  @Column({ type: 'float' })
  confidence: number;

  @Column({ type: 'float' })
  x1: number;

  @Column({ type: 'float' })
  y1: number;

  @Column({ type: 'float' })
  x2: number;

  @Column({ type: 'float' })
  y2: number;

  @Column({ type: 'float' })
  width: number;

  @Column({ type: 'float' })
  height: number;

  @ManyToOne(() => Prediction, (prediction) => prediction.detections, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'prediction_id' })
  prediction: Prediction;
}
