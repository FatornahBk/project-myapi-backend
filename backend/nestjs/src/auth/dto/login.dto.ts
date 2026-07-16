import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'somchai.vet@example.com',
    description: 'อีเมลของสัตวแพทย์ที่ยืนยันตัวตนแล้ว',
  })
  @IsEmail({}, { message: 'Invalid email address.' })
  email: string;

  @ApiProperty({ example: 'password123', description: 'รหัสผ่าน' })
  @IsString()
  @IsNotEmpty({ message: 'Password is required.' })
  password: string;
}
