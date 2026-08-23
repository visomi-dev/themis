import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  evidenceMatrixErrors,
  invalidNotApplicableReasons,
  invalidValidationRows,
  missingValidationCategories,
  scopeChangeAction,
  traceabilityErrors,
  validationMatrixErrors,
  tracePlanPhases,
  validationCategories,
  type PhaseWorkItem,
} from './plan-fidelity.ts';

const completeValidation = validationCategories.map(
  (category) => `[${category}][not-applicable] No changed behavior is observable by this category.`,
);

describe('approved plan fidelity evaluation', () => {
  it('reports omitted phases and unrepresented rich steps instead of collapsing them', () => {
    const items: PhaseWorkItem[] = [
      {
        id: 'THM-001',
        phaseIds: ['research'],
        status: 'ready',
        acceptanceCriteria: ['UX research findings are attached'],
        scopeIn: ['docs/research/**'],
      },
    ];

    assert.deepEqual(
      tracePlanPhases(
        [
          { id: 'research', title: 'UX research', richSteps: ['UX research findings'] },
          { id: 'prototype', title: 'Prototype', richSteps: ['interactive prototype'] },
        ],
        items,
      ),
      [
        { phaseId: 'research', phaseTitle: 'UX research', itemIds: ['THM-001'], statuses: ['ready'], gaps: [] },
        {
          phaseId: 'prototype',
          phaseTitle: 'Prototype',
          itemIds: [],
          statuses: [],
          gaps: [
            'No work item or explicit sub-scope maps to this phase.',
            'Rich plan step is not observable: interactive prototype',
          ],
        },
      ],
    );
  });

  it('requires a traceability row before and after mutation', () => {
    const before = tracePlanPhases([{ id: 'flow', title: 'User flow' }], []);
    const after = tracePlanPhases(
      [{ id: 'flow', title: 'User flow' }],
      [
        {
          id: 'THM-002',
          phaseIds: ['flow'],
          status: 'ready',
          acceptanceCriteria: ['User flow is documented'],
          scopeIn: ['docs/flows/**'],
        },
      ],
    );

    assert.equal(before[0]?.gaps.length, 1);
    assert.deepEqual(after[0]?.itemIds, ['THM-002']);
    assert.deepEqual(after[0]?.statuses, ['ready']);
  });

  it('makes scope changes explicit and rejects incomplete validation matrices', () => {
    assert.equal(scopeChangeAction(true, true), 'update-and-rework');
    assert.equal(scopeChangeAction(true, false), 'create-new-item');
    assert.equal(scopeChangeAction(false, true), 'no-mutation');
    assert.deepEqual(missingValidationCategories(completeValidation.slice(0, -1)), ['build']);
    assert.deepEqual(invalidNotApplicableReasons(['[api][not-applicable]']), ['[api][not-applicable]']);
    assert.deepEqual(
      invalidValidationRows([
        completeValidation[0]!,
        completeValidation[0]!,
        '[api][required]',
        '[unknown][required] run-check',
      ]),
      [
        'Duplicate validation row: unit',
        'Malformed validation row: [api][required]',
        'Malformed validation row: [unknown][required] run-check',
      ],
    );
    assert.match(validationMatrixErrors(completeValidation.slice(0, -1)).join('\n'), /Missing validation row: build/);
  });

  it('makes traceability and evidence completeness executable', () => {
    assert.deepEqual(traceabilityErrors(tracePlanPhases([{ id: 'missing', title: 'Missing phase' }], [])), [
      'missing: No work item or explicit sub-scope maps to this phase.',
    ]);
    assert.deepEqual(
      evidenceMatrixErrors(
        ['unit', 'security'],
        [
          { summary: '[unit] check', value: 'Command: pnpm test\nResult: passed\nReport: terminal' },
          { summary: '[unit] duplicate', value: 'Command: pnpm test\nResult: passed\nReport: terminal' },
        ],
      ),
      ['Expected one evidence entry for unit, found 2', 'Expected one evidence entry for security, found 0'],
    );
  });

  it('keeps mutation authorization and evidence semantics explicit in guidance', () => {
    const coordinator = readFileSync(join(process.cwd(), '.opencode/agents/themis-coordinator.md'), 'utf8');
    const verifier = readFileSync(join(process.cwd(), '.opencode/agents/themis-verifier.md'), 'utf8');

    assert.match(coordinator, /Use Themis tools for every state mutation/);
    assert.match(coordinator, /Never edit `\.themis\/state\.json`\s+or\s+`\.themis\/events\.ndjson` directly/);
    assert.match(verifier, /never infer a pass from a build or unit test/);
  });
});
