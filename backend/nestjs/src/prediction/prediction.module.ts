import { Module } from '@nestjs/common';
import { PredictionService } from './prediction.service';
import { PredictionController } from './prediction.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Prediction } from './entities/prediction.entity';
import { Image } from '../batch/entities/image.entity';
import { Detection } from './entities/detection.entity';
import { Batch } from 'src/batch/entities/batch.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Prediction, Detection, Image, Batch])],
  controllers: [PredictionController],
  providers: [PredictionService],
})
export class PredictionModule {}
