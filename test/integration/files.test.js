import { describe, expect, test, jest, beforeAll, beforeEach, afterAll } from "@jest/globals";
import fsPromises from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { createLayersIfNotExists } from "./../../src/createLayers.js"
import { createFiles } from "./../../src/createFiles.js"
import Util from "../../src/util.js";

function getAllFunctionsFromInstance(instance) {
  return Reflect.ownKeys(Reflect.getPrototypeOf(instance))
    .filter(method => method !== 'constructor');
}

function genereteFilePath({ mainPath, defaultMainFolder, layers, componentName }) {
  return layers.map(layer => {
    const fileName = `${componentName}${Util.upperCaseFirstLetter(layer)}.js`;
    return join(mainPath, defaultMainFolder, layer, fileName);
  })
}


describe('#Integration - Files - Files Structure', () => {
  const config = {
    defaultMainFolder: 'src',
    mainPath: '',
    layers: ['service', 'factory', 'repository'].sort(),
    componentName: 'heroes'
  }
  const packageJSON = 'package.json';
  const packageJSONLocation = join('./test/integration/mocks', packageJSON);

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  beforeAll(async () => {
    config.mainPath = await fsPromises.mkdtemp(join(tmpdir(), 'layers-'));
    await fsPromises.copyFile(packageJSONLocation, join(config.mainPath, packageJSON));
    await createLayersIfNotExists(config);
  });

  afterAll(async () => {
    await fsPromises.rm(config.mainPath, { recursive: true });
  });

  test('Repository class should have create, read, update and delete methods', async () => {
    const myConfig = {
      ...config,
      layers: ['repository']
    };

    await createFiles(myConfig);
    const [repositoryFile] = genereteFilePath(myConfig);
    const { default: Repository } = await import(repositoryFile);

    const instance = new Repository();
    const expectNotImplemented = fn => expect(() => fn.call()).rejects.toEqual("method not implemented!");

    expectNotImplemented(instance.create);
    expectNotImplemented(instance.read);
    expectNotImplemented(instance.update);
    expectNotImplemented(instance.delete);
  });

  test('Service should have the same signature of repository and call its methods', async () => {
    const myConfig = {
      ...config,
      layers: ['repository', 'service']
    };

    await createFiles(myConfig);
    const [repositoryFile, serviceFile] = genereteFilePath(myConfig);

    const { default: Repository } = await import(repositoryFile);
    const { default: Service } = await import(serviceFile);

    const repository = new Repository();
    const service = new Service({ repository });

    const allRepositoryMethods = getAllFunctionsFromInstance(repository);
    allRepositoryMethods.forEach(method => jest.spyOn(repository, method).mockResolvedValue());

    getAllFunctionsFromInstance(service).forEach(method => service[method].call(service, []));
    allRepositoryMethods.forEach(method => expect(repository[method]).toHaveBeenCalled());

  });

  test('Factory instance should match layers', async () => {
    const myConfig = {
      ...config,
    };

    await createFiles(myConfig);

    const [factoryFile, repositoryFile, serviceFile] = genereteFilePath(myConfig);

    const { default: Repository } = await import(repositoryFile);
    const { default: Service } = await import(serviceFile);
    const { default: Factory } = await import(factoryFile);

    const expectedInstance = new Service({ repository: new Repository() });
    const instance = Factory.getInstance();

    expect(instance).toMatchObject(expectedInstance);
    expect(expectedInstance).toBeInstanceOf(Service);
  });

});


