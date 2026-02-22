import { test as teardown } from '@playwright/test';
import fs from 'fs';
import path from 'path';

teardown('cleanup auth state', async () => {
  const authFile = path.join(__dirname, 'fixtures', '.auth', 'admin.json');
  if (fs.existsSync(authFile)) {
    fs.unlinkSync(authFile);
  }
});
