import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  Request,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { BatchService } from './batch.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { AuthGuard } from '@nestjs/passport';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import * as fs from 'fs';

@ApiTags('Upload')
@ApiBearerAuth()
@Controller('batches')
export class BatchController {
  constructor(private readonly batchService: BatchService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('upload')
  @ApiOperation({ summary: 'อัปโหลดชุดข้อมูลรูปภาพ ได้หลายภาพ' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('files', 100, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = './uploads/batches';
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `smear-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          return cb(
            new BadRequestException(
              'Only image files (JPG, JPEG, PNG) are allowed.',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadBatch(
    @Request() req,
    @Body() createBatchDto: CreateBatchDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Please upload at least one image.');
    }

    return this.batchService.createBatchWithImages(
      req.user.userId,
      createBatchDto,
      files,
    );
  }
}
