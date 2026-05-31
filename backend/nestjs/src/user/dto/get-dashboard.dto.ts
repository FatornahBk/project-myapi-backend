import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class GetDashboardDto {
  @ApiPropertyOptional({
    description: 'เลขหน้าของตารางรายชื่อสัตวแพทย์ที่รอยืนยันตัวตน',
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ 
    description: 'จำนวนรายการสัตวแพทย์รอยืนยันต่อรอบ', 
    default: 3, 
    example: 3 
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 3;
}
