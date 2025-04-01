import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';

/**
 * Compresses a directory into a .tar file
 * @param directoryPath - The path to the directory to compress
 * @returns Promise that resolves with the path to the created archive
 */
export async function compressDirectory(directoryPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Ensure the directory exists
      if (!fs.existsSync(directoryPath)) {
        throw new Error(`Directory does not exist: ${directoryPath}`);
      }

      // Get directory name and parent directory
      const dirName = path.basename(directoryPath);
      const parentDir = path.dirname(directoryPath);
      
      // Create output file path
      const outputPath = path.join(parentDir, `${dirName}.tar`);
      
      // Create a file to write the archive to
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('tar', {
        gzip: false
      });

      // Listen for archive events
      output.on('close', () => {
        console.log(`Archive created: ${outputPath} (${archive.pointer()} bytes)`);
        resolve(outputPath);
      });

      archive.on('error', (err) => {
        reject(err);
      });

      // Pipe archive data to the output file
      archive.pipe(output);

      // Add the directory contents to the archive
      archive.directory(directoryPath, dirName);

      // Finalize the archive
      archive.finalize();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Reads a file and converts its content to base64
 * @param filePath - The path to the file to read
 * @returns Promise that resolves with the base64 encoded content
 */
export async function fileToBase64(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Ensure the file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File does not exist: ${filePath}`);
      }

      // Read the file as a buffer
      fs.readFile(filePath, (err, data) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Convert buffer to base64 string
        const base64Content = data.toString('base64');
        console.log(`File converted to base64: ${filePath} (${base64Content.length} chars)`);
        resolve(base64Content);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Compresses a directory and converts it into a base64 encoded string
 * @param directoryPath - The path to the directory to compress
 * @returns Promise that resolves with the base64 encoded content and the file path
 */
export async function compressDirectoryAndReturnBase64(directoryPath: string): Promise<{ base64Content: string; filePath: string }> {
  const filePath = await compressDirectory(directoryPath);
  const base64Content = await fileToBase64(filePath);
  return { base64Content, filePath };
}
