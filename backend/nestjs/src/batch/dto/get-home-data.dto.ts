import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class GetHomeDataDto {
  @ApiPropertyOptional({ description: 'ค้นหาด้วยชื่อ-นามสกุล หรือจังหวัด' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'กรองตามสายพันธุ์/ประเภทไก่' })
  @IsOptional()
  @IsString()
  chicken_type?: string;

  @ApiPropertyOptional({ description: 'ตั้งแต่วันที่ทำนายผล (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'ถึงวันที่ทำนายผล (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'หน้าปัจจุบัน', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'จำนวนรายการต่อหน้า', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}