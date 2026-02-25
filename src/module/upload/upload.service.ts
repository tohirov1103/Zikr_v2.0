import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { ConfigService } from '@nestjs/config';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class UploadService {
  private useR2: boolean;
  private bucket: string;
  private publicUrl: string;
  private client: any;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get('r2.endpoint');
    const accessKey = this.config.get('r2.accessKey');
    const secretKey = this.config.get('r2.secretKey');
    this.bucket = this.config.get('r2.bucket');
    this.publicUrl = this.config.get('r2.publicUrl');

    this.useR2 = !!(endpoint && accessKey && secretKey && this.bucket);

    if (this.useR2) {
      const { S3Client } = require('@aws-sdk/client-s3');
      this.client = new S3Client({
        endpoint,
        region: 'auto',
        credentials: {
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
        },
      });
    }
  }

  async createMultiple(files: Express.Multer.File[]): Promise<{ url: string }[]> {
    const uploadPromises = files.map(async (file) => {
      const name = `${randomUUID()}${extname(file.originalname)}`;

      if (this.useR2) {
        try {
          const { PutObjectCommand } = require('@aws-sdk/client-s3');
          await this.client.send(
            new PutObjectCommand({
              Bucket: this.bucket,
              Key: name,
              Body: file.buffer,
              ContentType: file.mimetype,
            }),
          );
          return { url: `${this.publicUrl}/${name}` };
        } catch (error) {
          throw new InternalServerErrorException(`R2 upload failed: ${error.message}`);
        }
      }

      // Fallback: save to local /uploads directory
      const uploadDir = join(process.cwd(), 'uploads');
      await mkdir(uploadDir, { recursive: true });
      const filePath = join(uploadDir, name);
      await writeFile(filePath, file.buffer);

      return { url: `/uploads/${name}` };
    });

    return Promise.all(uploadPromises);
  }
}
