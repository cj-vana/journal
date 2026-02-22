import { Injector, ApiClient, ExperimentResult } from '../types';

// Minimal valid 1x1 white PNG
const VALID_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  'base64'
);

const uploadChaos: Injector = {
  name: 'upload-chaos',
  description: 'Test upload validation: valid PNG, random bytes, and oversized file',
  async run(client: ApiClient): Promise<ExperimentResult> {
    const start = Date.now();
    const errors: string[] = [];

    try {
      // 1. Upload a valid 1x1 PNG - should succeed
      const validRes = await client.upload('/api/upload/image', VALID_PNG, 'test.png', 'image/png');
      if (validRes.status !== 200 && validRes.status !== 201) {
        errors.push(`Valid PNG upload returned ${validRes.status}, expected 200/201`);
      }

      // 2. Upload random bytes claiming to be an image - should be rejected
      const randomBytes = Buffer.from(Array.from({ length: 1024 }, () => Math.floor(Math.random() * 256)));
      const invalidRes = await client.upload('/api/upload/image', randomBytes, 'fake.png', 'image/png');
      if (invalidRes.status !== 400) {
        errors.push(`Random bytes upload returned ${invalidRes.status}, expected 400`);
      }

      // 3. Upload oversized file - should be rejected
      const largeBuffer = Buffer.alloc(20 * 1024 * 1024, 0xff); // 20MB
      const oversizeRes = await client.upload('/api/upload/image', largeBuffer, 'huge.png', 'image/png');
      if (oversizeRes.status !== 400 && oversizeRes.status !== 413) {
        errors.push(`Oversized upload returned ${oversizeRes.status}, expected 400/413`);
      }

      const passed = errors.length === 0;
      return {
        injector: 'upload-chaos',
        timestamp: new Date(),
        passed,
        duration: Date.now() - start,
        details: passed ? 'All upload validations correct' : undefined,
        error: passed ? undefined : errors.join('; '),
      };
    } catch (err: any) {
      return {
        injector: 'upload-chaos',
        timestamp: new Date(),
        passed: false,
        duration: Date.now() - start,
        error: err.message,
      };
    }
  },
};

export default uploadChaos;
