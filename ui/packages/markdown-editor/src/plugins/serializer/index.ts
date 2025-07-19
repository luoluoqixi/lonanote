import { $remark } from '@milkdown/utils';
import remarkStringify from 'remark-stringify';

import { withMeta } from '@/utils';

export const remarkSerializerPlugin = $remark('remark-serializer', () => remarkStringify, {
  bullet: '*', // default is *
  bulletOther: '-',
  bulletOrdered: '.',
});

withMeta(remarkSerializerPlugin.plugin, {
  displayName: 'RemarkSerializerPlugin',
  group: 'Remark',
});

withMeta(remarkSerializerPlugin.options, {
  displayName: 'RemarkConfig<remarkSerializerPlugin>',
  group: 'Remark',
});
