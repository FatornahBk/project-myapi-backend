import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from 'src/auth/guards/admin.guard';
import { UpdateRoleDto } from './dto/update-role.dto';

@ApiTags('Verify Users')
@Controller('user')
export class VerifyUserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiBearerAuth()
  @Get('admin/pending')
  @ApiOperation({ summary: 'ดึงข้อมูลสัตวแพทย์ที่รอการอนุมัติ (สำหรับ Admin)' })
  async getUnverifiedUsers() {
    return this.userService.findUnverifiedUsers();
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiBearerAuth()
  @Patch('admin/approve/:id')
  @ApiOperation({ summary: 'อนุมัติบัญชีสัตวแพทย์และส่งอีเมล (สำหรับ Admin)' })
  async approveUser(@Param('id', ParseIntPipe) id: number) {
    return this.userService.approveUser(id);
  }


}
