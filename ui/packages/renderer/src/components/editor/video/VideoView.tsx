import { utils } from '@/utils';

export interface VideoViewProps {
  videoPath: string;
}

export default function VideoView({ videoPath }: VideoViewProps) {
  const videoSrc = utils.getMediaPath(videoPath);
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
      <video
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
        }}
        src={videoSrc}
        controls
      />
    </div>
  );
}
