import fs from 'fs/promises';
import path from 'path';

export async function downloadAssets(assetMap: Map<string, string>): Promise<void> {
  for (const url of assetMap.keys()) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer());
        const localPath = assetMap.get(url)!;
        await saveFile(buffer, localPath);
        //console.log(`Successfully downloaded asset: ${url}`);
      }
    } catch (error) {
      console.error(`Failed to download asset ${url}:`, error);
    }
  }
}

export async function saveFile(buffer: Buffer, localPath: string): Promise<void> {
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await fs.writeFile(localPath, buffer);
}

export async function createDirectory(directoryPath: string): Promise<void> {
  await fs.mkdir(directoryPath, { recursive: true });
}

export async function deleteDirectory(directoryPath: string): Promise<void> {
  try {
    await fs.rm(directoryPath, { recursive: true, force: true });
    //console.log(`Successfully deleted directory: ${directoryPath}`);
  } catch (error) {
    console.error(`Failed to delete directory ${directoryPath}:`, error);
  }
}