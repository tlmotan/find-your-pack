import {AbsoluteFill, Easing, Sequence, interpolate, useCurrentFrame} from 'remotion';

export const FPS = 30;
export const DURATION = 150; // 5.0s

const COLUMNS = 5;
const TRANSITION_START = 45; // 1.5s
const STAGGER_FRAMES = (60 / 1000) * FPS; // 60ms per block = 1.8 frames
const PHASE = 8; // frames to cover, and again to clear
// Last block finishes covering here; the text swaps while every column is covered.
const SWAP_FRAME = Math.ceil(TRANSITION_START + (COLUMNS - 1) * STAGGER_FRAMES + PHASE);

const ease = Easing.bezier(0.76, 0, 0.24, 1);

const textStyle: React.CSSProperties = {
  color: '#fff',
  fontFamily: 'Helvetica Neue, Arial, sans-serif',
  fontWeight: 900,
  fontSize: 200,
  textTransform: 'uppercase',
};

const Scene = ({text, spacing}: {text: string; spacing: string}) => (
  <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
    <div style={{...textStyle, letterSpacing: spacing}}>{text}</div>
  </AbsoluteFill>
);

const Block = ({index}: {index: number}) => {
  const frame = useCurrentFrame();
  const delay = index * STAGGER_FRAMES;
  const coverStart = TRANSITION_START + delay;
  const clearStart = SWAP_FRAME + delay; // all blocks wait until the screen is fully covered
  const opts = {easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

  // -100% (above frame) -> 0% (covering) -> 100% (below frame)
  const y =
    frame < clearStart
      ? interpolate(frame, [coverStart, coverStart + PHASE], [-100, 0], opts)
      : interpolate(frame, [clearStart, clearStart + PHASE], [0, 100], opts);

  return (
    <div
      style={{
        width: `${100 / COLUMNS}%`,
        height: '100%',
        background: '#fff',
        transform: `translateY(${y}%)`,
      }}
    />
  );
};

export const KineticReveal = () => (
  <AbsoluteFill style={{background: '#0a0a0a'}}>
    <Sequence durationInFrames={SWAP_FRAME}>
      <Scene text="Old Section" spacing="0.02em" />
    </Sequence>
    <Sequence from={SWAP_FRAME}>
      <Scene text="New Reveal" spacing="-0.06em" />
    </Sequence>
    <AbsoluteFill style={{flexDirection: 'row'}}>
      {Array.from({length: COLUMNS}, (_, i) => (
        <Block key={i} index={i} />
      ))}
    </AbsoluteFill>
  </AbsoluteFill>
);
