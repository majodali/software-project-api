import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import SoftwareProject from './SoftwareProject';

const execAsync = promisify(exec);

interface ToolOutput {
  stdout: string;
  stderr: string;
}

interface Annotation {
  filePath: string;
  location: string;
  tool: string;
  type: string;
  message: string;
}

class SoftwareProjectToolset {
  private project: SoftwareProject;
  private projectPath: string;

  constructor(project: SoftwareProject, projectPath: string) {
    this.project = project;
    this.projectPath = projectPath;
  }

  async runBuildPipeline(): Promise<boolean> {
    try {
      await this.runBuild();
      await this.runTests();
      await this.runDeploy();
      return true;
    } catch (error) {
      console.error('Build pipeline failed:', error);
      return false;
    }
  }

  private async runBuild(): Promise<void> {
    const output = await this.runNpmCommand('build');
    const annotations = this.parseTscOutput(output.stderr);
    this.addAnnotationsToProject(annotations);
    if (annotations.length > 0) {
      throw new Error('Build failed');
    }
  }

  private async runTests(): Promise<void> {
    const output = await this.runNpmCommand('test');
    const annotations = this.parseJestOutput(output.stdout);
    this.addAnnotationsToProject(annotations);
    if (annotations.length > 0) {
      throw new Error('Tests failed');
    }
  }

  private async runDeploy(): Promise<void> {
    await this.runNpmCommand('deploy');
  }

  private async runNpmCommand(command: string): Promise<ToolOutput> {
    const npmPath = 'npm'; //process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const localNpmPath = npmPath; //path.join(this.projectPath, 'node_modules', '.bin', npmPath);
    const { stdout, stderr } = await execAsync(`${localNpmPath} run ${command}`, { 
      cwd: this.projectPath,
      env: { ...process.env, PATH: `${path.join(this.projectPath, 'node_modules', '.bin')}:${process.env.PATH}` }
    });
    return { stdout, stderr };
  }

  private parseTscOutput(output: string): Annotation[] {
    const annotations: Annotation[] = [];
    const lines = output.split('\n');
    for (const line of lines) {
      const match = line.match(/^(.+)\((\d+),(\d+)\):\s+(error|warning)\s+TS\d+:\s+(.+)$/);
      if (match) {
        const [, filePath, line, column, type, message] = match;
        annotations.push({
          filePath: path.relative(this.projectPath, filePath),
          location: `${line}:${column}`,
          tool: 'tsc',
          type,
          message
        });
      }
    }
    return annotations;
  }

  private parseJestOutput(output: string): Annotation[] {
    const annotations: Annotation[] = [];
    try {
      const result = JSON.parse(output);
      for (const testResult of result.testResults) {
        for (const assertionResult of testResult.assertionResults) {
          if (assertionResult.status === 'failed') {
            annotations.push({
              filePath: path.relative(this.projectPath, testResult.name),
              location: assertionResult.location ? `${assertionResult.location.line}:${assertionResult.location.column}` : '',
              tool: 'jest',
              type: 'error',
              message: assertionResult.failureMessages.join('\n')
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to parse Jest output:', error);
    }
    return annotations;
  }

  private addAnnotationsToProject(annotations: Annotation[]): void {
    for (const annotation of annotations) {
      const fileMetadata = this.project.read(annotation.filePath);
      if (!fileMetadata.annotations) {
        fileMetadata.annotations = [];
      }
      fileMetadata.annotations.push(annotation);
      this.project.write(annotation.filePath, fileMetadata);
    }
  }
}

export default SoftwareProjectToolset;
