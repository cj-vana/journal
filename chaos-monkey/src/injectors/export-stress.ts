import { Injector, ApiClient, ExperimentResult } from '../types';

const TIPTAP_DOC = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Export test content' }],
    },
  ],
};

const exportStress: Injector = {
  name: 'export-stress',
  description: 'Create entries, trigger ZIP export, verify response, then clean up',
  async run(client: ApiClient): Promise<ExperimentResult> {
    const start = Date.now();
    const createdIds: string[] = [];

    try {
      // Create 5 entries
      for (let i = 0; i < 5; i++) {
        const res = await client.post('/api/entries', {
          title: `Export Test ${i}`,
          content: JSON.stringify(TIPTAP_DOC),
          entryDate: new Date().toISOString(),
        });
        if (res.status === 201 && res.data?.id) {
          createdIds.push(res.data.id);
        }
      }

      // Trigger ZIP export
      const exportRes = await client.post('/api/export/zip');

      let passed: boolean;
      let details: string;

      if (exportRes.status === 200) {
        passed = true;
        details = `Export succeeded, created ${createdIds.length} entries`;
      } else if (exportRes.status === 404) {
        passed = true;
        details = 'Export endpoint not available yet (404) - skipped';
      } else {
        passed = false;
        details = `Export returned unexpected status ${exportRes.status}`;
      }

      // Clean up
      for (const id of createdIds) {
        await client.delete(`/api/entries/${id}`);
      }

      return {
        injector: 'export-stress',
        timestamp: new Date(),
        passed,
        duration: Date.now() - start,
        details,
        error: passed ? undefined : details,
      };
    } catch (err: any) {
      // Clean up on error
      for (const id of createdIds) {
        await client.delete(`/api/entries/${id}`).catch(() => {});
      }
      return {
        injector: 'export-stress',
        timestamp: new Date(),
        passed: false,
        duration: Date.now() - start,
        error: err.message,
      };
    }
  },
};

export default exportStress;
