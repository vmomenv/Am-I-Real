import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const MIME_TYPES: Record<string, string> = {
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.png': 'image/png',
  '.wav': 'audio/wav',
  '.webp': 'image/webp',
};

export const runtime = 'nodejs';

function getUploadsDirectory() {
  return resolve(process.env.GROUNDFLARE_UPLOADS_DIR ?? 'uploads');
}

function getContentType(filename: string) {
  return MIME_TYPES[extname(filename).toLowerCase()] ?? 'application/octet-stream';
}

export async function GET(
  _request: Request,
  context: { params: { kind: string; filename: string } },
) {
  const { kind, filename } = context.params;

  if (!['ai', 'real', 'audio'].includes(kind)) {
    return new Response(null, { status: 404 });
  }

  try {
    const file = await readFile(join(getUploadsDirectory(), kind, filename));

    return new Response(file, {
      headers: {
        'content-type': getContentType(filename),
        'cache-control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
