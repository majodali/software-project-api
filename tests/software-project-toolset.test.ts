import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import SoftwareProject from '../src/SoftwareProject';
import SoftwareProjectToolset from '../src/SoftwareProjectToolset';

const execAsync = promisify(exec);
const testProjectPath = path.join(__dirname, 'test-parser-project');
const templateProjectPath = path.join(__dirname, 'template-parser-project');

describe('SoftwareProjectToolset', () => {
  let project: SoftwareProject;
  let toolset: SoftwareProjectToolset;

  beforeAll(async () => {
    if (!fs.existsSync(templateProjectPath)) {
      throw new Error('Template project does not exist. Please run npm init in the template-parser-project folder.');
    }
  });

  console.log('starting SPT suite')

  beforeEach(async () => {
    console.log('starting test')
    await copyDirectory(templateProjectPath, testProjectPath);
    await logProjectStructure(testProjectPath);
    project = new SoftwareProject(testProjectPath);
    toolset = new SoftwareProjectToolset(project, testProjectPath);
  });

  afterEach(async () => {
    await fs.promises.rm(testProjectPath, { recursive: true, force: true });
  });

  it('should run the build pipeline successfully', async () => {
    try {
      const result = await toolset.runBuildPipeline();
      expect(result).toBe(true);
    } catch (error) {
      console.error('Test failed:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw error;
    }
  });

  it('should fail the build pipeline when there are TypeScript errors', async () => {
    // Introduce a TypeScript error
    const indexPath = path.join(testProjectPath, 'src', 'index.ts');
    const content = await fs.promises.readFile(indexPath, 'utf8');
    await fs.promises.writeFile(indexPath, content + '\nconst x: number = "string";', 'utf8');

    const result = await toolset.runBuildPipeline();
    expect(result).toBe(false);

    // Check if an annotation was added
    const fileMetadata = project.read('src/index.ts');
    expect(fileMetadata.annotations).toBeDefined();
    expect(fileMetadata.annotations!.length).toBeGreaterThan(0);
    expect(fileMetadata.annotations![0].tool).toBe('tsc');
  });

  it('should fail the build pipeline when tests fail', async () => {
    // Introduce a failing test
    const testPath = path.join(testProjectPath, 'src', 'index.test.ts');
    const content = await fs.promises.readFile(testPath, 'utf8');
    await fs.promises.writeFile(testPath, content + '\ntest("failing test", () => { expect(1).toBe(2); });', 'utf8');

    const result = await toolset.runBuildPipeline();
    expect(result).toBe(false);

    // Check if an annotation was added
    const fileMetadata = project.read('src/index.test.ts');
    expect(fileMetadata.annotations).toBeDefined();
    expect(fileMetadata.annotations!.length).toBeGreaterThan(0);
    expect(fileMetadata.annotations![0].tool).toBe('jest');
  });
});

async function copyDirectory(src: string, dest: string): Promise<void> {
  console.log('copying dir:', src)
  await fs.promises.mkdir(dest, { recursive: true });
  let entries = await fs.promises.readdir(src, { withFileTypes: true });

  for (let entry of entries) {
    let srcPath = path.join(src, entry.name);
    let destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules')
        // For node_modules, create a symlink instead of copying
        await fs.promises.symlink(srcPath, destPath, 'junction');
      else
        await copyDirectory(srcPath, destPath);
    } else {
      console.log('copying file:', srcPath)
      await fs.promises.copyFile(srcPath, destPath);
    }
  }
}

async function logProjectStructure(projectPath: string): Promise<void> {
  console.log('Project structure:');
  await execAsync(`tree ${projectPath} -L 3`);
  console.log('package.json content:');
  const packageJson = await fs.promises.readFile(path.join(projectPath, 'package.json'), 'utf8');
  console.log(packageJson);
}

