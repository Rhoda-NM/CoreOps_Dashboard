const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'Node' } });
const originalLoad = Module._load;
const metadata = { prismaVersion: { client: 'test-version' }, dmmf: { datamodel: { models: [{ name: 'WorkspaceMember', fields: ['id'] }] } } };
let clients = 0, adapters = 0, disconnected = 0;
class Client {
  constructor() { clients++; }
  async $disconnect() { disconnected++; }
}
Module._load = function(name, parent, main) {
  if (name === '@prisma/client') return { Prisma: metadata, PrismaClient: Client };
  if (name === '@prisma/adapter-pg') return { PrismaPg: class { constructor() { adapters++; } } };
  return originalLoad.call(this, name, parent, main);
};
const modulePath = require.resolve('../src/server/db/prisma.ts');
const reload = () => { delete require.cache[modulePath]; return require(modulePath).prisma; };
test('development Prisma cache replaces stale schemas and reuses unchanged clients', () => {
  const previous = { client: globalThis.prisma, signature: globalThis.prismaSchemaSignature, env: process.env.NODE_ENV, url: process.env.DATABASE_URL };
  try {
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL = 'postgresql://unused.invalid/cache-test';
    globalThis.prisma = { $disconnect: async () => { disconnected++; } };
    delete globalThis.prismaSchemaSignature;
    const fresh = reload();
    assert.equal(clients, 1);
    assert.equal(disconnected, 1);
    assert.equal(reload(), fresh);
    assert.equal(adapters, 1);
    metadata.dmmf.datamodel.models[0].fields.push('status');
    const updated = reload();
    assert.notEqual(updated, fresh);
    assert.equal(clients, 2);
    assert.equal(disconnected, 2);
    assert.equal(reload(), updated);
    assert.equal(adapters, 2);
    delete process.env.DATABASE_URL;
    assert.throws(reload, /DATABASE_URL is missing/);
  } finally {
    globalThis.prisma = previous.client;
    globalThis.prismaSchemaSignature = previous.signature;
    if (previous.env === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous.env;
    if (previous.url === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previous.url;
    Module._load = originalLoad;
    delete require.cache[modulePath];
  }
});
