import {
  Key,
  ProcessTerminal,
  TuiAltScreen,
  matchesKey,
  truncateToWidth,
  type Component,
  type TUI,
} from '@earendil-works/pi-tui';

import { readState } from '../.opencode/tools/themis-core.ts';
import type { ThemisState, WorkItemStatus } from '../.opencode/tools/themis-core.ts';
import { summarizeSprint } from './themis-view.ts';

const accent = (text: string): string => `\u001b[38;5;75m${text}\u001b[39m`;
const muted = (text: string): string => `\u001b[38;5;245m${text}\u001b[39m`;
const success = (text: string): string => `\u001b[38;5;114m${text}\u001b[39m`;
const warning = (text: string): string => `\u001b[38;5;221m${text}\u001b[39m`;

const columns: Array<{ status: WorkItemStatus; label: string }> = [
  { status: 'planned', label: 'Planned' },
  { status: 'in_progress', label: 'Running' },
  { status: 'review', label: 'Review' },
  { status: 'done', label: 'Done' },
  { status: 'blocked', label: 'Blocked' },
];

class SprintDashboard implements Component {
  private selectedSection = 0;
  private state: ThemisState;
  private readonly root: string;
  private readonly sprintId?: string;

  constructor(root: string, sprintId?: string) {
    this.root = root;
    this.sprintId = sprintId;
    this.state = readState(root);
  }

  reload(): void {
    this.state = readState(this.root);
    this.invalidate();
  }

  handleInput(data: string): void {
    if (matchesKey(data, Key.ctrl('c')) || matchesKey(data, Key.escape) || data === 'q') {
      this.onQuit?.();
      return;
    }
    if (matchesKey(data, Key.left) || data === 'h') this.selectedSection = Math.max(0, this.selectedSection - 1);
    if (matchesKey(data, Key.right) || data === 'l')
      this.selectedSection = Math.min(columns.length - 1, this.selectedSection + 1);
    if (data === 'r') this.reload();
    this.invalidate();
  }

  onQuit?: () => void;
  invalidate(): void {}

  render(width: number): string[] {
    const summary = summarizeSprint(this.root, this.sprintId);
    const membershipIds = summary.sprint
      ? new Set(
          this.state.sprintItems
            .filter((membership) => membership.sprintId === summary.sprint?.id)
            .map((membership) => membership.workItemId),
        )
      : undefined;
    const sprintItems = summary.sprint
      ? this.state.workItems.filter((item) => membershipIds?.has(item.id))
      : this.state.workItems;
    const selected = columns[this.selectedSection];
    const selectedItems = sprintItems.filter((item) => item.status === selected.status);
    const counts = columns.map(({ status, label }) => `${label} ${summary.counts[status]}`).join('  ');
    const lines = [
      accent(' THEMIS LOCAL CONTROL PLANE '),
      summary.sprint
        ? `${summary.sprint.projectId} / ${summary.sprint.id}  ${summary.sprint.goal}`
        : 'No active sprint',
      muted(`${counts}    Runs active ${summary.activeRuns}    Reviews ${summary.reviewCount}`),
      '',
      columns
        .map(({ label }, index) => (index === this.selectedSection ? accent(`[ ${label} ]`) : muted(`  ${label}  `)))
        .join('  '),
      ...selectedItems.map((item) => `${item.id}  ${item.epicId ? `${item.epicId}  ` : ''}${item.title}`),
      selectedItems.length === 0 ? muted('No work items in this lane.') : '',
      '',
      accent('Ready queue'),
      ...summary.ready.map((item) => success(`✓ ${item.id}  ${item.title}`)),
      summary.ready.length === 0 ? muted('No unblocked work.') : '',
      '',
      accent('Blocked'),
      ...summary.blocked.map((item) => warning(`! ${item.id}  ${item.title}`)),
      summary.blocked.length === 0 ? muted('No blocked work.') : '',
      '',
      muted('h/left  l/right  r/reload  q/esc/ctrl-c quit'),
    ];
    return lines.map((line) => truncateToWidth(line, Math.max(1, width)));
  }
}

const startTui = (root: string, sprintId?: string): void => {
  const terminal = new ProcessTerminal();
  const tui: TUI = new TuiAltScreen(terminal);
  const dashboard = new SprintDashboard(root, sprintId);
  dashboard.onQuit = () => {
    tui.stop();
  };
  tui.addChild(dashboard);
  tui.setFocus(dashboard);
  tui.start();
};

export { SprintDashboard, startTui };
