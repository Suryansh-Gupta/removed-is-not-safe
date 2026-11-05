import { Composition } from "remotion";
import { Film } from "./Film";
import edl from "./edl.json";
export const RemotionRoot: React.FC = () => (
  <Composition id="Film" component={Film} durationInFrames={edl.beats * 30} fps={60} width={1920} height={1080} />
);
