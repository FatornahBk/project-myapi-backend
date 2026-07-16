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
      throw new BadRequestException('Passwords do not match.');
    }

    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('This email address is already in use.');
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
      message: 'Registration successful.',
      user: result,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (!user.is_verified) {
      throw new UnauthorizedException('Your account has not been approved yet.');
    }

    const payload = { 
      sub: user.user_id, 
      email: user.email, 
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
      profile_image: user.profile_image,
    };
    const token = this.jwtService.sign(payload);
    return { access_token: token };
  }
}
