import { createHmac, timingSafeEqual } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { serverEnv } from './config/env';

export type StoredFileVisibility = 'public' | 'semi-public' | 'private';

export type StoredFileType = 'image' | 'video' | 'document';

export type SignedFileAccessMode = 'standard' | 'internal';

type StoreVerificationFileInput = {
  fileId: string;
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  fileType: StoredFileType;
  visibility: StoredFileVisibility;
  createThumbnail?: boolean;
};

export type StoredVerificationFile = {
  storageKey: string;
  thumbnailStorageKey: string | null;
  fileUrl: string;
  thumbnailUrl: string | null;
  sizeBytes: number;
  mimeType: string;
  originalName: string;
};

type SignedFilePayload = {
  fileId: string;
  expiresAt: number;
  accessMode?: SignedFileAccessMode;
};

const STORAGE_DIR_BY_VISIBILITY: Record<StoredFileVisibility, string> = {
  public: 'public',
  'semi-public': 'semi-public',
  private: 'private',
};

const FILE_TYPE_DIR_BY_TYPE: Record<StoredFileType, string> = {
  image: 'images',
  video: 'videos',
  document: 'documents',
};

const THUMBNAIL_WIDTH = 640;

const normalizeSegment = (value: string) => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9._-]+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '') || 'file';

const getExtensionFromMimeType = (mimeType: string, originalName: string) => {
  const normalizedMimeType = mimeType.trim().toLowerCase();

  if (normalizedMimeType === 'image/jpeg' || normalizedMimeType === 'image/jpg') return 'jpg';
  if (normalizedMimeType === 'image/png') return 'png';
  if (normalizedMimeType === 'image/webp') return 'webp';
  if (normalizedMimeType === 'image/gif') return 'gif';
  if (normalizedMimeType === 'video/mp4') return 'mp4';
  if (normalizedMimeType === 'video/webm') return 'webm';
  if (normalizedMimeType === 'video/quicktime') return 'mov';
  if (normalizedMimeType === 'application/pdf') return 'pdf';

  const extension = path.extname(originalName).replace(/^\./, '').trim().toLowerCase();
  return extension || 'bin';
};

const buildDatedStorageKey = (input: {
  fileId: string;
  visibility: StoredFileVisibility;
  fileType: StoredFileType;
  originalName: string;
  extension: string;
  thumbnail?: boolean;
}) => {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const normalizedName = normalizeSegment(path.basename(input.originalName, path.extname(input.originalName)));
  const fileName = `${input.fileId}${input.thumbnail ? '-thumb' : ''}-${normalizedName}.${input.extension}`;

  return path.posix.join(
    STORAGE_DIR_BY_VISIBILITY[input.visibility],
    FILE_TYPE_DIR_BY_TYPE[input.fileType],
    year,
    month,
    fileName,
  );
};

const resolveAbsoluteStoragePath = (storageKey: string) => path.join(serverEnv.fileStorageRoot, storageKey);

const signPayload = (payload: string) => createHmac('sha256', serverEnv.fileAccessSecret).update(payload).digest();

const toBase64Url = (value: Buffer | string) => Buffer.from(value).toString('base64url');

const fromBase64Url = (value: string) => Buffer.from(value, 'base64url');

export const ensureStorageLayout = async () => {
  await Promise.all(Object.values(STORAGE_DIR_BY_VISIBILITY).map((visibilityDir) => (
    mkdir(path.join(serverEnv.fileStorageRoot, visibilityDir), { recursive: true })
  )));
};

export const getCanonicalFileUrl = (fileId: string, visibility: StoredFileVisibility) => (
  visibility === 'public' ? `/api/files/public/${fileId}` : `/api/files/${fileId}`
);

export const getPublicThumbnailUrl = (fileId: string) => `/api/files/public/${fileId}/thumbnail`;

export const createSignedFileUrl = (
  fileId: string,
  expiresInSeconds = 60 * 30,
  accessMode: SignedFileAccessMode = 'standard',
) => {
  const payload: SignedFilePayload = {
    fileId,
    expiresAt: Date.now() + (expiresInSeconds * 1000),
    accessMode,
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = toBase64Url(signPayload(encodedPayload));
  return `/api/files/access/${encodedPayload}.${signature}`;
};

export const parseSignedFileToken = (token: string): SignedFilePayload | null => {
  const [encodedPayload, encodedSignature] = token.split('.');

  if (!encodedPayload || !encodedSignature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload);
  const providedSignature = fromBase64Url(encodedSignature);

  if (expectedSignature.length !== providedSignature.length || !timingSafeEqual(expectedSignature, providedSignature)) {
    return null;
  }

  try {
    const parsedPayload = JSON.parse(fromBase64Url(encodedPayload).toString('utf8')) as SignedFilePayload;

    if (!parsedPayload.fileId || !Number.isFinite(parsedPayload.expiresAt) || parsedPayload.expiresAt < Date.now()) {
      return null;
    }

    parsedPayload.accessMode = parsedPayload.accessMode === 'internal' ? 'internal' : 'standard';

    return parsedPayload;
  } catch {
    return null;
  }
};

export const storeVerificationFile = async (input: StoreVerificationFileInput): Promise<StoredVerificationFile> => {
  await ensureStorageLayout();

  const extension = getExtensionFromMimeType(input.mimeType, input.originalName);
  const storageKey = buildDatedStorageKey({
    fileId: input.fileId,
    visibility: input.visibility,
    fileType: input.fileType,
    originalName: input.originalName,
    extension,
  });
  const absolutePath = resolveAbsoluteStoragePath(storageKey);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, input.buffer);

  let thumbnailStorageKey: string | null = null;
  let thumbnailUrl: string | null = null;

  if (input.fileType === 'image' && input.createThumbnail) {
    const thumbnailKey = buildDatedStorageKey({
      fileId: input.fileId,
      visibility: 'public',
      fileType: 'image',
      originalName: input.originalName,
      extension: 'jpg',
      thumbnail: true,
    });
    const thumbnailAbsolutePath = resolveAbsoluteStoragePath(thumbnailKey);

    await mkdir(path.dirname(thumbnailAbsolutePath), { recursive: true });
    const thumbnailBuffer = await sharp(input.buffer)
      .rotate()
      .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    await writeFile(thumbnailAbsolutePath, thumbnailBuffer);

    thumbnailStorageKey = thumbnailKey;
    thumbnailUrl = getPublicThumbnailUrl(input.fileId);
  }

  return {
    storageKey,
    thumbnailStorageKey,
    fileUrl: getCanonicalFileUrl(input.fileId, input.visibility),
    thumbnailUrl,
    sizeBytes: input.buffer.byteLength,
    mimeType: input.mimeType,
    originalName: input.originalName,
  };
};

export const getStoredFileAbsolutePath = (storageKey: string) => resolveAbsoluteStoragePath(storageKey);

export const openStoredFileStream = (storageKey: string) => createReadStream(resolveAbsoluteStoragePath(storageKey));