import { mkdir, rm, writeFile } from 'node:fs/promises';
import { extname, join, sep } from 'node:path';
import { randomUUID } from 'node:crypto';

const PUBLIC_UPLOADS_PREFIX = 'uploads';

export type StoredFile = {
  filePath: string;
  fileSize: number;
};

type StoreUploadedFileInput = {
  uploadsDir: string;
  kind: string;
  file: File;
};

export async function storeUploadedFile(input: StoreUploadedFileInput): Promise<StoredFile> {
  const extension = extname(input.file.name).toLowerCase();
  const storageFileName = `${randomUUID()}${extension}`;
  const relativePath = `${PUBLIC_UPLOADS_PREFIX}/${input.kind}/${storageFileName}`;
  const targetPath = join(input.uploadsDir, input.kind, storageFileName);
  const fileBuffer = Buffer.from(await input.file.arrayBuffer());

  await mkdir(join(input.uploadsDir, input.kind), { recursive: true });
  await writeFile(targetPath, fileBuffer);

  return {
    filePath: relativePath,
    fileSize: fileBuffer.byteLength,
  };
}

export async function removeStoredFile(input: { uploadsDir: string; filePath: string }) {
  const relativeFilePath = input.filePath
    .replace(/^uploads[\\/]/, '')
    .replace(/[\\/]/g, sep);

  await rm(join(input.uploadsDir, relativeFilePath), { force: true });
}
