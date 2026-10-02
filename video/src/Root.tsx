import { Composition } from 'remotion';
import { FPS, H, W } from './theme';
import { TOTAL_FRAMES } from './timeline';
import { Trailer } from './Trailer';

export function Root() {
  const shared = { component: Trailer, durationInFrames: TOTAL_FRAMES, fps: FPS, width: W, height: H };
  return (
    <>
      {/* Sound design, no narration. */}
      <Composition id="CyklaTrailer" {...shared} defaultProps={{ narration: false }} />
      {/* Same picture and sound design plus narration; the effects duck under the voice. */}
      <Composition id="CyklaTrailerNarrated" {...shared} defaultProps={{ narration: true }} />
    </>
  );
}
