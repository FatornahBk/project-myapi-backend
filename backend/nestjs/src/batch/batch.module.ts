import { Module } from '@nestjs/common';
import { BatchService } from './batch.service';
import { BatchController } from './batch.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Batch } from './entities/batch.entity';
import { Image } from './entities/image.entity';
import { PredictionBatchController } from './prediction.batch.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Batch, Image])],
  controllers: [BatchController, PredictionBatchController],
  providers: [BatchService],
})
export class BatchModule {}
