import fs from 'fs';
import path from 'path';
import * as glob from 'glob';

interface FileMetadata {
  content?: string;
  size?: number;
  last_modified?: Date;
  annotations?: Annotation[];
}

interface Annotation {
  location: string;
  tool: string;
  type: string;
  message: string;
}

class SoftwareProject {
  private projectPath: string;
  private metadataPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.metadataPath = path.join(this.projectPath, '.metadata');
  }

  initialize(): void {
    if (!fs.existsSync(this.projectPath)) {
      fs.mkdirSync(this.projectPath, { recursive: true });
    }
    if (!fs.existsSync(this.metadataPath)) {
      fs.mkdirSync(this.metadataPath, { recursive: true });
    }
  }

  write(filePath: string, metadata: FileMetadata): void {
    const fullPath = path.join(this.projectPath, filePath);
    const dirPath = path.dirname(fullPath);

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    if (metadata.content !== undefined) {
      fs.writeFileSync(fullPath, metadata.content, 'utf8');
    }

    this.writeMetadata(filePath, metadata);
  }

  read(filePath: string, fields: (keyof FileMetadata)[] = ['content', 'size', 'last_modified', 'annotations']): FileMetadata {
    const fullPath = path.join(this.projectPath, filePath);
    const metadata: FileMetadata = {};

    if (fields.includes('content')) {
      metadata.content = fs.readFileSync(fullPath, 'utf8');
    }
    if (fields.includes('size')) {
      const stats = fs.statSync(fullPath);
      metadata.size = stats.size;
    }
    if (fields.includes('last_modified')) {
      const stats = fs.statSync(fullPath);
      metadata.last_modified = stats.mtime;
    }
    if (fields.includes('annotations')) {
      metadata.annotations = this.readMetadata(filePath).annotations;
    }

    return metadata;
  }

  list(pathPattern: string = '**/*', fields: (keyof FileMetadata)[] = ['size', 'last_modified']): { [filePath: string]: FileMetadata } {
    const files = glob.sync(pathPattern, { cwd: this.projectPath, dot: true });
    const result: { [filePath: string]: FileMetadata } = {};

    for (const file of files) {
      result[file] = this.read(file, fields);
    }

    return result;
  }

  delete(filePath: string): void {
    const fullPath = path.join(this.projectPath, filePath);
    fs.unlinkSync(fullPath);
    this.deleteMetadata(filePath);
  }

  copy(sourcePath: string, destinationPath: string): void {
    const fullSourcePath = path.join(this.projectPath, sourcePath);
    const fullDestinationPath = path.join(this.projectPath, destinationPath);
    fs.copyFileSync(fullSourcePath, fullDestinationPath);
    this.copyMetadata(sourcePath, destinationPath);
  }

  move(sourcePath: string, destinationPath: string): void {
    const fullSourcePath = path.join(this.projectPath, sourcePath);
    const fullDestinationPath = path.join(this.projectPath, destinationPath);
    fs.renameSync(fullSourcePath, fullDestinationPath);
    this.moveMetadata(sourcePath, destinationPath);
  }

  private getMetadataPath(filePath: string): string {
    return path.join(this.metadataPath, `${filePath}.json`);
  }

  private writeMetadata(filePath: string, metadata: FileMetadata): void {
    const metadataPath = this.getMetadataPath(filePath);
    const metadataDir = path.dirname(metadataPath);

    if (!fs.existsSync(metadataDir)) {
      fs.mkdirSync(metadataDir, { recursive: true });
    }

    const { content, ...metadataWithoutContent } = metadata;
    fs.writeFileSync(metadataPath, JSON.stringify(metadataWithoutContent, null, 2), 'utf8');
  }
  
  private readMetadata(filePath: string): FileMetadata {
    const metadataPath = this.getMetadataPath(filePath);
    if (fs.existsSync(metadataPath)) {
      const metadataContent = fs.readFileSync(metadataPath, 'utf8');
      return JSON.parse(metadataContent);
    }
    return {};
  }

  private deleteMetadata(filePath: string): void {
    const metadataPath = this.getMetadataPath(filePath);
    if (fs.existsSync(metadataPath)) {
      fs.unlinkSync(metadataPath);
    }
  }

  private copyMetadata(sourcePath: string, destinationPath: string): void {
    const sourceMetadataPath = this.getMetadataPath(sourcePath);
    const destinationMetadataPath = this.getMetadataPath(destinationPath);
    if (fs.existsSync(sourceMetadataPath)) {
      fs.copyFileSync(sourceMetadataPath, destinationMetadataPath);
    }
  }

  private moveMetadata(sourcePath: string, destinationPath: string): void {
    const sourceMetadataPath = this.getMetadataPath(sourcePath);
    const destinationMetadataPath = this.getMetadataPath(destinationPath);
    if (fs.existsSync(sourceMetadataPath)) {
      fs.renameSync(sourceMetadataPath, destinationMetadataPath);
    }
  }
}

export default SoftwareProject;
