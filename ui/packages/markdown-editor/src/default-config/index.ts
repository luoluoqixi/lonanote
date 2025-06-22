import { languages } from '@codemirror/language-data';
import { oneDark } from '@codemirror/theme-one-dark';

import { type FeaturesConfig, MarkdownFeature } from '../features';
import { chevronDownIcon, clearIcon, editIcon, searchIcon, visibilityOffIcon } from '../icons';

export const defaultConfig: FeaturesConfig = {
  [MarkdownFeature.CodeMirror]: {
    theme: oneDark,
    languages,
    expandIcon: chevronDownIcon,
    searchIcon,
    clearSearchIcon: clearIcon,
    searchPlaceholder: 'Search language',
    noResultText: 'No result',
    previewToggleIcon: (previewOnlyMode) => (previewOnlyMode ? editIcon : visibilityOffIcon),
  },
};
