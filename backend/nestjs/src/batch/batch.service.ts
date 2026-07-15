import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Batch } from './entities/batch.entity';
import { Repository } from 'typeorm';
import { Image } from './entities/image.entity';
import { CreateBatchDto } from './dto/create-batch.dto';
import { GetManageDataDto } from './dto/get-manage-data.dto';
import { GetHomeDataDto } from './dto/get-home-data.dto';

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

  async findPendingBatchesForPrediction(
    userId: number,
    page: number = 1,
    stainType?: string,
    smearId?: string,
    chickenType?: string,
    startDate?: string,
    endDate?: string,
  ) {
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

    if (smearId) {
      query.andWhere('batch.smear_id LIKE :smearId', { smearId: `%${smearId}%` });
    }

    if (chickenType) {
      query.andWhere('batch.chicken_type = :chickenType', { chickenType });
    }

    if (startDate && endDate) {
      query.andWhere('batch.created_at BETWEEN :startDate AND :endDate', {
        startDate: `${startDate} 00:00:00`,
        endDate: `${endDate} 23:59:59`,
      });
    }

    query.select([
      'batch.batch_id',
      'batch.smear_id',
      'batch.chicken_type',
      'batch.age',
      'batch.province',
      'batch.stain_type',
      'batch.created_at',
      'image.image_id',
      'image.image_name',
      'image.image_status',
      'image.image_path',
    ]);

    query.skip(skip).take(limit);

    const [data, total] = await query.getManyAndCount();

    if (data.length === 0) {
      throw new NotFoundException(
        'ไม่พบชุดข้อมูลรูปภาพเม็ดเลือดไก่ที่รอการทำนายผล',
      );
    }

    return {
      data,
      meta: {
        total_items: total,
        current_page: Number(page),
        per_page: limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async getManageData(queryDto: GetManageDataDto) {
    const {
      page = 1,
      limit = 10,
      email,
      startDate,
      endDate,
      stain_type,
      status,
    } = queryDto;
    const skip = (page - 1) * limit;

    const total_images = await this.imageRepository.count();
    const total_batches = await this.batchRepository.count();
    const total_wright = await this.batchRepository.count({
      where: { stain_type: 'Wright' },
    });
    const total_giemsa = await this.batchRepository.count({
      where: { stain_type: 'Giemsa' },
    });

    const query = this.batchRepository
      .createQueryBuilder('batch')
      .leftJoinAndSelect('batch.user', 'user')
      .leftJoinAndSelect('batch.images', 'image');

    if (email) {
      query.andWhere('user.email LIKE :email', { email: `%${email}%` });
    }

    if (startDate && endDate) {
      query.andWhere('batch.created_at BETWEEN :startDate AND :endDate', {
        startDate: `${startDate} 00:00:00`,
        endDate: `${endDate} 23:59:59`,
      });
    }

    if (stain_type) {
      query.andWhere('batch.stain_type = :stain_type', { stain_type });
    }

    if (status) {
      if (status === 'completed') {
        // เงื่อนไข: Batch นั้นต้องไม่มีรูปไหนเลยที่สถานะเป็น pending
        query
          .andWhere((qb) => {
            const subQuery = qb
              .subQuery()
              .select('img.batch_id')
              .from(Image, 'img')
              .where('img.image_status = :pendingStatus')
              .getQuery();
            return `batch.batch_id NOT IN ${subQuery}`;
          })
          .setParameter('pendingStatus', 'pending');
      } else if (status === 'pending') {
        // เงื่อนไข: Batch นั้นมีรูปที่สถานะเป็น pending อย่างน้อย 1 รูป
        query
          .andWhere((qb) => {
            const subQuery = qb
              .subQuery()
              .select('img.batch_id')
              .from(Image, 'img')
              .where('img.image_status = :pendingStatus')
              .getQuery();
            return `batch.batch_id IN ${subQuery}`;
          })
          .setParameter('pendingStatus', 'pending');
      }
    }

    const [batches, total_items] = await query
      .orderBy('batch.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const table_data = batches.map((batch) => {
      const allImagesCompleted = batch.images.every(
        (img) => img.image_status === 'completed',
      );
      const batchStatus =
        allImagesCompleted && batch.images.length > 0 ? 'completed' : 'pending';

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
      },
    };
  }

  async getBatchDetails(batchId: number) {
    const batch = await this.batchRepository.findOne({
      where: { batch_id: batchId },
      relations: [
        'user',
        'images',
        'images.prediction',
        'images.prediction.detections',
      ],
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
      veterinary_license: batch.user.veterinary_license,
    };

    return {
      ...batch,
      user: safeUser,
    };
  }

  async deleteBatch(batchId: number) {
    const batch = await this.batchRepository.findOne({
      where: { batch_id: batchId },
    });
    if (!batch) {
      throw new NotFoundException('ไม่พบชุดข้อมูลนี้ในระบบ');
    }

    await this.batchRepository.remove(batch);

    return { message: `ลบชุดข้อมูลรหัส ${batch.smear_id} สำเร็จแล้ว` };
  }

  async getHomeFeed(queryDto: GetHomeDataDto) {
    const {
      page = 1,
      limit = 20,
      search,
      chicken_type,
      startDate,
      endDate,
    } = queryDto;
    const skip = (page - 1) * limit;

    const query = this.batchRepository
      .createQueryBuilder('batch')
      .leftJoinAndSelect('batch.user', 'user')
      .leftJoinAndSelect('batch.images', 'image')
      .leftJoinAndSelect('image.prediction', 'prediction')
      .leftJoinAndSelect('prediction.detections', 'detection')
      .where((qb) => {
        const subQuery = qb
          .subQuery()
          .select('img.batch_id')
          .from('images', 'img')
          .where("img.image_status = 'completed'")
          .getQuery();
        return `batch.batch_id IN ${subQuery}`;
      });

    if (search) {
      query.andWhere(
        '(batch.province LIKE :search OR user.first_name LIKE :search OR user.last_name LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (chicken_type) {
      query.andWhere('batch.chicken_type = :chicken_type', { chicken_type });
    }

    if (startDate && endDate) {
      query
        .andWhere((qb) => {
          const subQuery = qb
            .subQuery()
            .select('img.batch_id')
            .from('images', 'img')
            .innerJoin('img.prediction', 'pred')
            .where('pred.predicted_at BETWEEN :startDate AND :endDate')
            .getQuery();
          return `batch.batch_id IN ${subQuery}`;
        })
        .setParameters({
          startDate: `${startDate} 00:00:00`,
          endDate: `${endDate} 23:59:59`,
        });
    }

    query.orderBy('batch.created_at', 'DESC');

    const [batches, total_items] = await query
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const formattedData = batches.map((batch) => {
      const totalImagesInBatch = batch.images.length;
      const completedImages = batch.images.filter(
        (img) => img.image_status === 'completed',
      );

      const batchStatus =
        completedImages.length === totalImagesInBatch && totalImagesInBatch > 0
          ? 'completed'
          : 'pending';

      const latestPrediction = completedImages.reduce(
        (latest, img) => {
          if (!img.prediction) return latest;
          return !latest || img.prediction.predicted_at > latest
            ? img.prediction.predicted_at
            : latest;
        },
        null as Date | null,
      );

      return {
        batch_id: batch.batch_id,
        smear_id: batch.smear_id,
        chicken_type: batch.chicken_type,
        province: batch.province,
        age: batch.age,
        stain_type: batch.stain_type,
        description: batch.description || '-',
        status: batchStatus,
        predicted_at: latestPrediction,

        owner: {
          first_name: batch.user?.first_name || 'ไม่ระบุ',
          last_name: batch.user?.last_name || 'ไม่ระบุ',
          profile_image: batch.user?.profile_image || null,
        },

        images: completedImages.map((img) => {
          // --- เริ่มต้นส่วนคำนวณจำนวนเซลล์รวมและเปอร์เซ็นต์ต่อ 1 รูปภาพ ---
          let totalCellsInImage = 0;
          let cellPercentages = {
            Heterophil: 0,
            Eosinophil: 0,
            Basophil: 0,
            Lymphocyte: 0,
            Monocyte: 0,
            Thrombocyte: 0,
          };

          if (img.prediction) {
            // 1. รวมจำนวนเซลล์ทุกชนิดในภาพนี้
            totalCellsInImage =
              (img.prediction.numOfHeterophils || 0) +
              (img.prediction.numOfEosinophils || 0) +
              (img.prediction.numOfBasophils || 0) +
              (img.prediction.numOfLymphocytes || 0) +
              (img.prediction.numOfMonocytes || 0) +
              (img.prediction.numOfThrombocytes || 0);

            // 2. ฟังก์ชันช่วยคำนวณหา % (ปัดเศษทศนิยม 2 ตำแหน่ง)
            const getPercentage = (count: number) => {
              if (totalCellsInImage === 0) return 0;
              return Number(((count / totalCellsInImage) * 100).toFixed(2));
            };

            // 3. กำหนดค่าเปอร์เซ็นต์ของแต่ละเซลล์
            cellPercentages = {
              Heterophil: getPercentage(img.prediction.numOfHeterophils),
              Eosinophil: getPercentage(img.prediction.numOfEosinophils),
              Basophil: getPercentage(img.prediction.numOfBasophils),
              Lymphocyte: getPercentage(img.prediction.numOfLymphocytes),
              Monocyte: getPercentage(img.prediction.numOfMonocytes),
              Thrombocyte: getPercentage(img.prediction.numOfThrombocytes),
            };
          }
          // --- สิ้นสุดส่วนคำนวณ ---

          return {
            image_id: img.image_id,
            image_name: img.image_name,
            image_path: img.image_path,
            total_cells_in_image: totalCellsInImage, // แทรกจำนวนเซลล์ทั้งหมดของภาพนี้
            prediction: img.prediction
              ? {
                  prediction_id: img.prediction.prediction_id,
                  predicted_at: img.prediction.predicted_at,
                  cell_counts: {
                    Heterophil: img.prediction.numOfHeterophils,
                    Eosinophil: img.prediction.numOfEosinophils,
                    Basophil: img.prediction.numOfBasophils,
                    Lymphocyte: img.prediction.numOfLymphocytes,
                    Monocyte: img.prediction.numOfMonocytes,
                    Thrombocyte: img.prediction.numOfThrombocytes,
                  },
                  cell_percentages: cellPercentages, // แทรกเปอร์เซ็นต์ของแต่ละเซลล์
                  detections: img.prediction.detections.map((det) => ({
                    class_name: det.class_name,
                    confidence: det.confidence,
                    bbox: {
                      x1: det.x1,
                      y1: det.y1,
                      x2: det.x2,
                      y2: det.y2,
                      width: det.width,
                      height: det.height,
                    },
                  })),
                }
              : null,
          };
        }),
      };
    });

    return {
      message: 'ดึงข้อมูลหน้า Home สำเร็จ',
      data: formattedData,
      meta: {
        total_items,
        current_page: Number(page),
        per_page: Number(limit),
        total_pages: Math.ceil(total_items / limit),
      },
    };
  }
}
