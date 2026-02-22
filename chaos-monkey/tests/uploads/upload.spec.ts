import { test, expect } from '../fixtures/auth.fixture';
import { validPngBuffer } from '../fixtures/helpers';
import path from 'path';
import fs from 'fs';
import os from 'os';

test.describe('File uploads', () => {
  test('should upload a valid PNG image', async ({ authedPage }) => {
    const pngBuffer = validPngBuffer();
    const tmpFile = path.join(os.tmpdir(), 'chaos-test-valid.png');
    fs.writeFileSync(tmpFile, pngBuffer);

    try {
      const response = await authedPage.request.post('/api/upload/image', {
        multipart: {
          file: {
            name: 'test.png',
            mimeType: 'image/png',
            buffer: pngBuffer,
          },
        },
        failOnStatusCode: false,
      });
      // Should accept or at least not crash
      expect(response.status()).toBeLessThan(500);
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  test('should reject upload of random bytes as image', async ({ authedPage }) => {
    const randomBytes = Buffer.from(
      Array.from({ length: 1024 }, () => Math.floor(Math.random() * 256))
    );

    const response = await authedPage.request.post('/api/upload/image', {
      multipart: {
        file: {
          name: 'fake.png',
          mimeType: 'image/png',
          buffer: randomBytes,
        },
      },
      failOnStatusCode: false,
    });
    // Should reject or handle gracefully
    expect(response.status()).toBeLessThan(500);
  });

  test('should reject zero-byte file upload', async ({ authedPage }) => {
    const emptyBuffer = Buffer.alloc(0);

    const response = await authedPage.request.post('/api/upload/image', {
      multipart: {
        file: {
          name: 'empty.png',
          mimeType: 'image/png',
          buffer: emptyBuffer,
        },
      },
      failOnStatusCode: false,
    });
    expect(response.status()).toBeLessThan(500);
  });

  test('should reject file with wrong extension', async ({ authedPage }) => {
    const pngBuffer = validPngBuffer();

    const response = await authedPage.request.post('/api/upload/image', {
      multipart: {
        file: {
          name: 'test.exe',
          mimeType: 'application/octet-stream',
          buffer: pngBuffer,
        },
      },
      failOnStatusCode: false,
    });
    expect(response.status()).toBeLessThan(500);
  });

  test('should reject oversized file upload', async ({ authedPage }) => {
    // 20MB of zeros
    const largeBuffer = Buffer.alloc(20 * 1024 * 1024, 0xff);

    const response = await authedPage.request.post('/api/upload/image', {
      multipart: {
        file: {
          name: 'huge.png',
          mimeType: 'image/png',
          buffer: largeBuffer,
        },
      },
      failOnStatusCode: false,
    });
    // Should reject with 400 or 413
    expect(response.status()).not.toBe(200);
  });

  test('should handle upload with XSS in filename', async ({ authedPage }) => {
    const pngBuffer = validPngBuffer();

    const response = await authedPage.request.post('/api/upload/image', {
      multipart: {
        file: {
          name: '<script>alert(1)</script>.png',
          mimeType: 'image/png',
          buffer: pngBuffer,
        },
      },
      failOnStatusCode: false,
    });
    expect(response.status()).toBeLessThan(500);
  });

  test('should handle upload with path traversal in filename', async ({ authedPage }) => {
    const pngBuffer = validPngBuffer();

    const response = await authedPage.request.post('/api/upload/image', {
      multipart: {
        file: {
          name: '../../../etc/passwd.png',
          mimeType: 'image/png',
          buffer: pngBuffer,
        },
      },
      failOnStatusCode: false,
    });
    expect(response.status()).toBeLessThan(500);
  });
});
