import type { NativeMenuItem } from "rn-ui-kit";

export type DesktopMenuItem = Omit<NativeMenuItem, "onSelect" | "subMenu"> & {
  id: string;
  subMenu?: DesktopMenuItem[];
};
type MenuAction = () => void | Promise<void>;

/** 仅向 Rust 传输菜单数据，回调保留在当前请求内；父菜单禁用状态向下继承。 */
export function createDesktopMenuItems(items: NativeMenuItem[]) {
  const actions = new Map<string, MenuAction>();
  let nextId = 0;
  const convert = (entries: NativeMenuItem[], parentDisabled = false): DesktopMenuItem[] =>
    entries.map((item) => {
      const id = `menu-action-${nextId++}`;
      const disabled = parentDisabled || item.disabled === true;
      const subMenu = item.subMenu?.length ? convert(item.subMenu, disabled) : undefined;
      if (!disabled && !item.separator && !subMenu && item.onSelect) actions.set(id, item.onSelect);
      return {
        id,
        text: item.text,
        disabled,
        checked: item.checked,
        separator: item.separator,
        subMenu,
      };
    });
  return { items: convert(items), actions };
}
