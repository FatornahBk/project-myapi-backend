import { Body, Controller, Get, Delete, Patch, Param, ParseIntPipe, Query, Request, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetProfileDto } from './dto/get-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

@ApiTags('Profile')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('profile')
export class ProfileController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiOperation({ summary: 'ดึงข้อมูลโปรไฟล์ของตัวเองและชุดข้อมูลทั้งหมดของตนเอง' })
  async getMyProfile(@Request() req, @Query() queryDto: GetProfileDto) {
    return this.userService.getMyProfile(req.user.userId, queryDto);
  }

  @Delete('batches/:id')
  @ApiOperation({ summary: 'ลบชุดข้อมูลของตนเองจากหน้า Profile' })
  async deleteMyBatch(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.userService.deleteMyBatch(req.user.userId, id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'แก้ไขข้อมูลโปรไฟล์ (ชื่อ, นามสกุล, รูปภาพ)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('profile_image', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = './uploads/profiles';
          // --- ใช้โค้ดเช็คและสร้างโฟลเดอร์อัตโนมัติ ---
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `profile-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async updateMyProfile(
    @Request() req,
    @Body() updateDto: UpdateProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.userService.updateMyProfile(req.user.userId, updateDto, file);
  }
}