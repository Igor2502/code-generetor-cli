import { describe, expect, test, jest, beforeAll, beforeEach, afterAll } from "@jest/globals";
import fsPromises from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { createLayersIfNotExists } from "./../../src/createLayers.js"

async function getFolders({ mainPath, defaultMainFolder }) {
  return fsPromises.readdir(join(mainPath, defaultMainFolder));
}

describe('#Integration - Layers - Folders Structure', () => {
  const config = {
    defaultMainFolder: 'src',
    mainPath: '',
    layers: ['service', 'factory', 'repository'].sort()
  }

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  beforeAll(async () => {
    config.mainPath = await fsPromises.mkdtemp(join(tmpdir(), 'skeleton-'));;
  });

  afterAll(async () => {
    await fsPromises.rm(config.mainPath, { recursive: true });
  });

  test('should not create folder if it exists', async () => {
    const beforeRun = await fsPromises.readdir(config.mainPath);

    await createLayersIfNotExists(config);

    const afterRun = await getFolders(config);
    expect(beforeRun).not.toStrictEqual(afterRun);
    expect(afterRun).toEqual(config.layers);
  });

  test('should create folder if it doesnt exists', async () => {
    const beforeRun = await getFolders(config);

    await createLayersIfNotExists(config);

    const afterRun = await getFolders(config);
    expect(afterRun).toEqual(beforeRun)
  });

});


