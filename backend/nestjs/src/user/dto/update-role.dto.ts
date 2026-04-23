import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

export class UpdateRoleDto {
  @ApiProperty({
    example: 'admin',
    enum: UserRole,
    description: 'ตำแหน่งใหม่ที่ต้องการเปลี่ยน',
  })
  @IsEnum(UserRole, { message: 'ตำแหน่งต้องเป็น admin หรือ user เท่านั้น' })
  @IsNotEmpty()
  role: UserRole;
}
