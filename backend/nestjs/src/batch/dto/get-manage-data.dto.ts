
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class GetManageDataDto {
  @ApiPropertyOptional({ description: 'หน้าปัจจุบัน', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'จำนวนรายการต่อหน้า', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'ค้นหาด้วยอีเมล (พิมพ์บางส่วนได้)' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'ตั้งแต่วันที่ (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'ถึงวันที่ (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'ประเภทการย้อม (เช่น Wright, Giemsa)' })
  @IsOptional()
  @IsString()
  stain_type?: string;

  @ApiPropertyOptional({ description: 'สถานะ (เช่น pending, completed)' })
  @IsOptional()
  @IsString()
  status?: string;
}