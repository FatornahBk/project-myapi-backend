import { Injectable, BadRequestException } from '@nestjs/common';
import { CreatePredictionDto } from './dto/create-prediction.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Prediction } from './entities/prediction.entity';
import { Repository } from 'typeorm';
import { Detection } from './entities/detection.entity';
import { Image } from 'src/batch/entities/image.entity';
import { Batch } from 'src/batch/entities/batch.entity';

@Injectable()
export class PredictionService {
  constructor(
    @InjectRepository(Prediction)
    private predictionRepo: Repository<Prediction>,
    @InjectRepository(Detection) private detectionRepo: Repository<Detection>,
    @InjectRepository(Image) private imageRepo: Repository<Image>,
    @InjectRepository(Batch) private batchRepo: Repository<Batch>,
  ) {}

  async saveResultsPrediction(payload: CreatePredictionDto) {
    let savedImagesCount = 0;
    let isDescriptionUpdated = false;

    for (const imgData of payload.data) {
      try {
        const image = await this.imageRepo.findOne({
          where: { image_id: imgData.image_id },
          relations: ['batch'],
        });

        if (!image) {
          console.log(
            `ข้ามไฟล์: ไม่พบภาพ ID ${imgData.image_id} (ชื่อไฟล์: ${imgData.filename}) ในระบบฐานข้อมูล`,
          );
          continue;
        }

        const isAlreadySaved = await this.predictionRepo.findOne({
          where: { image: { image_id: image.image_id } },
        });

        if (isAlreadySaved) {
          console.log(`ข้ามไฟล์: ภาพ ${imgData.filename} เคยรับผลทำนายไปแล้ว`);
          continue;
        }

        if (image.batch && payload.description && !isDescriptionUpdated) {
          image.batch.description = payload.description;
          await this.batchRepo.save(image.batch);
          isDescriptionUpdated = true;
        }

        const cellCounts = {
          Heterophil: 0,
          Eosinophil: 0,
          Basophil: 0,
          Lymphocyte: 0,
          Monocyte: 0,
          Thrombocyte: 0,
        };
        const cellAvgConfs = {
          Heterophil: 0,
          Eosinophil: 0,
          Basophil: 0,
          Lymphocyte: 0,
          Monocyte: 0,
          Thrombocyte: 0,
        };
        const detailedDetections: Detection[] = [];

        for (const [className, classValue] of Object.entries(imgData.classes)) {
          if (cellCounts[className] !== undefined) {
            cellCounts[className] = classValue.count;
            cellAvgConfs[className] = classValue.avg_confidence;
          }

          // วนลูปพิกัดกล่องของเซลล์ประเภทนั้นๆ เพื่อจัดเก็บลงอาเรย์ย่อย
          for (const det of classValue.detections) {
            const bboxRecord = this.detectionRepo.create({
              class_name: className,
              confidence: det.confidence,
              x1: det.bbox.x1,
              y1: det.bbox.y1,
              x2: det.bbox.x2,
              y2: det.bbox.y2,
              width: det.bbox.width,
              height: det.bbox.height,
            });
            detailedDetections.push(bboxRecord);
          }
        }

        const predictionRecord = this.predictionRepo.create({
          numOfHeterophils: cellCounts.Heterophil,
          numOfEosinophils: cellCounts.Eosinophil,
          numOfBasophils: cellCounts.Basophil,
          numOfLymphocytes: cellCounts.Lymphocyte,
          numOfMonocytes: cellCounts.Monocyte,
          numOfThrombocytes: cellCounts.Thrombocyte,
          confidenceHeterophils: cellAvgConfs.Heterophil,
          confidenceEosinophils: cellAvgConfs.Eosinophil,
          confidenceBasophils: cellAvgConfs.Basophil,
          confidenceLymphocytes: cellAvgConfs.Lymphocyte,
          confidenceMonocytes: cellAvgConfs.Monocyte,
          confidenceThrombocytes: cellAvgConfs.Thrombocyte,
          image: image,
          detections: detailedDetections,
        });

        await this.predictionRepo.save(predictionRecord);

        image.image_status = 'completed';
        await this.imageRepo.save(image);

        savedImagesCount++;
      } catch (error) {
        console.log(
          `พบบั๊กขณะประมวลผลเซฟภาพ ${imgData.filename}: ${error.message}`,
        );
      }
    }

    if (savedImagesCount === 0) {
      throw new BadRequestException('ไม่สามารถบันทึกข้อมูลผลลัพธ์การทำนายได้เลยแม้แต่รายการเดียว');
    }
    

    return {
      success: true,
      message: 'บันทึกคำอธิบายลักษณะอาการและพิกัดเซลล์เม็ดเลือดไก่ลงระบบสำเร็จ',
      total_images_submitted: payload.data.length,
      total_images_saved: savedImagesCount,
    };
  }
}
