import { countries, worldHeight, worldWidth } from "./worldPath";
import type { Continent } from "./worldPath";
import type { TripPin } from "./house";

// A wooden puzzle map: each continent in its own wood, countries alternating two shades of it.
const woods: Record<Continent, [string, string]> = {
  na: ["#A5BCD6", "#8FA9C8"],
  sa: ["#D9A86C", "#C9955A"],
  eu: ["#E3C07A", "#D2AC62"],
  af: ["#9C6A4A", "#8C5A3C"],
  as: ["#7FA383", "#6B8F71"],
  oc: ["#C97B63", "#B86B54"],
};

type Props = {
  pins: TripPin[];
  // Pin size in map units: the small frame on the wall needs bigger pins to be seen.
  pinScale?: number;
  selected?: string | null;
  onPick?: (id: string) => void;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

export function WorldMapArt({ pins, pinScale = 1, selected = null, onPick, x, y, width, height }: Props) {
  const placed = pins.filter((pin) => pin.x !== null && pin.y !== null);
  return (
    <svg className="world-map-art" x={x} y={y} width={width} height={height} viewBox={`0 0 ${worldWidth} ${worldHeight}`} preserveAspectRatio="xMidYMid meet">
      <g stroke="#FBF6DA" strokeWidth="1.2" strokeLinejoin="round">
        {countries.map(([name, continent, path], index) => <path key={name} d={path} fill={woods[continent][index % 2]} />)}
      </g>
      {placed.map((pin) => {
        const size = 9 * pinScale * (pin.id === selected ? 1.25 : 1);
        const px = pin.x as number;
        const py = pin.y as number;
        const head = pin.past ? "#4D0E12" : "#FFFDF3";
        return (
          <g key={pin.id} className={`map-pin ${pin.past ? "is-past" : "is-next"}`} onClick={onPick ? () => onPick(pin.id) : undefined} style={onPick ? { cursor: "pointer" } : undefined}>
            <ellipse cx={px + size * 0.3} cy={py + size * 0.15} rx={size * 0.45} ry={size * 0.18} fill="#231815" opacity=".25" />
            <path d={`M${px} ${py}l${-size * 0.32} ${-size * 1.25}a${size * 0.62} ${size * 0.62} 0 1 1 ${size * 0.64} 0z`} fill={head} stroke="#4D0E12" strokeWidth={size * 0.16} />
            <circle cx={px} cy={py - size * 1.62} r={size * 0.2} fill={pin.past ? "#F5EFC6" : "#4D0E12"} />
          </g>
        );
      })}
    </svg>
  );
}
