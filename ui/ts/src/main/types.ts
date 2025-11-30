export interface MenuItemConfig {
  id?: string;
  role?:
    | 'undo'
    | 'redo'
    | 'cut'
    | 'copy'
    | 'paste'
    | 'pasteAndMatchStyle'
    | 'delete'
    | 'selectAll'
    | 'reload'
    | 'forceReload'
    | 'toggleDevTools'
    | 'resetZoom'
    | 'zoomIn'
    | 'zoomOut'
    | 'toggleSpellChecker'
    | 'togglefullscreen'
    | 'window'
    | 'minimize'
    | 'close'
    | 'help'
    | 'about'
    | 'services'
    | 'hide'
    | 'hideOthers'
    | 'unhide'
    | 'quit'
    | 'showSubstitutions'
    | 'toggleSmartQuotes'
    | 'toggleSmartDashes'
    | 'toggleTextReplacement'
    | 'startSpeaking'
    | 'stopSpeaking'
    | 'zoom'
    | 'front'
    | 'appMenu'
    | 'fileMenu'
    | 'editMenu'
    | 'viewMenu'
    | 'shareMenu'
    | 'recentDocuments'
    | 'toggleTabBar'
    | 'selectNextTab'
    | 'selectPreviousTab'
    | 'showAllTabs'
    | 'mergeAllWindows'
    | 'clearRecentDocuments'
    | 'moveTabToNewWindow'
    | 'windowMenu';
  type?: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio' | 'header' | 'palette';
  label?: string;
  /**
   * Available in macOS >= 14.4
   *
   * @platform darwin
   */
  sublabel?: string;
  /**
   * Hover text for this menu item.
   *
   * @platform darwin
   */
  toolTip?: string;
  icon?: string;
  accelerator?: string;
  enabled?: boolean;
  /**
   * default is `true`, and when `false` will prevent the accelerator from triggering
   * the item if the item is not visible.
   *
   * @platform darwin
   */
  acceleratorWorksWhenHidden?: boolean;
  /**
   * If false, the menu item will be entirely hidden.
   */
  visible?: boolean;
  /**
   * Should only be specified for `checkbox` or `radio` type menu items.
   */
  checked?: boolean;
  /**
   * If false, the accelerator won't be registered with the system, but it will still
   * be displayed. Defaults to true.
   *
   * @platform linux,win32
   */
  registerAccelerator?: boolean;
  /**
   * Should be specified for `submenu` type menu items. If `submenu` is specified,
   * the `type: 'submenu'` can be omitted. If the value is not a `Menu` then it will
   * be automatically converted to one using `Menu.buildFromTemplate`.
   */
  submenu?: MenuItemConfig[];
  /**
   * Inserts this item before the item with the specified id. If the referenced item
   * doesn't exist the item will be inserted at the end of  the menu. Also implies
   * that the menu item in question should be placed in the same “group” as the item.
   */
  before?: string[];
  /**
   * Inserts this item after the item with the specified id. If the referenced item
   * doesn't exist the item will be inserted at the end of the menu.
   */
  after?: string[];
  /**
   * Provides a means for a single context menu to declare the placement of their
   * containing group before the containing group of the item with the specified id.
   */
  beforeGroupContaining?: string[];
  /**
   * Provides a means for a single context menu to declare the placement of their
   * containing group after the containing group of the item with the specified id.
   */
  afterGroupContaining?: string[];
  data?: any;
}
