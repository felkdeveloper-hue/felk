import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoMemoryServer } from 'mongodb-memory-server';

const dir = path.dirname(fileURLToPath(import.meta.url));
const uriFile = path.join(dir, '.mongo-uri');

export default async function setup() {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri('fe-platform-test');
  fs.writeFileSync(uriFile, uri, 'utf8');

  return async () => {
    await mongod.stop();
    try {
      fs.unlinkSync(uriFile);
    } catch {
      /* ignore */
    }
  };
}
