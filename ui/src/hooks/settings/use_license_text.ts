import { useEffect, useState } from "react";

import { type LicenseScope, loadLicenseText } from "./license_text_data";

type LicenseTextState = {
  scope: LicenseScope;
  text: string;
  error: string | null;
  loading: boolean;
};
export function useLicenseText(scope: LicenseScope) {
  const [state, setState] = useState<LicenseTextState>({
    scope,
    text: "",
    error: null,
    loading: true,
  });
  useEffect(() => {
    let active = true;
    loadLicenseText(scope).then(
      (text) => {
        if (active) setState({ scope, text, error: null, loading: false });
      },
      () => {
        if (active) setState({ scope, text: "", error: "读取开源许可失败", loading: false });
      },
    );
    return () => {
      active = false;
    };
  }, [scope]);
  // 切换后立即屏蔽旧文本，避免新标签下短暂显示或复制到上一份内容。
  return state.scope === scope ? state : { scope, text: "", error: null, loading: true };
}
