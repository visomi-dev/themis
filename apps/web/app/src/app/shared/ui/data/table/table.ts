import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, Component, computed, contentChildren, input } from '@angular/core';

import { uiClass } from '../../classes';

import { TableCell, type TableColumn } from './table-cell/table-cell';

type TableRow = Record<string, unknown> & {
  id?: number | string;
};

@Component({
  host: {
    class: /* tw */ 'block overflow-hidden rounded-[var(--radius-panel)] border border-zinc-950/10 dark:border-white/10/50 bg-zinc-50 dark:bg-zinc-900',
  },
  imports: [NgTemplateOutlet],
  selector: 'app-table',
  templateUrl: './table.html',
  styleUrl: './table.css',
})
export class Table<T extends TableRow = TableRow> {
  readonly templates = contentChildren<TableCell<T>>(TableCell);

  readonly columns = input<readonly TableColumn<T>[]>([]);
  readonly data = input<readonly T[]>([]);
  readonly dense = input(false, { transform: booleanAttribute });
  readonly mobileCards = input(false, { transform: booleanAttribute });
  readonly stickyHeaders = input(false, { transform: booleanAttribute });

  readonly declarative = computed(() => this.columns().length > 0);
  readonly tableClasses = computed(() => uiClass('min-w-full text-left text-sm text-zinc-950 dark:text-zinc-50', this.dense() && 'text-xs'));
  readonly headClasses = computed(() => uiClass(this.mobileCards() && 'hidden md:table-header-group'));
  readonly bodyClasses = computed(() =>
    uiClass('divide-y divide-outline-variant/50', this.mobileCards() && 'flex flex-col md:table-row-group'),
  );
  readonly rowClasses = computed(() =>
    uiClass(
      'text-zinc-950 dark:text-zinc-50 transition',
      this.mobileCards() ? 'flex flex-col px-4 py-4 md:table-row md:px-0 md:py-0' : 'hover:bg-zinc-100 dark:bg-zinc-800',
    ),
  );
  readonly templatesMap = computed(() => {
    const map = new Map<Extract<keyof T, string>, TableCell<T>['template']>();

    for (const template of this.templates()) {
      map.set(template.appTableCell(), template.template);
    }

    return map;
  });

  headerClasses(column: TableColumn<T>): string {
    return uiClass(
      column.class,
      this.stickyHeaders() && 'md:sticky md:top-0 md:z-10 md:bg-zinc-100 dark:bg-zinc-800',
      'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400',
    );
  }

  cellClasses(column: TableColumn<T>): string {
    return uiClass(column.class, 'px-4 py-3 align-top');
  }

  cellValue(row: T, column: TableColumn<T>): unknown {
    return row[column.key];
  }

  rowTrack(index: number, row: T): number | string {
    return row.id ?? index;
  }
}
