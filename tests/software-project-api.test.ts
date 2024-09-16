import fs from 'fs';
import path from 'path';
import * as glob from 'glob';
import SoftwareProject from '../src/SoftwareProject';

jest.mock('fs');
jest.mock('glob');

describe('SoftwareProject', () => {
  let project: SoftwareProject;
  const testProjectPath = '/test/project';

  beforeEach(() => {
    jest.clearAllMocks();
    project = new SoftwareProject(testProjectPath);
    (fs.existsSync as jest.Mock).mockReturnValue(false);
  });

  describe('initialize', () => {
    it('should create project and metadata directories if they do not exist', () => {
      project.initialize();
      expect(fs.mkdirSync).toHaveBeenCalledWith(testProjectPath, { recursive: true });
      expect(fs.mkdirSync).toHaveBeenCalledWith(path.join(testProjectPath, '.metadata'), { recursive: true });
    });
  });

describe('write', () => {
    it('should write file content and metadata', () => {
      const filePath = 'test.txt';
      const metadata = {
        content: 'Test content',
        size: 12,
        last_modified: new Date('2024-09-03T23:32:08.926Z'),
        annotations: [{ location: '1:1', tool: 'test', type: 'info', message: 'Test annotation' }]
      };

      project.write(filePath, metadata);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        path.join(testProjectPath, filePath),
        metadata.content,
        'utf8'
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        path.join(testProjectPath, '.metadata', `${filePath}.json`),
        JSON.stringify({
          size: metadata.size,
          last_modified: metadata.last_modified.toISOString(),
          annotations: metadata.annotations
        }, null, 2),
        'utf8'
      );
    });
  });

  describe('read', () => {
    it('should read file content and metadata', () => {
      const filePath = 'test.txt';
      const content = 'Test content';
      const stats = { size: 12, mtime: new Date() };
      const metadata = { annotations: [{ location: '1:1', tool: 'test', type: 'info', message: 'Test annotation' }] };

      (fs.readFileSync as jest.Mock).mockReturnValueOnce(content);
      (fs.statSync as jest.Mock).mockReturnValue(stats);
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(JSON.stringify(metadata));

      const result = project.read(filePath);

      expect(result).toEqual({
        content,
        size: stats.size,
        last_modified: stats.mtime,
        annotations: metadata.annotations
      });
    });

    it('should return only requested fields', () => {
      const filePath = 'test.txt';
      const content = 'Test content';

      (fs.readFileSync as jest.Mock).mockReturnValueOnce(content);

      const result = project.read(filePath, ['content']);

      expect(result).toEqual({ content });
      expect(fs.statSync).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('should list files matching the pattern', () => {
      const files = ['file1.txt', 'file2.txt'];
      (glob.sync as jest.Mock).mockReturnValue(files);

      (fs.statSync as jest.Mock).mockReturnValue({ size: 10, mtime: new Date() });

      const result = project.list('*.txt');

      expect(result).toEqual({
        'file1.txt': expect.objectContaining({ size: 10, last_modified: expect.any(Date) }),
        'file2.txt': expect.objectContaining({ size: 10, last_modified: expect.any(Date) })
      });
    });
  });

  describe('delete', () => {
    it('should delete file and its metadata', () => {
      const filePath = 'test.txt';
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      project.delete(filePath);

      expect(fs.unlinkSync).toHaveBeenCalledWith(path.join(testProjectPath, filePath));
      expect(fs.unlinkSync).toHaveBeenCalledWith(path.join(testProjectPath, '.metadata', `${filePath}.json`));
    });
  });

  describe('copy', () => {
    it('should copy file and its metadata', () => {
      const sourcePath = 'source.txt';
      const destinationPath = 'destination.txt';
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      project.copy(sourcePath, destinationPath);

      expect(fs.copyFileSync).toHaveBeenCalledWith(
        path.join(testProjectPath, sourcePath),
        path.join(testProjectPath, destinationPath)
      );
      expect(fs.copyFileSync).toHaveBeenCalledWith(
        path.join(testProjectPath, '.metadata', `${sourcePath}.json`),
        path.join(testProjectPath, '.metadata', `${destinationPath}.json`)
      );
    });
  });

  describe('move', () => {
    it('should move file and its metadata', () => {
      const sourcePath = 'source.txt';
      const destinationPath = 'destination.txt';
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      project.move(sourcePath, destinationPath);

      expect(fs.renameSync).toHaveBeenCalledWith(
        path.join(testProjectPath, sourcePath),
        path.join(testProjectPath, destinationPath)
      );
      expect(fs.renameSync).toHaveBeenCalledWith(
        path.join(testProjectPath, '.metadata', `${sourcePath}.json`),
        path.join(testProjectPath, '.metadata', `${destinationPath}.json`)
      );
    });
  });
});
