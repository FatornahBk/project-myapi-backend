import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'สมชาย', description: 'ชื่อจริงของสัตวแพทย์' })
  @IsString()
  @IsNotEmpty({ message: 'Please enter your first name.' })
  first_name: string;

  @ApiProperty({ example: 'ไข่แลน', description: 'นามสกุล' })
  @IsString()
  @IsNotEmpty({ message: 'Please enter your last name.' })
  last_name: string;

  @ApiProperty({ example: 'somchai.vet@example.com', description: 'อีเมลที่ใช้สำหรับเข้าสู่ระบบและติดต่อ' })
  @IsEmail({}, { message: 'Invalid email address.' })
  email: string;

  @ApiProperty({ example: 'password123', description: 'รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long.' })
  password: string;

  @ApiProperty({ example: 'password123', description: 'ยืนยันรหัสผ่าน (ต้องตรงกับช่อง password)' })
  @IsString()
  @IsNotEmpty({ message: 'Please confirm your password.' })
  confirmPassword: string;

  @ApiProperty({ example: 'VET-12345', description: 'เลขที่ใบประกอบวิชาชีพสัตวแพทย์' })
  @IsString()
  @IsNotEmpty({ message: 'Veterinary license number is required.' })
  veterinary_license: string;
}
