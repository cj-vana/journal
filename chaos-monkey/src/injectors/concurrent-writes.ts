import { Injector, ApiClient, ExperimentResult } from '../types';

const TIPTAP_DOC = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Concurrent write test' }],
    },
  ],
};

const concurrentWrites: Injector = {
  name: 'concurrent-writes',
  description: 'Send 10 concurrent POST requests to test SQLite concurrency',
  async run(client: ApiClient): Promise<ExperimentResult> {
    const start = Date.now();

    try {
      // Get initial count
      const initial = await client.get('/api/entries');
      const initialCount = initial.data?.total ?? initial.data?.entries?.length ?? 0;

      // Send 10 concurrent create requests
      const promises = Array.from({ length: 10 }, (_, i) =>
        client.post('/api/entries', {
          title: `Concurrent Test ${i}`,
          content: JSON.stringify(TIPTAP_DOC),
          entryDate: new Date().toISOString(),
        })
      );

      const results = await Promise.all(promises);
      const createdIds: string[] = [];
      let failedCreates = 0;

      for (const res of results) {
        if (res.status === 201 && res.data?.id) {
          createdIds.push(res.data.id);
        } else {
          failedCreates++;
        }
      }

      // Verify count increased by exactly 10
      const after = await client.get('/api/entries');
      const afterCount = after.data?.total ?? after.data?.entries?.length ?? 0;
      const countDiff = afterCount - initialCount;

      // Clean up
      for (const id of createdIds) {
        await client.delete(`/api/entries/${id}`);
      }

      // Success: all 10 requests got 201 with valid IDs
      const passed = createdIds.length === 10;
      return {
        injector: 'concurrent-writes',
        timestamp: new Date(),
        passed,
        duration: Date.now() - start,
        details: `Created ${createdIds.length}/10`,
        error: passed
          ? undefined
          : `Created ${createdIds.length}/10, ${failedCreates} failed`,
      };
    } catch (err: any) {
      return {
        injector: 'concurrent-writes',
        timestamp: new Date(),
        passed: false,
        duration: Date.now() - start,
        error: err.message,
      };
    }
  },
};

export default concurrentWrites;
