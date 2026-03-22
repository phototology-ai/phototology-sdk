import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('init CLI', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'phototology-init-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates .env and analyze-example.ts files', async () => {
    const { scaffold } = await import('../src/init');
    await scaffold(tmpDir, 'pt_test_abc123');

    expect(fs.existsSync(path.join(tmpDir, '.env'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'analyze-example.ts'))).toBe(true);
  });

  it('.env contains the API key', async () => {
    const { scaffold } = await import('../src/init');
    await scaffold(tmpDir, 'pt_test_abc123');

    const envContent = fs.readFileSync(path.join(tmpDir, '.env'), 'utf-8');
    expect(envContent).toContain('PHOTOTOLOGY_API_KEY=pt_test_abc123');
  });

  it('example script imports from @phototology/sdk', async () => {
    const { scaffold } = await import('../src/init');
    await scaffold(tmpDir, 'pt_test_abc123');

    const exampleContent = fs.readFileSync(path.join(tmpDir, 'analyze-example.ts'), 'utf-8');
    expect(exampleContent).toContain("from '@phototology/sdk'");
    expect(exampleContent).toContain('PhototologyClient');
  });

  it('example script notes test mode for pt_test_ keys', async () => {
    const { scaffold } = await import('../src/init');
    await scaffold(tmpDir, 'pt_test_abc123');

    const exampleContent = fs.readFileSync(path.join(tmpDir, 'analyze-example.ts'), 'utf-8');
    expect(exampleContent).toContain('test mode');
  });

  it('does not include test mode note for pt_live_ keys', async () => {
    const { scaffold } = await import('../src/init');
    await scaffold(tmpDir, 'pt_live_abc123');

    const exampleContent = fs.readFileSync(path.join(tmpDir, 'analyze-example.ts'), 'utf-8');
    expect(exampleContent).not.toContain('test mode');
  });
});
