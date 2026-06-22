import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

/**
 * Wrapper S3-compatible (MinIO dev / R2 prod).
 * Abstraction pour pouvoir swap le backend sans toucher le code appelant.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('S3_BUCKET') ?? 'matchmaking-screenshots';
    this.publicUrl = this.config.get<string>('S3_PUBLIC_URL') ?? '';

    this.client = new S3Client({
      endpoint: this.config.get<string>('S3_ENDPOINT'),
      region: this.config.get<string>('S3_REGION') ?? 'us-east-1',
      credentials: {
        accessKeyId: this.config.get<string>('S3_ACCESS_KEY') ?? '',
        secretAccessKey: this.config.get<string>('S3_SECRET_KEY') ?? '',
      },
      forcePathStyle: true, // nécessaire pour MinIO
    });
  }

  /**
   * Upload à partir d'une URL (utilisé par le worker pour récupérer un fichier Discord).
   */
  async uploadFromUrl(url: string, filename: string): Promise<{ url: string; key: string }> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') ?? 'image/png';
    return this.uploadBuffer(buffer, filename, contentType);
  }

  async uploadBuffer(buffer: Buffer, filename: string, contentType: string) {
    const key = `screenshots/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${filename}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    const url = this.publicUrl ? `${this.publicUrl}/${key}` : `s3://${this.bucket}/${key}`;
    this.logger.log(`Uploaded ${key} (${buffer.length} bytes)`);
    return { url, key };
  }

  /** URL présignée pour upload direct depuis le navigateur. */
  async getPresignedUploadUrl(filename: string, contentType: string) {
    const key = `screenshots/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${filename}`;
    const cmd = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType });
    const url = await getSignedUrl(this.client, cmd, { expiresIn: 600 });
    return { url, key, publicUrl: this.publicUrl ? `${this.publicUrl}/${key}` : `s3://${this.bucket}/${key}` };
  }
}