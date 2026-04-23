import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const {
      first_name,
      last_name,
      email,
      password,
      confirmPassword,
      veterinary_license,
    } = registerDto;

    if (password !== confirmPassword) {
      throw new BadRequestException('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
    }

    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('อีเมลนี้ถูกใช้งานในระบบแล้ว');
    }

    const password_hash = await bcrypt.hash(password, 10);

    const savedUser = await this.userService.create({
      first_name,
      last_name,
      email,
      password_hash,
      veterinary_license,
    });

    const { password_hash: _, ...result } = savedUser;

    return {
      message: 'ลงทะเบียนสำเร็จ!',
      user: result,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    if (!user.is_verified) {
      throw new UnauthorizedException('บัญชียังไม่ได้รับการอนุมัติ');
    }

    const payload = { sub: user.user_id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);
    return { access_token: token };
  }
}
