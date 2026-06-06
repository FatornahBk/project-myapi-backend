import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Batch } from './entities/batch.entity';
import { Repository } from 'typeorm';
import { Image } from './entities/image.entity';
import { CreateBatchDto } from './dto/create-batch.dto';
import { GetManageDataDto } from './dto/get-manage-data.dto';

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

  async getManageData(queryDto: GetManageDataDto) {
    const { page = 1, limit = 10, email, startDate, endDate, stain_type, status } = queryDto;
    const skip = (page - 1) * limit;

    const total_images = await this.imageRepository.count();
    const total_batches = await this.batchRepository.count();
    const total_wright = await this.batchRepository.count({ where: { stain_type: 'Wright' } });
    const total_giemsa = await this.batchRepository.count({ where: { stain_type: 'Giemsa' } });

    const query = this.batchRepository.createQueryBuilder('batch')
      .leftJoinAndSelect('batch.user', 'user')
      .leftJoinAndSelect('batch.images', 'image');

    if (email) {
      query.andWhere('user.email LIKE :email', { email: `%${email}%` });
    }

    if (startDate && endDate) {
      query.andWhere('batch.created_at BETWEEN :startDate AND :endDate', { 
        startDate: `${startDate} 00:00:00`, 
        endDate: `${endDate} 23:59:59` 
      });
    }

    if (stain_type) {
      query.andWhere('batch.stain_type = :stain_type', { stain_type });
    }

    if (status) {
      if (status === 'completed') {
        // เงื่อนไข: Batch นั้นต้องไม่มีรูปไหนเลยที่สถานะเป็น pending
        query.andWhere((qb) => {
          const subQuery = qb.subQuery()
            .select('img.batch_id')
            .from(Image, 'img')
            .where('img.image_status = :pendingStatus')
            .getQuery();
          return `batch.batch_id NOT IN ${subQuery}`;
        }).setParameter('pendingStatus', 'pending');
      } else if (status === 'pending') {
        // เงื่อนไข: Batch นั้นมีรูปที่สถานะเป็น pending อย่างน้อย 1 รูป
        query.andWhere((qb) => {
          const subQuery = qb.subQuery()
            .select('img.batch_id')
            .from(Image, 'img')
            .where('img.image_status = :pendingStatus')
            .getQuery();
          return `batch.batch_id IN ${subQuery}`;
        }).setParameter('pendingStatus', 'pending');
      }
    }

    const [batches, total_items] = await query
      .orderBy('batch.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const table_data = batches.map(batch => {
      const allImagesCompleted = batch.images.every(img => img.image_status === 'completed');
      const batchStatus = allImagesCompleted && batch.images.length > 0 ? 'completed' : 'pending';

      return {
        batch_id: batch.batch_id,
        smear_id: batch.smear_id,
        owner_email: batch.user ? batch.user.email : 'ไม่ทราบ',
        description: batch.description || '-',
        chicken_type: batch.chicken_type, // ประเภทเม็ดเลือด/สายพันธุ์ไก่
        stain_type: batch.stain_type,
        total_images_in_batch: batch.images.length,
        status: batchStatus,
        created_at: batch.created_at,
      };
    });

    return {
      message: 'ดึงข้อมูล Manage Data สำเร็จ',
      statistics: {
        total_images,
        total_batches,
        total_wright,
        total_giemsa,
      },
      table_data,
      meta: {
        total_items,
        current_page: Number(page),
        per_page: Number(limit),
        total_pages: Math.ceil(total_items / limit),
      }
    };
  }

  async getBatchDetails(batchId: number) {
    const batch = await this.batchRepository.findOne({
      where: { batch_id: batchId },
      relations: ['user', 'images', 'images.prediction', 'images.prediction.detections'],
    });

    if (!batch) {
      throw new NotFoundException('ไม่พบชุดข้อมูลนี้ในระบบ');
    }

    const safeUser = {
      user_id: batch.user.user_id,
      first_name: batch.user.first_name,
      last_name: batch.user.last_name,
      email: batch.user.email,
      profile_image: batch.user.profile_image,
      veterinary_license: batch.user.veterinary_license
    };

    return {
      ...batch,
      user: safeUser, 
    };
  }

  async deleteBatch(batchId: number) {
    const batch = await this.batchRepository.findOne({ where: { batch_id: batchId } });
    if (!batch) {
      throw new NotFoundException('ไม่พบชุดข้อมูลนี้ในระบบ');
    }
    
    
    await this.batchRepository.remove(batch);
    
    return { message: `ลบชุดข้อมูลรหัส ${batch.smear_id} สำเร็จแล้ว` };
  }
}
