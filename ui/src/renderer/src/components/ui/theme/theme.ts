/* eslint-disable quote-props */
import { createSystem, defaultConfig, mergeConfigs } from '@chakra-ui/react';

import { utils } from '@/utils';

export const createDynamicTheme = (color: string) => {
  const primary = utils.generateColorShades(color);
  const config = mergeConfigs(defaultConfig, {
    theme: {
      tokens: {
        colors: {
          primary,
        },
      },
      semanticTokens: {
        colors: {
          primary: {
            contrast: {
              value: {
                _light: 'white',
                _dark: 'white',
              },
            },
            fg: {
              value: {
                _light: '{colors.primary.700}',
                _dark: '{colors.primary.300}',
              },
            },
            subtle: {
              value: {
                _light: '{colors.primary.100}',
                _dark: '{colors.primary.900}',
              },
            },
            muted: {
              value: {
                _light: '{colors.primary.200}',
                _dark: '{colors.primary.800}',
              },
            },
            emphasized: {
              value: {
                _light: '{colors.primary.300}',
                _dark: '{colors.primary.700}',
              },
            },
            solid: {
              value: {
                _light: '{colors.primary.600}',
                _dark: '{colors.primary.600}',
              },
            },
            focusRing: {
              value: {
                _light: '{colors.primary.600}',
                _dark: '{colors.primary.600}',
              },
            },
          },
        },
      },
    },
    cssVarsRoot: ':where(html, .chakra-theme)',
    globalCss: {
      '*': {
        '--chakra-radii-l1': 'var(--chakra-radii-md)',
        '--chakra-radii-l2': 'var(--chakra-radii-lg)',
        '--chakra-radii-l3': 'var(--chakra-radii-xl)',
      },
      html: {
        colorPalette: 'primary',
      },
    },
  });

  const system = createSystem(config);
  return system;
};
