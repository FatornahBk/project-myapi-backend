import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'ชื่อจริง' })
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiPropertyOptional({ description: 'นามสกุล' })
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiPropertyOptional({ 
    type: 'string', 
    format: 'binary', 
    description: 'ไฟล์รูปภาพโปรไฟล์ (ถ้ามี)' 
  })
  @IsOptional()
  profile_image?: any;
}