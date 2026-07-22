import crypto from 'crypto';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import s3 from '../config/s3.js';

// Хост без протокола — для сборки публичной ссылки в стиле virtual-hosted
// (тот же формат, что уже используют TR/LMS: https://{bucket}.s3.twcstorage.ru/{key})
const S3_HOST = process.env.S3_ENDPOINT.replace(/^https?:\/\//, '');

export const publicS3Url = (key) => (key ? `https://${process.env.S3_BUCKET}.${S3_HOST}/${key}` : null);

export const uploadBuffer = async (buffer, folder, { contentType = 'image/webp', extension = 'webp' } = {}) => {
  const key = `${folder}/${crypto.randomUUID()}.${extension}`;
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read',
  }));
  return key;
};

export const deleteObject = async (key) => {
  if (!key) return;
  await s3
    .send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }))
    .catch(() => {});
};
