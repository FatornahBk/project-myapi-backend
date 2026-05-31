import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository, Between, Like, MoreThanOrEqual } from 'typeorm';
import { UpdateRoleDto } from './dto/update-role.dto';
import * as fs from 'fs';
import * as path from 'path';
import { MailerService } from '@nestjs-modules/mailer';
import { GetDashboardDto } from './dto/get-dashboard.dto';
import { Image } from 'src/batch/entities/image.entity';
import { Detection } from 'src/prediction/entities/detection.entity';
import { Batch } from 'src/batch/entities/batch.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Batch) private batchRepository: Repository<Batch>,
    @InjectRepository(Image) private imageRepository: Repository<Image>,
    @InjectRepository(Detection) private detectionRepository: Repository<Detection>,
    private readonly mailerService: MailerService,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async create(userData: Partial<User>): Promise<User> {
    const newUser = this.userRepository.create(userData);
    return this.userRepository.save(newUser);
  }

  async findAllUsers(roleFilter?: string, searchEmail?: string) {
    const whereCondition: any = {
      is_verified: 1,
    };

    if (roleFilter) {
      whereCondition.role = roleFilter;
    }

    if (searchEmail) {
      whereCondition.email = Like(`%${searchEmail}%`);
    }

    const [users, totalCount, activeCount, suspendedCount] = await Promise.all([
      this.userRepository.find({
        where: whereCondition,
        select: [
          'user_id',
          'first_name',
          'last_name',
          'email',
          'profile_image',
          'veterinary_license',
          'role',
          'is_verified',
          'created_at',
          'verified_at',
          'is_active',
        ],
        order: { created_at: 'ASC' },
      }),

      this.userRepository.count({
        where: { is_verified: 1 },
      }),

      this.userRepository.count({
        where: { is_verified: 1, is_active: true },
      }),

      this.userRepository.count({
        where: { is_active: false },
      }),
    ]);

    return {
      summary: {
        total_users: totalCount,
        active_accounts: activeCount,
        suspended: suspendedCount,
      },
      data: users,
    };
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

  async suspendUser(id: number, adminId: number) {
    if (id === adminId) {
      throw new BadRequestException('คุณไม่สามารถระงับบัญชีของตัวเองได้');
    }

    const user = await this.userRepository.findOne({ where: { user_id: id } });
    if (!user) {
      throw new BadRequestException('ไม่พบผู้ใช้งานที่ต้องการระงับ');
    }

    if (user.is_active === false) {
      throw new BadRequestException('บัญชีนี้ถูกระงับการใช้งานไปแล้ว');
    }

    // ทำการระงับบัญชีโดยเปลี่ยนสถานะเป็น false
    user.is_active = false;
    user.is_verified = 0;
    await this.userRepository.save(user);

    return {
      message: `ระงับบัญชีของ ${user.first_name} ${user.last_name} เรียบร้อยแล้ว`,
    };
  }

  async approveUser(id: number) {
    const user = await this.userRepository.findOne({ where: { user_id: id } });
    if (!user) {
      throw new BadRequestException('ไม่พบผู้ใช้งานที่ต้องการอนุมัติ');
    }

    if (user.is_verified === 1) {
      throw new BadRequestException('บัญชีนี้ได้รับการอนุมัติไปแล้ว');
    }

    user.is_verified = 1;
    user.is_active = true;
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
      message: `อนุมัติบัญชีของ ${user.email} และส่งอีเมลแจ้งเตือนเรียบร้อยแล้ว`,
    };
  }

  async findUnverifiedUsers(searchEmail?: string) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const whereCondition: any = {
      is_verified: 0,
    };

    if (searchEmail) {
      whereCondition.email = Like(`%${searchEmail}%`);
    }

    const [
      unverifiedUsers,
      pendingCount,
      approvedTodayCount,
      rejectedTodayCount,
    ] = await Promise.all([
      this.userRepository.find({
        where: whereCondition,
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
      }),

      this.userRepository.count({
        where: { is_verified: 0 },
      }),

      this.userRepository.count({
        where: {
          is_verified: 1,
          updated_at: Between(startOfToday, endOfToday),
        },
      }),

      this.userRepository.count({
        where: {
          is_verified: 2,
          updated_at: Between(startOfToday, endOfToday),
        },
      }),
    ]);

    let responseMessage = 'ดึงข้อมูลสำเร็จ';
    if (unverifiedUsers.length === 0) {
      responseMessage = 'ไม่มีผู้ใช้รอยืนยันบัญชีในขณะนี้';
    }

    return {
      message: responseMessage,
      summary: {
        pending: pendingCount,
        approved_today: approvedTodayCount,
        rejected_today: rejectedTodayCount,
      },
      data: unverifiedUsers,
    };
  }

  async rejectUser(id: number) {
    const user = await this.userRepository.findOne({ where: { user_id: id } });
    if (!user) {
      throw new BadRequestException('ไม่พบผู้ใช้งานที่ต้องการปฏิเสธ');
    }

    if (user.is_verified === 1) {
      throw new BadRequestException(
        'บัญชีนี้ได้รับการอนุมัติไปแล้ว ไม่สามารถปฏิเสธได้',
      );
    }

    if (user.is_verified === 2) {
      throw new BadRequestException('บัญชีนี้ถูกปฏิเสธไปแล้ว');
    }

    user.is_verified = 2;
    await this.userRepository.save(user);

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: 'แจ้งผลการตรวจสอบบัญชี - Avian Blood System',
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #d32f2f;">แจ้งผลการตรวจสอบบัญชี</h2>
            <p>สวัสดีครับคุณ <b>${user.first_name} ${user.last_name}</b>,</p>
            <p>ทางผู้ดูแลระบบได้ทำการตรวจสอบข้อมูลและใบอนุญาตสัตวแพทย์ของคุณแล้ว <b>แต่ไม่สามารถอนุมัติบัญชีของคุณได้ในขณะนี้</b></p>
            <p>อาจเกิดจากข้อมูลไม่ครบถ้วนหรือไม่ถูกต้อง หากมีข้อสงสัยหรือต้องการส่งข้อมูลเพิ่มเติม กรุณาติดต่อผู้ดูแลระบบ</p>
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
      message: `ปฏิเสธบัญชีของ ${user.email} และส่งอีเมลแจ้งเตือนเรียบร้อยแล้ว`,
    };
  }

  async getDashboardStats(queryDto: GetDashboardDto) {
    const { page = 1, limit = 3 } = queryDto;
    const skip = (page - 1) * limit;

    const total_users = await this.userRepository.count();
    const verified_users = await this.userRepository.count({
      where: { is_verified: 1 },
    });
    const unverified_users = await this.userRepository.count({
      where: { is_verified: 0 },
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const new_signups_this_week = await this.userRepository.count({
      where: { created_at: MoreThanOrEqual(sevenDaysAgo) },
    });

    const [pending_users_data, total_pending_items] =
      await this.userRepository.findAndCount({
        where: { is_verified: 0 },
        select: [
          'first_name',
          'last_name',
          'email',
          'veterinary_license',
          'created_at',
          'is_verified',
        ],
        order: { created_at: 'DESC' },
        skip,
        take: limit,
      });

    
    const completed_images = await this.imageRepository.count({
      where: { image_status: 'completed' },
    });
    const pending_images = await this.imageRepository.count({
      where: { image_status: 'pending' },
    });
    const total_images = completed_images + pending_images;

    const completed_percentage =
      total_images > 0
        ? ((completed_images / total_images) * 100).toFixed(2)
        : 0;
    const pending_percentage =
      total_images > 0 ? ((pending_images / total_images) * 100).toFixed(2) : 0;

    

    const total_batches = await this.batchRepository.count();

    // หาค่าเฉลี่ย Confidence ของระบบทั้งหมด
    const avgConfidenceResult = await this.detectionRepository
      .createQueryBuilder('det')
      .select('AVG(det.confidence)', 'avg')
      .getRawOne();
    const average_system_confidence = avgConfidenceResult?.avg
      ? (avgConfidenceResult.avg * 100).toFixed(2)
      : 0;

    // หาประเภทยอดฮิต (Top Chicken Type)
    const topChickenTypeResult = await this.batchRepository
      .createQueryBuilder('batch')
      .select('batch.chicken_type', 'type')
      .addSelect('COUNT(batch.batch_id)', 'count')
      .groupBy('batch.chicken_type')
      .orderBy('count', 'DESC')
      .limit(1)
      .getRawOne();

    // นับจำนวนเซลล์แยกตามชนิด (GROUP BY class_name)
    const cellStatsRaw = await this.detectionRepository
      .createQueryBuilder('det')
      .select('det.class_name', 'className')
      .addSelect('COUNT(det.detection_id)', 'count')
      .groupBy('det.class_name')
      .getRawMany();

    const total_cells_detected = {
      Heterophil: 0, Eosinophil: 0, Basophil: 0, Lymphocyte: 0, Monocyte: 0, Thrombocyte: 0
    };
    cellStatsRaw.forEach(stat => {
      if (total_cells_detected[stat.className] !== undefined) {
        total_cells_detected[stat.className] = Number(stat.count);
      }
    });

    const top_contributors = await this.userRepository
      .createQueryBuilder('user')
      .select(['user.user_id', 'user.first_name', 'user.last_name'])
      .addSelect('COUNT(batch.batch_id)', 'total_batches_submitted')
      .innerJoin('user.batches', 'batch')
      .groupBy('user.user_id')
      .orderBy('total_batches_submitted', 'DESC')
      .limit(3)
      .getRawMany();

    const recent_activities = pending_users_data.slice(0, 3).map((u, index) => ({
      id: index + 1,
      activity: `คุณหมอ ${u.first_name} ${u.last_name} ได้ลงทะเบียนเข้าสู่ระบบใหม่และรอกรรมการตรวจสอบ`,
      timestamp: u.created_at,
    }));

    return {
      message: 'ดึงข้อมูลสถิติหน้า Dashboard สำเร็จ',
      user_statistics: {
        total_users,
        verified_users,
        unverified_users,
        new_signups_this_week,
      },
      pending_users_table: {
        data: pending_users_data,
        meta: {
          total_items: total_pending_items,
          current_page: Number(page),
          per_page: Number(limit),
          total_pages: Math.ceil(total_pending_items / limit),
        }
      },
      prediction_statistics: {
        completed_images,
        pending_images,
        total_images,
        completed_percentage: Number(completed_percentage),
        pending_percentage: Number(pending_percentage),
        average_system_confidence: Number(average_system_confidence),
      },
      avian_blood_insights: {
        total_batches,
        top_chicken_type: topChickenTypeResult?.type || 'ยังไม่มีข้อมูล',
        total_cells_detected,
      },
      system_activities: recent_activities,
      top_contributors: top_contributors.map(c => ({
        user_id: c.user_user_id,
        first_name: c.user_first_name,
        last_name: c.user_last_name,
        total_batches_submitted: Number(c.total_batches_submitted)
      })),
    };
  }
}
