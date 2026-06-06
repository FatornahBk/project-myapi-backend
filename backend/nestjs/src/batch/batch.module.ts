import { Module } from '@nestjs/common';
import { BatchService } from './batch.service';
import { BatchController } from './batch.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Batch } from './entities/batch.entity';
import { Image } from './entities/image.entity';
import { PredictionBatchController } from './prediction.batch.controller';
import { Prediction } from '../prediction/entities/prediction.entity';
import { ManageDataController } from './manage-data.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Batch, Image, Prediction])],
  controllers: [ManageDataController, BatchController, PredictionBatchController],
  providers: [BatchService],
  exports: [BatchService],
})
export class BatchModule {}
