// Component-level regression: no browser or Clerk session is simulated here.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'Node', jsx: 'react-jsx' } });
const load = Module._load;
const react = require('react');
let transitionResult;
let serverAction;
Module._load = function(name, parent, main) {
  if (name === 'react') return { ...react, useTransition: () => [false, work => { transitionResult = work(); }] };
  if (name.endsWith('/actions/update-task-status')) return { updateTaskStatusAction: (...args) => serverAction(...args) };
  if (name.endsWith('/actions/update-project-status')) return { updateProjectStatusAction: (...args) => serverAction(...args) };
  if (name.endsWith('/actions/update-invoice-status')) return { updateInvoiceStatusAction: (...args) => serverAction(...args) };
  return load.call(this, name, parent, main);
};
const cases = [
  ['task', require('../src/features/tasks/components/TaskStatusSelect.tsx').TaskStatusSelect, { taskId: 'task', projectId: 'project', currentStatus: 'TODO' }, 'DONE'],
  ['project', require('../src/features/projects/components/ProjectStatusSelect.tsx').ProjectStatusSelect, { projectId: 'project', currentStatus: 'ACTIVE' }, 'PAUSED'],
  ['invoice', require('../src/features/invoices/components/InvoiceStatusSelect.tsx').InvoiceStatusSelect, { invoiceId: 'invoice', currentStatus: 'DRAFT' }, 'SENT'],
];
for (const [name, component, props, status] of cases) {
  test(`${name} transition tracks the server action until completion and propagates rejection`, async () => {
    let resolveAction;
    serverAction = () => new Promise(resolve => { resolveAction = resolve; });
    const select = component(props);
    select.props.onChange({ target: { value: status } });
    assert.ok(transitionResult instanceof Promise, 'React must receive the server action promise');
    let complete = false;
    transitionResult.then(() => { complete = true; });
    await Promise.resolve();
    assert.equal(complete, false);
    resolveAction(); await transitionResult;
    serverAction = async () => { throw new Error('permission revoked'); };
    select.props.onChange({ target: { value: status } });
    await assert.rejects(transitionResult, /permission revoked/);
  });
}
