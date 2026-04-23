import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'สมชาย', description: 'ชื่อจริงของสัตวแพทย์' })
  @IsString()
  @IsNotEmpty({ message: 'กรุณากรอกชื่อจริง' })
  first_name: string;

  @ApiProperty({ example: 'ไข่แลน', description: 'นามสกุล' })
  @IsString()
  @IsNotEmpty({ message: 'กรุณากรอกนามสกุล' })
  last_name: string;

  @ApiProperty({ example: 'somchai.vet@example.com', description: 'อีเมลที่ใช้สำหรับเข้าสู่ระบบและติดต่อ' })
  @IsEmail({}, { message: 'รูปแบบอีเมลไม่ถูกต้อง' })
  email: string;

  @ApiProperty({ example: 'password123', description: 'รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)' })
  @IsString()
  @MinLength(6, { message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' })
  password: string;

  @ApiProperty({ example: 'password123', description: 'ยืนยันรหัสผ่าน (ต้องตรงกับช่อง password)' })
  @IsString()
  @IsNotEmpty({ message: 'กรุณายืนยันรหัสผ่าน' })
  confirmPassword: string;

  @ApiProperty({ example: 'VET-12345', description: 'เลขที่ใบประกอบวิชาชีพสัตวแพทย์' })
  @IsString()
  @IsNotEmpty({ message: 'กรุณากรอกเลขที่ใบประกอบวิชาชีพสัตวแพทย์' })
  veterinary_license: string;
}
