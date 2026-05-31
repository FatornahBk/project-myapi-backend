import { Batch } from 'src/batch/entities/batch.entity';
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  user_id: number;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password_hash: string;

  @Column({ nullable: true })
  profile_image: string;

  @Column({ default: 'user' })
  role: string;

  @Column()
  veterinary_license: string;

  @Column({type: 'tinyint', default: 0})
  is_verified: number;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  verified_at: Date;

  @OneToMany(() => Batch, (batch) => batch.user)
  batches: Batch[];
}
