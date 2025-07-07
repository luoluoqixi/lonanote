export interface LatestVersionAsset {
  browser_download_url?: string;
  content_type?: string;
  created_at?: string;
  download_count?: number;
  id?: number;
  label?: null | string;
  name?: string;
  node_id?: string;
  size?: number;
  state?: string;
  updated_at?: string;
  uploader?: any;
  url?: string;
}

export interface LatestVersion {
  assets?: LatestVersionAsset[];
  assets_url?: string;
  author?: any;
  body?: string;
  created_at?: string;
  draft?: boolean;
  html_url?: string;
  id?: number;
  name?: string;
  node_id?: string;
  prerelease?: boolean;
  published_at?: string;
  tag_name?: string;
  tarball_url?: string;
  target_commitish?: string;
  upload_url?: string;
  url?: string;
  zipball_url?: string;
}

export const checkUpdate = async (currentVersion: string) => {
  // https://api.github.com/repos/luoluoqixi/lonanote/releases/latest
  const getLatestUrl = 'https://api.github.com/repos/luoluoqixi/lonanote/releases/latest';
  const response = await fetch(getLatestUrl);
  if (response.ok) {
    const r: LatestVersion | null = await response.json();
    if (r == null) {
      throw new Error('fetch latest version error, response is null');
    }
    const tagName: string | undefined = r.tag_name;
    const currentVersionTag = `v${currentVersion}`;
    if (tagName === currentVersionTag) {
      return null;
    }
    return {
      downloadUrl: 'https://github.com/luoluoqixi/lonanote/releases/latest',
      latestVersion: r,
    };
  }
  throw new Error(`fetch latest version error: ${response.status}, ${getLatestUrl}`);
};
