import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Batch } from './entities/batch.entity';
import { Repository } from 'typeorm';
import { Image } from './entities/image.entity';
import { CreateBatchDto } from './dto/create-batch.dto';

@Injectable()
export class BatchService {
  constructor(
    @InjectRepository(Batch) private batchRepository: Repository<Batch>,
    @InjectRepository(Image) private imageRepository: Repository<Image>,
  ) {}

  async createBatchWithImages(
    userId: number,
    createBatchDto: CreateBatchDto,
    files: Express.Multer.File[]
  ) {
    const newBatch = this.batchRepository.create({
      ...createBatchDto,
      user: { user_id: userId },
    });

    const savedBatch = await this.batchRepository.save(newBatch);

    const imagesToSave = files.map((file) => {
      return this.imageRepository.create({
        image_name: file.originalname,
        image_path: file.path,
        batch: savedBatch,
      });
    });

    await this.imageRepository.save(imagesToSave);

    return {
      message: 'อัปโหลดข้อมูลและรูปภาพสำเร็จ!',
      batch_id: savedBatch.batch_id,
      total_images: imagesToSave.length,
    };
  }
}
