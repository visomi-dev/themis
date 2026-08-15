import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, it } from 'node:test';

import { createWorkItem } from '../.opencode/tools/themis-core.ts';
import { SprintDashboard } from './themis-tui.ts';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('Themis TUI dashboard', () => {
  it('renders a bounded dashboard from local state', () => {
    const root = mkdtempSync(join(tmpdir(), 'themis-tui-'));
    roots.push(root);
    createWorkItem(
      root,
      {
        title: 'TUI work item',
        summary: 'Dashboard should render local state',
        acceptanceCriteria: ['The dashboard shows the item'],
        scopeIn: ['fixture/**'],
        scopeOut: [],
        verificationStrategy: ['node --test'],
      },
      'human:test',
    );
    const dashboard = new SprintDashboard(root);
    const lines = dashboard.render(80);
    assert.ok(lines.some((line) => line.includes('THEMIS LOCAL CONTROL PLANE')));
    assert.ok(lines.every((line) => line.replace(/\u001b\[[0-9;]*m/g, '').length <= 80));
  });
});
