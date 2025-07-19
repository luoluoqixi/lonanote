import type { Ctx } from '@milkdown/kit/ctx';

import { editorActionList } from '@/utils';

import { useMarkdownFeatures } from '../../../core/slice';
import { MarkdownFeature } from '../../../features';
import {
  bulletListIcon,
  codeIcon,
  dividerIcon,
  functionsIcon,
  h1Icon,
  h2Icon,
  h3Icon,
  h4Icon,
  h5Icon,
  h6Icon,
  imageIcon,
  orderedListIcon,
  quoteIcon,
  tableIcon,
  textIcon,
  todoListIcon,
} from '../../../icons';
import { GroupBuilder, type MenuItemGroup } from '../../../utils/group-builder';
import type { BlockEditFeatureConfig } from '../index';
import { type SlashMenuItem } from './utils';

export function getGroups(filter?: string, config?: BlockEditFeatureConfig, ctx?: Ctx) {
  const flags = ctx && useMarkdownFeatures(ctx).get();
  const isLatexEnabled = flags?.includes(MarkdownFeature.Latex);
  const isImageBlockEnabled = flags?.includes(MarkdownFeature.Image);
  const isTableEnabled = flags?.includes(MarkdownFeature.Table);

  const groupBuilder = new GroupBuilder<SlashMenuItem>();
  if (config?.textGroup !== null) {
    const textGroup = groupBuilder.addGroup('text', config?.textGroup?.label ?? 'Text');
    if (config?.textGroup?.text !== null) {
      textGroup.addItem('text', {
        label: config?.textGroup?.text?.label ?? 'Text',
        icon: config?.textGroup?.text?.icon ?? textIcon,
        onRun: (ctx) => {
          editorActionList.text.run(ctx);
        },
      });
    }

    if (config?.textGroup?.h1 !== null) {
      textGroup.addItem('h1', {
        label: config?.textGroup?.h1?.label ?? 'Heading 1',
        icon: config?.textGroup?.h1?.icon ?? h1Icon,
        onRun: (ctx) => {
          editorActionList.h1.run(ctx);
        },
      });
    }

    if (config?.textGroup?.h2 !== null) {
      textGroup.addItem('h2', {
        label: config?.textGroup?.h2?.label ?? 'Heading 2',
        icon: config?.textGroup?.h2?.icon ?? h2Icon,
        onRun: (ctx) => {
          editorActionList.h2.run(ctx);
        },
      });
    }

    if (config?.textGroup?.h3 !== null) {
      textGroup.addItem('h3', {
        label: config?.textGroup?.h3?.label ?? 'Heading 3',
        icon: config?.textGroup?.h3?.icon ?? h3Icon,
        onRun: (ctx) => {
          editorActionList.h3.run(ctx);
        },
      });
    }

    if (config?.textGroup?.h4 !== null) {
      textGroup.addItem('h4', {
        label: config?.textGroup?.h4?.label ?? 'Heading 4',
        icon: config?.textGroup?.h4?.icon ?? h4Icon,
        onRun: (ctx) => {
          editorActionList.h4.run(ctx);
        },
      });
    }

    if (config?.textGroup?.h5 !== null) {
      textGroup.addItem('h5', {
        label: config?.textGroup?.h5?.label ?? 'Heading 5',
        icon: config?.textGroup?.h5?.icon ?? h5Icon,
        onRun: (ctx) => {
          editorActionList.h5.run(ctx);
        },
      });
    }

    if (config?.textGroup?.h6 !== null) {
      textGroup.addItem('h6', {
        label: config?.textGroup?.h6?.label ?? 'Heading 6',
        icon: config?.textGroup?.h6?.icon ?? h6Icon,
        onRun: (ctx) => {
          editorActionList.h6.run(ctx);
        },
      });
    }

    if (config?.textGroup?.quote !== null) {
      textGroup.addItem('quote', {
        label: config?.textGroup?.quote?.label ?? 'Quote',
        icon: config?.textGroup?.quote?.icon ?? quoteIcon,
        onRun: (ctx) => {
          editorActionList.quote.run(ctx);
        },
      });
    }

    if (config?.textGroup?.divider !== null) {
      textGroup.addItem('divider', {
        label: config?.textGroup?.divider?.label ?? 'Divider',
        icon: config?.textGroup?.divider?.icon ?? dividerIcon,
        onRun: (ctx) => {
          editorActionList.divider.run(ctx);
        },
      });
    }
  }

  if (config?.listGroup !== null) {
    const listGroup = groupBuilder.addGroup('list', config?.listGroup?.label ?? 'List');
    if (config?.listGroup?.bulletList !== null) {
      listGroup.addItem('bullet-list', {
        label: config?.listGroup?.bulletList?.label ?? 'Bullet List',
        icon: config?.listGroup?.bulletList?.icon ?? bulletListIcon,
        onRun: (ctx) => {
          editorActionList['bullet-list'].run(ctx);
        },
      });
    }

    if (config?.listGroup?.orderedList !== null) {
      listGroup.addItem('ordered-list', {
        label: config?.listGroup?.orderedList?.label ?? 'Ordered List',
        icon: config?.listGroup?.orderedList?.icon ?? orderedListIcon,
        onRun: (ctx) => {
          editorActionList['ordered-list'].run(ctx);
        },
      });
    }

    if (config?.listGroup?.taskList !== null) {
      listGroup.addItem('task-list', {
        label: config?.listGroup?.taskList?.label ?? 'Task List',
        icon: config?.listGroup?.taskList?.icon ?? todoListIcon,
        onRun: (ctx) => {
          editorActionList['task-list'].run(ctx);
        },
      });
    }
  }

  if (config?.advancedGroup !== null) {
    const advancedGroup = groupBuilder.addGroup(
      'advanced',
      config?.advancedGroup?.label ?? 'Advanced',
    );

    if (config?.advancedGroup?.image !== null && isImageBlockEnabled) {
      advancedGroup.addItem('image', {
        label: config?.advancedGroup?.image?.label ?? 'Image',
        icon: config?.advancedGroup?.image?.icon ?? imageIcon,
        onRun: (ctx) => {
          editorActionList['image-block'].run(ctx);
        },
      });
    }

    // ==== 修改 ====
    if (config?.advancedGroup?.imageLink !== null) {
      advancedGroup.addItem('image-link', {
        label: config?.advancedGroup?.imageLink?.label ?? 'Image Link',
        icon: config?.advancedGroup?.imageLink?.icon ?? imageIcon,
        onRun: (ctx) => {
          editorActionList['image-inline'].run(ctx);
        },
      });
    }

    if (config?.advancedGroup?.codeBlock !== null) {
      advancedGroup.addItem('code', {
        label: config?.advancedGroup?.codeBlock?.label ?? 'Code',
        icon: config?.advancedGroup?.codeBlock?.icon ?? codeIcon,
        onRun: (ctx) => {
          editorActionList['code-block'].run(ctx);
        },
      });
    }

    if (config?.advancedGroup?.table !== null && isTableEnabled) {
      advancedGroup.addItem('table', {
        label: config?.advancedGroup?.table?.label ?? 'Table',
        icon: config?.advancedGroup?.table?.icon ?? tableIcon,
        onRun: (ctx) => {
          editorActionList.table.run(ctx);
        },
      });
    }

    if (config?.advancedGroup?.math !== null && isLatexEnabled) {
      advancedGroup.addItem('math', {
        label: config?.advancedGroup?.math?.label ?? 'Math',
        icon: config?.advancedGroup?.math?.icon ?? functionsIcon,
        onRun: (ctx) => {
          editorActionList.math.run(ctx);
        },
      });
    }
  }

  config?.buildMenu?.(groupBuilder);

  let groups = groupBuilder.build();

  if (filter) {
    groups = groups
      .map((group) => {
        const items = group.items.filter((item) =>
          item.label.toLowerCase().includes(filter.toLowerCase()),
        );

        return {
          ...group,
          items,
        };
      })
      .filter((group) => group.items.length > 0);
  }

  const items = groups.flatMap((groups) => groups.items);
  items.forEach((item, index) => {
    Object.assign(item, { index });
  });

  groups.reduce((acc, group) => {
    const end = acc + group.items.length;
    Object.assign(group, {
      range: [acc, end],
    });
    return end;
  }, 0);

  return {
    groups: groups as MenuItemGroup<SlashMenuItem>[],
    size: items.length,
  };
}
