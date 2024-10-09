import { Controller, Post, UseInterceptors, UploadedFiles, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
import { UploadService } from './upload.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiBearerAuth()
@ApiTags("UPLOAD")
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @ApiOperation({ summary: 'Upload multiple files' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: ['files'],
    },
  })
  @UseInterceptors(FilesInterceptor('files'))
  async create(
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 1024 * 1024 * 10,
          }),
          new FileTypeValidator({
            fileType: '.(png|jpg|jpeg|svg|heic|gif|webp|pdf|mp4)',
          }),
        ],
      }),
    )
    files: Express.Multer.File[],
  ) {
    const uploadResults = await this.uploadService.createMultiple(files);
    return {
      status: 200,
      message: "Files uploaded successfully",
      files: uploadResults,
    };
  }
}
