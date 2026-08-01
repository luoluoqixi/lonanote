const localeCNList = ["zh", "cn", "hans"];

export const isLocaleCN = (locale: string) => {
  const localeLower = locale.toLowerCase();
  const count = localeCNList.length;
  for (let i = 0; i < count; i++) {
    if (localeLower.includes(localeCNList[i])) {
      return true;
    }
  }
  return false;
};
