import {Composition} from 'remotion';
import {KineticReveal, FPS, DURATION} from './KineticReveal';

export const Root = () => (
  <Composition
    id="KineticReveal"
    component={KineticReveal}
    durationInFrames={DURATION}
    fps={FPS}
    width={1920}
    height={1080}
  />
);
