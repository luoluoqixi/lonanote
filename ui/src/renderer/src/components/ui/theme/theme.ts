import { createSystem, defaultConfig, mergeConfigs } from '@chakra-ui/react';

const config = mergeConfigs(defaultConfig, {
  theme: {},
  cssVarsRoot: ':where(html, .chakra-theme)',
  globalCss: {
    '*': {
      '--chakra-radii-l1': 'var(--chakra-radii-md)',
      '--chakra-radii-l2': 'var(--chakra-radii-lg)',
      '--chakra-radii-l3': 'var(--chakra-radii-xl)',
    },
    html: {
      colorPalette: 'pink',
    },
  },
});

const system = createSystem(config);

export default system;
