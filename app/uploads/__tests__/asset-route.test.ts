// @vitest-environment node

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { GET } from '@/app/uploads/[kind]/[filename]/route';

describe('uploaded asset route', () => {
  let tempDirectory: string;

  beforeEach(async () => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'groundflare-upload-route-'));
    process.env.GROUNDFLARE_UPLOADS_DIR = join(tempDirectory, 'uploads');
  });

  afterEach(async () => {
    delete process.env.GROUNDFLARE_UPLOADS_DIR;
    await rm(tempDirectory, { recursive: true, force: true });
  });

  it('serves uploaded files from the configured uploads directory', async () => {
    await mkdir(join(process.env.GROUNDFLARE_UPLOADS_DIR!, 'audio'), { recursive: true });
    await writeFile(join(process.env.GROUNDFLARE_UPLOADS_DIR!, 'audio', 'theme.mp3'), 'audio-bytes');

    const response = await GET(new Request('http://localhost/uploads/audio/theme.mp3'), {
      params: {
        kind: 'audio',
        filename: 'theme.mp3',
      },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('audio/mpeg');
    await expect(response.text()).resolves.toBe('audio-bytes');
  });
});
