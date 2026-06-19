import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { lookup as getMimeType } from 'mime-types';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { getAppConfig } from '../config/app.config';

@Injectable()
export class MediaService implements OnModuleInit {
  private readonly config = getAppConfig();

  private readonly s3 = this.createClient(this.config.minioEndpoint);

  private readonly publicS3 = this.createClient(this.config.minioPublicEndpoint);

  async onModuleInit() {
    await this.ensureBucket();
  }

  async ensureBucket() {
    try {
      await this.s3.send(
        new HeadBucketCommand({
          Bucket: this.config.minioBucket,
        }),
      );
    } catch {
      await this.s3.send(
        new CreateBucketCommand({
          Bucket: this.config.minioBucket,
        }),
      );
    }
  }

  async uploadBuffer(
    buffer: Buffer,
    fileName: string,
    prefix: string,
    mimeType?: string,
  ) {
    const extension = extname(fileName) || '';
    const key = `${prefix}/${randomUUID()}${extension}`;
    const contentType =
      mimeType || (getMimeType(fileName) as string | false) || 'application/octet-stream';

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.config.minioBucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    return {
      storageKey: key,
      fileName,
      mimeType: contentType,
      size: buffer.byteLength,
    };
  }

  async getSignedUrl(storageKey: string) {
    const publicEndpoint = this.config.minioPublicEndpoint;
    if (publicEndpoint.includes('/storage/v1/object/public')) {
      const bucket = this.config.minioBucket;
      const cleanEndpoint = publicEndpoint.endsWith('/')
        ? publicEndpoint.slice(0, -1)
        : publicEndpoint;

      if (cleanEndpoint.endsWith(bucket)) {
        return `${cleanEndpoint}/${storageKey}`;
      }
      return `${cleanEndpoint}/${bucket}/${storageKey}`;
    }

    return getSignedUrl(
      this.publicS3,
      new GetObjectCommand({
        Bucket: this.config.minioBucket,
        Key: storageKey,
      }),
      { expiresIn: this.config.signedUrlTtl },
    );
  }

  async getBuffer(storageKey: string) {
    const response = await this.s3.send(
      new GetObjectCommand({
        Bucket: this.config.minioBucket,
        Key: storageKey,
      }),
    );

    const chunks: Buffer[] = [];
    const stream = response.Body;

    if (!stream) {
      return Buffer.from('');
    }

    for await (const chunk of stream as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  private createClient(endpoint: string) {
    return new S3Client({
      region: this.config.minioRegion,
      endpoint,
      forcePathStyle: this.config.minioForcePathStyle,
      credentials: {
        accessKeyId: this.config.minioAccessKey,
        secretAccessKey: this.config.minioSecretKey,
      },
    });
  }
}
