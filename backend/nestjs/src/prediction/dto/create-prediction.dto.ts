import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

class BBoxDto {
  @ApiProperty({ example: 1213.59 }) @IsNumber() x1: number;
  @ApiProperty({ example: 858.06 }) @IsNumber() y1: number;
  @ApiProperty({ example: 1381.17 }) @IsNumber() x2: number;
  @ApiProperty({ example: 1035.08 }) @IsNumber() y2: number;
  @ApiProperty({ example: 167.58 }) @IsNumber() width: number;
  @ApiProperty({ example: 177.02 }) @IsNumber() height: number;
}

class DetectionItemDto {
  @ApiProperty({ example: 0.9444 }) @IsNumber() confidence: number;
  @ApiProperty({ type: () => BBoxDto }) @ValidateNested() @Type(() => BBoxDto) bbox: BBoxDto;
}

class ClassDataDto {
  @ApiProperty({ example: 1 }) @IsNumber() count: number;
  @ApiProperty({ example: 0.9444 }) @IsNumber() avg_confidence: number;
  @ApiProperty({ type: [DetectionItemDto] }) @IsArray() @ValidateNested({ each: true }) @Type(() => DetectionItemDto) detections: DetectionItemDto[];
}

class ImagePredictionDto {
  @ApiProperty({ example: 1, description: 'ID ของรูปภาพอ้างอิงจากตาราง images' })
  @IsNumber() 
  image_id: number;

  @ApiProperty({ example: 'wright' }) @IsString() mode: string;
  @ApiProperty({ example: 'AVC2-47EOW_148.jpg' }) @IsString() filename: string;
  @ApiProperty({ example: 1 }) @IsNumber() total_detections: number;
  @ApiProperty({ example: ['Eosinophil'] }) @IsArray() classes_found: string[];
  @ApiProperty({
    example: {
      Eosinophil: {
        count: 1,
        avg_confidence: 0.9444,
        detections: [
          {
            confidence: 0.9444,
            bbox: { x1: 1213.59, y1: 858.06, x2: 1381.17, y2: 1035.08, width: 167.58, height: 177.02 }
          }
        ]
      }
    }
  })
  @IsObject() classes: Record<string, ClassDataDto>;
}

export class CreatePredictionDto {
  @ApiProperty({ example: 'ไก่พันธุ์ไข่ มีอาการซึม ตรวจพบพยาธิในทางเดินอาหาร', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'ประมวลผลชุดข้อมูลสำเร็จ' })
  @IsString() message: string;

  @ApiProperty({ example: 'wright' })
  @IsString() mode: string;

  @ApiProperty({ example: 1 })
  @IsNumber() total_images_processed: number;

  @ApiProperty({ type: [ImagePredictionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImagePredictionDto)
  data: ImagePredictionDto[];
}