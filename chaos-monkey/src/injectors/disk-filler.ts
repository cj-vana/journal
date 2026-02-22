import { Injector, ApiClient, ExperimentResult } from '../types';

// Minimal valid 1x1 white PNG
const VALID_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  'base64'
);

const diskFiller: Injector = {
  name: 'disk-filler',
  description: 'Upload 20 small PNG images rapidly and verify all succeed',
  async run(client: ApiClient): Promise<ExperimentResult> {
    const start = Date.now();
    let successCount = 0;
    let failCount = 0;

    try {
      // Check debug status before
      const beforeStatus = await client.get('/api/debug/status');

      // Upload 20 small PNGs
      for (let i = 0; i < 20; i++) {
        const res = await client.upload('/api/upload/image', VALID_PNG, `chaos-disk-${i}.png`, 'image/png');
        if (res.status === 200 || res.status === 201) {
          successCount++;
        } else {
          failCount++;
        }
      }

      // Check debug status after
      const afterStatus = await client.get('/api/debug/status');

      const passed = successCount === 20;
      return {
        injector: 'disk-filler',
        timestamp: new Date(),
        passed,
        duration: Date.now() - start,
        details: `Uploaded ${successCount}/20 images. Status before: ${JSON.stringify(beforeStatus.data?.uploads || 'N/A')}, after: ${JSON.stringify(afterStatus.data?.uploads || 'N/A')}`,
        error: passed ? undefined : `${failCount} uploads failed`,
      };
    } catch (err: any) {
      return {
        injector: 'disk-filler',
        timestamp: new Date(),
        passed: false,
        duration: Date.now() - start,
        error: err.message,
      };
    }
  },
};

export default diskFiller;
