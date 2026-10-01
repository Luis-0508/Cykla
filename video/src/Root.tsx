import { Composition } from 'remotion';
import { FPS, H, W } from './theme';
import { TOTAL_FRAMES, Trailer } from './Trailer';

export function Root() {
  return (
    <Composition
      id="CyklaTrailer"
      component={Trailer}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={W}
      height={H}
    />
  );
}
