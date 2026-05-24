import { Injectable, NotFoundException } from '@nestjs/common';
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
    files: Express.Multer.File[],
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

  async findPendingBatchesForPrediction(userId: number, page: number = 1, stainType?: string) {
    const limit = 5;
    const skip = (page - 1) * limit;

    const query = this.batchRepository
      .createQueryBuilder('batch')
      .innerJoin('batch.images', 'image')
      .where('batch.user = :userId', { userId })
      .andWhere('image.image_status = :status', { status: 'pending' });

    if (stainType) {
      query.andWhere('batch.stain_type = :stainType', { stainType });
    }

    query.select([
      'batch.batch_id',
      'batch.smear_id',
      'batch.chicken_type',
      'batch.age',
      'batch.province',
      'image.image_id',
      'image.image_name',
      'image.image_status',
      'image.image_path',
    ]);

    query.skip(skip).take(limit);

    const [data, total] = await query.getManyAndCount();

    if (data.length === 0) {
      throw new NotFoundException('ไม่พบชุดข้อมูลรูปภาพเม็ดเลือดไก่ที่รอการทำนายผล');
    }

    return {
      data,
      meta: {
        total_items: total,
        current_page: Number(page),
        per_page: limit,
        total_pages: Math.ceil(total / limit),
      }
    };
  }
}
