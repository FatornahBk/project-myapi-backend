import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { UpdateRoleDto } from './dto/update-role.dto';
import * as fs from 'fs';
import * as path from 'path';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private readonly mailerService: MailerService,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async create(userData: Partial<User>): Promise<User> {
    const newUser = this.userRepository.create(userData);
    return this.userRepository.save(newUser);
  }

  async findAllUsers(roleFilter?: string) {
    const whereCondition = roleFilter ? { role: roleFilter } : {};

    return await this.userRepository.find({
      where: whereCondition,
      select: [
        'user_id',
        'first_name',
        'last_name',
        'email',
        'veterinary_license',
        'role',
        'is_verified',
        'created_at',
      ],
      order: { created_at: 'DESC' },
    });
  }

  async updateRole(id: number, updateRoleDto: UpdateRoleDto) {
    const user = await this.userRepository.findOne({ where: { user_id: id } });
    if (!user) {
      throw new BadRequestException('ไม่พบผู้ใช้งานที่ต้องการแก้ไข');
    }

    user.role = updateRoleDto.role;
    await this.userRepository.save(user);

    return {
      message: `เปลี่ยนตำแหน่งของ ${user.first_name} เป็น ${user.role} เรียบร้อยแล้ว`,
    };
  }

  async removeUser(id: number, adminId: number) {
    if (id === adminId) {
      throw new BadRequestException('คุณไม่สามารถลบบัญชีของตัวเองได้');
    }

    const user = await this.userRepository.findOne({
      where: { user_id: id },
      relations: ['batches', 'batches.images'],
    });
    if (!user) {
      throw new BadRequestException('ไม่พบผู้ใช้งานที่ต้องการลบ');
    }

    if (user.batches && user.batches.length > 0) {
      for (const batch of user.batches) {
        if (batch.images && batch.images.length > 0) {
          for (const image of batch.images) {
            const filePath = path.join(process.cwd(), image.image_path);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          }
        }
      }
    }

    await this.userRepository.delete(id);

    return {
      message: `ลบบัญชีของ ${user.first_name} ${user.last_name} เรียบร้อยแล้ว`,
    };
  }

  async approveUser(id: number) {
    const user = await this.userRepository.findOne({ where: { user_id: id } });
    if (!user) {
      throw new BadRequestException('ไม่พบผู้ใช้งานที่ต้องการอนุมัติ');
    }

    if (user.is_verified) {
      throw new BadRequestException('บัญชีนี้ได้รับการอนุมัติไปแล้ว');
    }

    user.is_verified = true;
    user.verified_at = new Date();
    await this.userRepository.save(user);

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: 'ยืนยันการอนุมัติบัญชี - Avian Blood System',
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #2e7d32;">บัญชีของคุณได้รับการอนุมัติแล้ว 🎉</h2>
            <p>สวัสดีครับคุณ <b>${user.first_name} ${user.last_name}</b>,</p>
            <p>ผู้ดูแลระบบได้ทำการตรวจสอบและอนุมัติบัญชีสัตวแพทย์ของคุณเรียบร้อยแล้วเมื่อวันที่ ${user.verified_at.toLocaleString('th-TH')}</p>
            <p>ขณะนี้คุณสามารถเข้าสู่ระบบ <b>Avian Blood</b> ได้ทันที</p>
            <br>
            <hr style="border: 0; border-top: 1px solid #eee;">
            <small style="color: #888;">นี่เป็นอีเมลแจ้งเตือนอัตโนมัติ กรุณาอย่าตอบกลับ</small>
          </div>
        `,
      });
    } catch (err) {
      console.log('เกิดข้อผิดพลาดในการส่งอีเมล:', err);
    }

    return {
      message: `อนุมัติบัญชีของ ${user.email} และส่งอีเมลแจ้งเตือนเรียบร้อยแล้ว`
    };
  }

  async findUnverifiedUsers() {
    return await this.userRepository.find({
      where: { is_verified: false },
      select: [
        'user_id',
        'first_name',
        'last_name',
        'email',
        'veterinary_license',
        'role',
        'created_at',
      ],
      order: { created_at: 'ASC' },
    });
  }
}
