import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository, Between, Like, MoreThanOrEqual, In } from 'typeorm';
import { UpdateRoleDto } from './dto/update-role.dto';
import * as fs from 'fs';
import * as path from 'path';
import { MailerService } from '@nestjs-modules/mailer';
import { GetDashboardDto } from './dto/get-dashboard.dto';
import { Image } from 'src/batch/entities/image.entity';
import { Detection } from 'src/prediction/entities/detection.entity';
import { Batch } from 'src/batch/entities/batch.entity';
import { GetProfileDto } from './dto/get-profile.dto';
import { NotFoundException } from '@nestjs/common';
import { UpdateProfileDto } from './dto/update-profile.dto';


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

  async findAllUsers(
    roleFilter?: string, 
    searchEmail?: string, 
    statusFilter?: string,
    page: number = 1,
    limit: number = 10,
  ) {

    const currentPage = Number(page) || 1;
    const perPage = Number(limit) || 10;
    const skip = (currentPage - 1) * perPage;

    const whereCondition: any = {
      is_verified: 1,
    };

    if (roleFilter) {
      whereCondition.role = roleFilter;
    }

    if (searchEmail) {
      whereCondition.email = Like(`%${searchEmail}%`);
    }

    if (statusFilter === 'active') {
      whereCondition.is_active = true;
    } else if (statusFilter === 'suspend') {
      whereCondition.is_active = false;
    }

    const [[users, filteredTotalCount], totalCount, activeCount, suspendedCount] = await Promise.all([
      this.userRepository.findAndCount({
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
        order: { created_at: 'DESC' },
        skip: skip,
        take: perPage,
      }),

      this.userRepository.count({
        where: { is_verified: 1 },
      }),

      this.userRepository.count({
        where: { is_verified: 1, is_active: true },
      }),

      this.userRepository.count({
        where: { is_verified: 1, is_active: false },
      }),
    ]);

    return {
      summary: {
        total_users: totalCount,
        active_accounts: activeCount,
        suspended: suspendedCount,
      },
      meta: {
        total_items: filteredTotalCount,
        current_page: currentPage,
        per_page: perPage,
        total_pages: Math.ceil(filteredTotalCount / perPage),
      },
      data: users,
    };
  }

  async updateRole(id: number, updateRoleDto: UpdateRoleDto) {
    const user = await this.userRepository.findOne({ where: { user_id: id } });
    if (!user) {
      throw new BadRequestException('User not found.');
    }

    user.role = updateRoleDto.role;
    await this.userRepository.save(user);

    return {
      message: `${user.first_name} role has been updated to ${user.role} successfully.`,
    };
  }

  async suspendUser(id: number, adminId: number) {
    if (id === adminId) {
      throw new BadRequestException('You cannot suspend your own account.');
    }

    const user = await this.userRepository.findOne({ where: { user_id: id } });
    if (!user) {
      throw new BadRequestException('User to suspend not found.');
    }

    if (user.is_active === false) {
      throw new BadRequestException('This account has already been suspended.');
    }

    // ทำการระงับบัญชีโดยเปลี่ยนสถานะเป็น false
    user.is_active = false;
    await this.userRepository.save(user);

    return {
      message: `${user.first_name} ${user.last_name} account has been suspended successfully.`,
    };
  }

  async approveUser(id: number) {
    const user = await this.userRepository.findOne({ where: { user_id: id } });
    if (!user) {
      throw new BadRequestException('User to approve not found.');
    }

    if (user.is_verified === 1) {
      throw new BadRequestException('This account has already been approved.');
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
      message: `Account ${user.email} has been approved and a notification email has been sent successfully.`,
    };
  }

  async findUnverifiedUsers(
    searchEmail?: string,
    statusFilter: string = 'all',
    page: number = 1,
    limit: number = 10,
  ) {
    const currentPage = Number(page) || 1;
    const perPage = Number(limit) || 10;
    const skip = (currentPage - 1) * perPage;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const whereCondition: any = {};

    if (statusFilter === 'pending') {
      whereCondition.is_verified = 0;
    } else if (statusFilter === 'reject') {
      whereCondition.is_verified = 2;
    } else {
      whereCondition.is_verified = In([0, 2]);
    }

    if (searchEmail) {
      whereCondition.email = Like(`%${searchEmail}%`);
    }

    const [
      [unverifiedUsers, filteredTotalCount],
      pendingCount,
      approvedTodayCount,
      rejectedTodayCount,
    ] = await Promise.all([
      this.userRepository.findAndCount({
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
        order: { created_at: 'ASC' },
        skip: skip,
        take: perPage,
      }),

      this.userRepository.count({
        where: { is_verified: 0 },
      }),

      this.userRepository.count({
        where: {
          is_verified: 1,
          verified_at: Between(startOfToday, endOfToday),
        },
      }),

      this.userRepository.count({
        where: {
          is_verified: 2,
          updated_at: Between(startOfToday, endOfToday),
        },
      }),
    ]);

    let responseMessage = 'Data retrieved successfully.';
    if (unverifiedUsers.length === 0) {
      responseMessage = 'No users are currently waiting for account approval.';
    }

    return {
      message: responseMessage,
      summary: {
        pending: pendingCount,
        approved_today: approvedTodayCount,
        rejected_today: rejectedTodayCount,
      },
      meta: {
        total_items: filteredTotalCount,
        current_page: currentPage,
        per_page: perPage,
        total_pages: Math.ceil(filteredTotalCount / perPage),
      },
      data: unverifiedUsers,
    };
  }

  async rejectUser(id: number) {
    const user = await this.userRepository.findOne({ where: { user_id: id } });
    if (!user) {
      throw new BadRequestException('User to reject not found.');
    }

    if (user.is_verified === 1) {
      throw new BadRequestException(
        'This account has already been approved and cannot be rejected.',
      );
    }

    if (user.is_verified === 2) {
      throw new BadRequestException('This account has already been rejected.');
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
      message: `Account ${user.email} has been rejected and a notification email has been sent successfully.`,
    };
  }

  async getDashboardStats(queryDto: GetDashboardDto) {
    const { page = 1, limit = 3 } = queryDto;
    const skip = (page - 1) * limit;

    const [
      total_users,
      pending_verification,
      dataset_images,
      total_batches,
      completed_batches_raw,
      [pending_users_data, total_pending_items]
    ] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { is_verified: 0 } }),
      this.imageRepository.count(),
      this.batchRepository.count(),
      
      this.batchRepository
        .createQueryBuilder('batch')
        .innerJoin('batch.images', 'image')
        .groupBy('batch.batch_id')
        .having("SUM(CASE WHEN image.image_status != 'completed' THEN 1 ELSE 0 END) = 0")
        .getRawMany(),

      this.userRepository.findAndCount({
        where: { is_verified: 0 },
        select: [
          'user_id',
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
      })
    ]);

    const prediction_jobs = completed_batches_raw.length;

    const pending_batches = total_batches - prediction_jobs;

    const completed_percentage = total_batches > 0
      ? ((prediction_jobs / total_batches) * 100).toFixed(2)
      : 0;

    const pending_percentage = total_batches > 0 
      ? ((pending_batches / total_batches) * 100).toFixed(2) 
      : 0;

    return {
      total_users,
      pending_verification,
      prediction_jobs,
      dataset_images,
      pending_users_table: {
        data: pending_users_data,
        meta: {
          total_items: total_pending_items,
          current_page: Number(page),
          per_page: Number(limit),
          total_pages: Math.ceil(total_pending_items / limit),
        }
      },
      prediction_status: {
        completed_percentage: Number(completed_percentage),
        pending_percentage: Number(pending_percentage),
      }
    };
  }

  // profile
  async getMyProfile(userId: number, queryDto: GetProfileDto) {
    const { smear_id, chicken_type, stain_type, startDate, endDate, page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;

    const user = await this.userRepository.findOne({
      where: { user_id: userId },
      select: ['user_id', 'first_name', 'last_name', 'profile_image', 'email', 'role'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const allUserBatches = await this.batchRepository.find({
      where: { user: { user_id: userId } },
      relations: ['images'],
    });

    let absoluteCompletedCount = 0;
    let absolutePendingCount = 0;

    for (const b of allUserBatches) {
      const totalImg = b.images.length;
      const completedImg = b.images.filter((img) => img.image_status === 'completed').length;
      if (totalImg > 0 && completedImg === totalImg) {
        absoluteCompletedCount++;
      } else {
        absolutePendingCount++;
      }
    }

    const query = this.batchRepository
      .createQueryBuilder('batch')
      .leftJoinAndSelect('batch.images', 'image')
      .leftJoinAndSelect('image.prediction', 'prediction')
      .leftJoinAndSelect('prediction.detections', 'detection')
      .where('batch.user_id = :userId', { userId });

    if (smear_id) {
      query.andWhere('batch.smear_id LIKE :smearId', { smearId: `%${smear_id}%` });
    }
    if (chicken_type) {
      query.andWhere('batch.chicken_type = :chicken_type', { chicken_type });
    }
    if (stain_type) {
      query.andWhere('batch.stain_type = :stain_type', { stain_type });
    }

    query.orderBy('batch.created_at', 'DESC');
    const batches = await query.getMany();

    let filterStart: Date | null = null;
    let filterEnd: Date | null = null;
    if (startDate && endDate) {
      filterStart = new Date(`${startDate}T00:00:00`);
      filterEnd = new Date(`${endDate}T23:59:59.999`);
    }

    const completed_batches: any[] = [];
    const pending_batches: any[] = [];

    for (const batch of batches) {
      const totalImages = batch.images.length;
      const completedImages = batch.images.filter((img) => img.image_status === 'completed');
      
      const isCompleted = totalImages > 0 && completedImages.length === totalImages;

      let latestPredictionDate: Date | null = null;
      if (isCompleted) {
        latestPredictionDate = completedImages.reduce((latest, img) => {
          if (!img.prediction) return latest;
          return !latest || img.prediction.predicted_at > latest
            ? img.prediction.predicted_at
            : latest;
        }, null as Date | null);
      }

      if (filterStart && filterEnd) {
        if (isCompleted) {
          if (!latestPredictionDate || latestPredictionDate < filterStart || latestPredictionDate > filterEnd) {
            continue; 
          }
        } else {
          if (batch.created_at < filterStart || batch.created_at > filterEnd) {
            continue; 
          }
        }
      }

      const formattedBatch = {
        batch_id: batch.batch_id,
        smear_id: batch.smear_id,
        chicken_type: batch.chicken_type,
        province: batch.province,
        age: batch.age,
        stain_type: batch.stain_type,
        description: batch.description,
        status: isCompleted ? 'completed' : 'pending',
        created_at: batch.created_at,
        predicted_at: isCompleted ? latestPredictionDate : null, 
        owner: {
          first_name: user.first_name,
          last_name: user.last_name,
          profile_image: user.profile_image,
        },
        images: batch.images.map((img) => ({
          image_id: img.image_id,
          image_name: img.image_name,
          image_status: img.image_status,
          image_path: img.image_path,
          prediction: img.prediction ? img.prediction : null,
        })),
      };

      if (isCompleted) {
        completed_batches.push(formattedBatch);
      } else {
        pending_batches.push(formattedBatch);
      }
    }

    const totalCompletedFiltered = completed_batches.length;
    const totalPendingFiltered = pending_batches.length;

    const paginatedCompleted = completed_batches.slice(skip, skip + limit);
    const paginatedPending = pending_batches.slice(skip, skip + limit);

    return {
      message: 'Profile and batch data retrieved successfully',
      profile: {
        first_name: user.first_name,
        last_name: user.last_name,
        profile_image: user.profile_image,
        email: user.email,
        role: user.role,
        total_completed_batches: absoluteCompletedCount, 
        total_pending_batches: absolutePendingCount,     
      },
      data: {
        completed_batches: {
          items: paginatedCompleted,
          meta: {
            total_items: totalCompletedFiltered,
            current_page: page,
            per_page: limit,
            total_pages: Math.ceil(totalCompletedFiltered / limit),
          }
        },
        pending_batches: {
          items: paginatedPending,
          meta: {
            total_items: totalPendingFiltered,
            current_page: page,
            per_page: limit,
            total_pages: Math.ceil(totalPendingFiltered / limit),
          }
        },
      },
    };
  }

  async deleteMyBatch(userId: number, batchId: number) {
    // ค้นหาชุดข้อมูลและตรวจสอบว่าเป็นของ User คนนี้จริงๆ
    const batch = await this.batchRepository.findOne({
      where: { 
        batch_id: batchId, 
        user: { user_id: userId } 
      },
      relations: ['images'],
    });

    if (!batch) {
      throw new NotFoundException('Batch not found, or you do not have permission to delete it');
    }

    // ลบไฟล์รูปภาพจริงๆ ออกจากระบบไฟล์ (โฟลเดอร์ uploads)
    if (batch.images && batch.images.length > 0) {
      for (const image of batch.images) {
        if (image.image_path) {
          const filePath = path.join(process.cwd(), image.image_path);
          // ตรวจสอบว่ามีไฟล์อยู่จริงก่อนลบ
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      }
    }

    // ลบชุดข้อมูลออกจากฐานข้อมูล
    await this.batchRepository.remove(batch);

    return {
      message: 'Batch and image files deleted successfully',
    };
  }

  async updateMyProfile(userId: number, updateDto: UpdateProfileDto, file?: Express.Multer.File) {
    const user = await this.userRepository.findOne({
      where: { user_id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // อัปเดตชื่อและนามสกุลถ้ามีการส่งมา
    if (updateDto.first_name) {
      user.first_name = updateDto.first_name;
    }
    if (updateDto.last_name) {
      user.last_name = updateDto.last_name;
    }

    // จัดการเรื่องรูปภาพโปรไฟล์
    if (file) {
      // 1. ตรวจสอบและลบรูปเก่าทิ้ง (ถ้ามี)
      if (user.profile_image) {
        const oldFilePath = path.join(process.cwd(), user.profile_image);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      // 2. บันทึก path ของรูปใหม่ลง DB (แปลง \ เป็น / สำหรับ Windows)
      user.profile_image = file.path.replace(/\\/g, '/');
    }

    await this.userRepository.save(user);

    return {
      message: 'Profile updated successfully',
      profile: {
        first_name: user.first_name,
        last_name: user.last_name,
        profile_image: user.profile_image,
      },
    };
  }

  async activateUser(targetUserId: number) {
    const user = await this.userRepository.findOne({
      where: { user_id: targetUserId },
      select: ['user_id', 'is_active'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.is_active) {
      return {
        message: 'User account is already active',
        data: {
          user_id: user.user_id,
          is_active: user.is_active,
        }
      };
    }

    user.is_active = true; 

    await this.userRepository.save(user);

    return {
      message: 'User account activated successfully',
      data: {
        user_id: user.user_id,
        is_active: user.is_active,
      }
    };
  }

  async undoRejectUser(targetUserId: number) {
    const user = await this.userRepository.findOne({
      where: { user_id: targetUserId },
      select: ['user_id', 'is_verified'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.is_verified === 0) {
      return {
        message: 'User account is already pending verification',
        data: {
          user_id: user.user_id,
          is_verified: user.is_verified,
        }
      };
    }

    if (user.is_verified === 1) {
      throw new BadRequestException('Cannot undo rejection for an already verified user');
    }

    user.is_verified = 0; 

    await this.userRepository.save(user);

    return {
      message: 'User rejection has been undone successfully',
      data: {
        user_id: user.user_id,
        is_verified: user.is_verified,
      }
    };
  }
}
