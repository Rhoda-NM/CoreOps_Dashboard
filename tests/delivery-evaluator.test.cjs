const { test } = require('node:test');
const assert = require('node:assert/strict');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'Node' } });
const { evaluateDelivery } = require('../src/server/delivery/evaluate.ts');
const now = new Date('2026-11-21T12:00:00.000Z');
const before = new Date(+now - 1), after = new Date(+now + 1);
const task = (id, fields = {}) => ({ id, status: 'TODO', dueDate: null, assignedMemberId: 'member', ...fields });
const project = fields => ({ id: 'project', status: 'ACTIVE', deadline: null, tasks: [], ...fields });
const evaluate = data => evaluateDelivery(data, '/w/example/projects/project', () => now);

test('reports only the three rules with evidence, links and a single evaluation instant', () => {
  let calls = 0;
  const overdue = task('one', { dueDate: before, assignedMemberId: null, status: 'REVIEW' });
  const result = evaluateDelivery(project({ deadline: before, tasks: [overdue, overdue] }), '/w/example/projects/project', () => { calls++; return now; });
  assert.equal(calls, 1);
  assert.deepEqual(result.findings.map(f => f.ruleId), ['TASK_OVERDUE', 'TASK_UNASSIGNED', 'PROJECT_DEADLINE_PASSED']);
  for (const finding of result.findings) {
    assert.equal(finding.projectId, 'project');
    assert.equal(finding.projectStatus, 'ACTIVE');
    assert.equal(finding.evaluatedAt, now.toISOString());
    assert.equal(finding.deadline, before.toISOString());
    assert.ok(finding.explanation.length > 0);
  }
  assert.equal(result.findings[0].taskId, 'one');
  assert.equal(result.findings[0].taskStatus, 'REVIEW');
  assert.equal(result.findings[0].dueDate, before.toISOString());
  assert.equal(result.findings[1].assignedMemberId, null);
  assert.equal(result.findings[0].href, '/w/example/projects/project#task-one');
  assert.equal(result.findings[2].href, '/w/example/projects/project');
  assert.equal(result.findings[2].taskId, null);
});

test('strict instant comparison excludes equal, future and missing dates and all DONE tasks', () => {
  const result = evaluate(project({ deadline: now, tasks: [
    task('equal', { dueDate: now }), task('future', { dueDate: after }), task('missing'),
    task('done', { status: 'DONE', dueDate: before, assignedMemberId: null }),
  ] }));
  assert.deepEqual(result.findings, []);
  assert.deepEqual(evaluate(project({ deadline: after })).findings, []);
});

test('all unfinished statuses qualify and records are distinct across both task rules', () => {
  const tasks = ['TODO', 'IN_PROGRESS', 'REVIEW'].map((status, i) => task(String(i), { status, dueDate: before, assignedMemberId: null }));
  const data = project({ tasks });
  assert.equal(evaluate(data).findings.length, 6);
  assert.deepEqual(evaluate(data), evaluate(project({ tasks: [...tasks].reverse() })));
  assert.deepEqual(data.tasks, tasks);
});

test('inactive projects produce no findings even with overdue unassigned tasks', () => {
  for (const status of ['PAUSED', 'COMPLETED', 'CANCELLED']) {
    assert.deepEqual(evaluate(project({ status, deadline: before, tasks: [task('one', { dueDate: before, assignedMemberId: null })] })).findings, []);
  }
});

test('unassigned tasks need no date; an overdue project needs no tasks', () => {
  assert.deepEqual(evaluate(project({ tasks: [task('one', { assignedMemberId: null })] })).findings.map(f => f.ruleId), ['TASK_UNASSIGNED']);
  assert.deepEqual(evaluate(project({ deadline: before })).findings.map(f => f.ruleId), ['PROJECT_DEADLINE_PASSED']);
});
