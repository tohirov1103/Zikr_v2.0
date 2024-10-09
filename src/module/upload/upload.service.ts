import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UploadService {
  private client: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor(private readonly config: ConfigService) {
    this.client = new S3Client({
      endpoint: this.config.get("r2.endpoint"),
      region: 'auto',
      credentials: {
        accessKeyId: this.config.get("r2.accessKey"),
        secretAccessKey: this.config.get("r2.secretKey"),
      },
    });
    this.bucket = this.config.get("r2.bucket");
    this.publicUrl = this.config.get("r2.publicUrl");
  }

  async createMultiple(files: Express.Multer.File[]): Promise<{ url: string }[]> {
    const uploadPromises = files.map(async (file) => {
      const name = `${randomUUID()}${extname(file.originalname)}`;

      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: name,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      const url = `${this.publicUrl}/${name}`;

      return { url };
    });

    return Promise.all(uploadPromises);
  }
}
