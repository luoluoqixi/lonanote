/** 角色由 Rust bootstrap 设定；启动期间禁止投影触发磁盘副作用。 */
let remote = false;
let ownerEpoch: number | undefined;
export const editorWindowRuntime = {
  ownerEpoch: () => ownerEpoch,
  setOwnerEpoch: (value: number) => {
    ownerEpoch = value;
  },
  isRemote: () => remote,
  setRemote: (value: boolean) => {
    remote = value;
  },
};
