import { Injector, ApiClient, ExperimentResult } from '../types';

const TIPTAP_DOC = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Chaos test content' }],
    },
  ],
};

const dbStress: Injector = {
  name: 'db-stress',
  description: 'Create 50 entries rapidly then delete them all, verifying count consistency',
  async run(client: ApiClient): Promise<ExperimentResult> {
    const start = Date.now();
    try {
      // Get initial entry count
      const initial = await client.get('/api/entries');
      const initialCount = Array.isArray(initial.data) ? initial.data.length : 0;

      // Create 50 entries
      const createdIds: string[] = [];
      for (let i = 0; i < 50; i++) {
        const res = await client.post('/api/entries', {
          title: `Chaos Test ${i}`,
          content: JSON.stringify(TIPTAP_DOC),
          entryDate: new Date().toISOString(),
        });
        if (res.status === 201 && res.data?.id) {
          createdIds.push(res.data.id);
        }
      }

      if (createdIds.length !== 50) {
        return {
          injector: 'db-stress',
          timestamp: new Date(),
          passed: false,
          duration: Date.now() - start,
          error: `Only created ${createdIds.length}/50 entries`,
        };
      }

      // Delete all created entries
      for (const id of createdIds) {
        await client.delete(`/api/entries/${id}`);
      }

      // Verify final count matches initial
      const final = await client.get('/api/entries');
      const finalCount = Array.isArray(final.data) ? final.data.length : 0;

      const passed = finalCount === initialCount;
      return {
        injector: 'db-stress',
        timestamp: new Date(),
        passed,
        duration: Date.now() - start,
        details: `initial=${initialCount}, final=${finalCount}, created=${createdIds.length}`,
        error: passed ? undefined : `Count mismatch: initial=${initialCount}, final=${finalCount}`,
      };
    } catch (err: any) {
      return {
        injector: 'db-stress',
        timestamp: new Date(),
        passed: false,
        duration: Date.now() - start,
        error: err.message,
      };
    }
  },
};

export default dbStress;
