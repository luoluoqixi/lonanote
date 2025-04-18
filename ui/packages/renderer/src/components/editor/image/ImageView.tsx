import path from 'path-browserify-esm';

import { utils } from '@/utils';

export interface ImageViewProps {
  imgPath: string;
}

export default function ImageView({ imgPath }: ImageViewProps) {
  const fileName = path.basename(imgPath);
  const imgSrc = utils.getMediaPath(imgPath);
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <img
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
        }}
        src={imgSrc}
        alt={fileName}
      />
    </div>
  );
}
