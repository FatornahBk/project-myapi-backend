import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  // @ApiTags('Register')
  @ApiOperation({ summary: 'สมัครสมาชิกสัตวแพทย์' })
  @ApiResponse({ status: 201, description: 'ลงทะเบียนสำเร็จ' })
  @ApiResponse({ status: 409, description: 'อีเมลนี้มีในระบบแล้ว' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  // @ApiTags('Login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'เข้าสู่ระบบเพื่อรับ Token' })
  @ApiResponse({ status: 200, description: 'เข้าสู่ระบบสำเร็จ คืนค่า access_token' })
  @ApiResponse({ status: 401, description: 'อีเมล รหัสผ่าน ไม่ถูกต้อง หรือยังไม่ได้ยืนยันตัวตน' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
