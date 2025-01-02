import { createSystem, defaultConfig, mergeConfigs } from '@chakra-ui/react';

const config = mergeConfigs(defaultConfig, {
  theme: {
    tokens: {
      colors: {
        primary: {
          '50': { value: '#fef5fb' },
          '100': { value: '#fcd5ee' },
          '200': { value: '#f9afde' },
          '300': { value: '#f57cc8' },
          '400': { value: '#f25aba' },
          '500': { value: '#e3299f' },
          '600': { value: '#c12386' },
          '700': { value: '#9c1c6c' },
          '800': { value: '#84185c' },
          '900': { value: '#611143' },
        },
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

export default system;
