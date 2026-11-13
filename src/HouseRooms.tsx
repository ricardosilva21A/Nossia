import { Avatar } from "./Avatar";
import { Mascot as PetArt } from "./Mascot";
import { avatarOf, defaultAvatar, petLook } from "./mascots";
import type { Mascot, Pet } from "./mascots";
import type { HouseScene, PetMode, Room } from "./house";
import type { HomePartner } from "./types";

// The other rooms of the house, one at the top of each part of the app: the kitchen over the
// Agenda, the bedroom over Nós, the garden over Explorar. Placeholders: Marta's drawings replace
// the <svg>; who is where comes from the same decideHouse as the living room.

type Props = {
  room: Exclude<Room, "sala">;
  scene: HouseScene;
  mascots: Mascot[];
  pet: Pet | null;
  petPlace: { mode: PetMode; room: Room };
  names: Record<HomePartner, string>;
};

const slots: HomePartner[] = ["partner_one", "partner_two"];
const roomNames: Record<Props["room"], string> = { cozinha: "A cozinha", quarto: "O quarto", jardim: "O jardim" };

// The garden changes with the season and the weather: blossoms in spring, the pool in the sun,
// brown leaves in autumn, bare branches in winter, and at Christmas snow, a snowman and the tree.
function Garden({ scene, night }: { scene: HouseScene; night: boolean }) {
  const { season, sky, christmas } = scene;
  const snowy = christmas || sky === "snow";
  const skyColor = night ? "#26304f" : sky === "rain" ? "#9fb0bd" : sky === "fog" ? "#e3e3df" : sky === "clouds" || sky === "snow" ? "#d5dde3" : "#bfe3f5";
  const grass = snowy ? "#f4f7fb" : season === "spring" ? "#9cc58f" : season === "summer" ? "#a9cf7f" : season === "autumn" ? "#b9a86a" : "#b9c7b0";
  const grassFront = snowy ? "#e6edf5" : season === "autumn" ? "#a8955a" : season === "winter" ? "#a6b59e" : "#86b37a";
  return (
    <svg className="room-art" viewBox="0 0 1080 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="1080" height="300" fill={skyColor} />
      {night ? <circle cx="930" cy="56" r="24" fill="#f5efc6" /> : sky === "sun" && <circle cx="930" cy="56" r="32" fill="#ffe08a" />}
      {!night && (sky === "clouds" || sky === "rain" || sky === "snow") && <g fill="#fff" opacity=".85"><ellipse cx="620" cy="50" rx="70" ry="22" /><ellipse cx="670" cy="38" rx="44" ry="22" /><ellipse cx="860" cy="70" rx="56" ry="18" /></g>}
      <path d="M0 200c180-40 360-40 540-10s360 30 540-10v120H0z" fill={grass} />
      <rect y="252" width="1080" height="48" fill={grassFront} />
      {/* The front of the house, its door and the dog flap the animal goes out through */}
      <rect x="40" y="70" width="300" height="190" fill="#f4e8d4" />
      <path d="M20 80L190 6l170 74z" fill={snowy ? "#fff" : "#b5523b"} />
      {snowy && <path d="M20 80L190 6l170 74" fill="none" stroke="#b5523b" strokeWidth="6" />}
      {christmas && Array.from({ length: 9 }, (_, index) => <circle key={index} cx={40 + index * 38} cy={86 - Math.abs(4 - index) * 2} r="6" fill={["#e04848", "#f5c542", "#4aa3df", "#6ac46a"][index % 4]} />)}
      <rect x="150" y="140" width="80" height="120" rx="4" fill="#8C5A3C" />
      <rect x="172" y="222" width="36" height="38" rx="6" fill="#6b4430" stroke="#4a2e27" strokeWidth="3" />
      {christmas && <circle cx="190" cy="168" r="16" fill="none" stroke="#3f7d4a" strokeWidth="8" />}
      <rect x="262" y="112" width="56" height="48" rx="4" fill={night ? "#ffd77a" : "#cfe3ef"} stroke="#fff" strokeWidth="6" />
      {/* The tree, dressed for the season */}
      {christmas ? <g>
        <rect x="783" y="210" width="16" height="44" fill="#8C5A3C" />
        <path d="M791 80l-60 140h120z" fill="#3f7d4a" />
        <path d="M791 60l-6 14h12z" fill="#f5c542" />
        {[[770, 150], [810, 175], [760, 195], [820, 205], [790, 120]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="7" fill="#e04848" />)}
      </g> : <g>
        <rect x="780" y="150" width="22" height="104" fill="#8C5A3C" />
        {season === "winter"
          ? <path d="M791 160l-40-60M791 150l44-56M791 130l-14-50M770 128l-30-6M815 118l28-10" stroke="#8C5A3C" strokeWidth="8" strokeLinecap="round" />
          : <circle cx="791" cy="128" r="66" fill={season === "autumn" ? "#d9823b" : "#6B8F71"} />}
        {season === "autumn" && <circle cx="760" cy="110" r="30" fill="#b5523b" />}
        {season === "spring" && [[760, 100], [810, 90], [830, 140], [770, 150], [795, 120]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="9" fill="#f6b6c8" />)}
      </g>}
      {/* Snowman, autumn leaves on the ground, spring flowers */}
      {christmas && <g><circle cx="900" cy="236" r="26" fill="#fff" stroke="#dfe6ee" strokeWidth="3" /><circle cx="900" cy="196" r="18" fill="#fff" stroke="#dfe6ee" strokeWidth="3" /><path d="M900 198l14 4-14 3z" fill="#e8893a" /><circle cx="894" cy="192" r="2.5" fill="#231815" /><circle cx="906" cy="192" r="2.5" fill="#231815" /><path d="M884 210h32" stroke="#e04848" strokeWidth="6" /></g>}
      {season === "autumn" && !snowy && [[680, 268], [720, 280], [860, 264], [910, 284], [360, 280], [980, 270], [640, 286]].map(([x, y], index) => <ellipse key={index} cx={x} cy={y} rx="9" ry="5" fill={index % 2 ? "#b5523b" : "#d9823b"} transform={`rotate(${index * 40} ${x} ${y})`} />)}
      {season === "spring" && !snowy && [[370, 262], [660, 270], [700, 286], [880, 262], [940, 282], [1000, 266], [395, 284]].map(([x, y], index) => <g key={index}><path d={`M${x} ${y + 12}v-12`} stroke="#4f7a52" strokeWidth="3" /><circle cx={x} cy={y} r="7" fill={["#f6b6c8", "#ffe08a", "#ffffff", "#c9a7e8"][index % 4]} /></g>)}
      {/* A low hedge far at the back, with a little gate: the animal can't run off, but it isn't fenced in */}
      <g fill={snowy ? "#e9eef3" : season === "autumn" ? "#8f8a4a" : "#5f8a5c"}>
        {Array.from({ length: 13 }, (_, index) => <ellipse key={index} cx={380 + index * 54} cy="204" rx="34" ry="16" />)}
      </g>
      <g stroke="#fff" strokeWidth="5" fill="none"><path d="M1000 186v30M1040 186v30M1000 194h40M1000 208h40" /></g>
      {night && <rect width="1080" height="300" fill="#141a33" opacity=".25" />}
    </svg>
  );
}

function Art({ room, night, scene, petName }: { room: Props["room"]; night: boolean; scene: HouseScene; petName: string | null }) {
  if (room === "jardim") return <Garden scene={scene} night={night} />;
  if (room === "cozinha") return (
    <svg className="room-art" viewBox="0 0 1080 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="1080" height="300" fill="#eef1e4" />
      <path d="M0 0h1080v150H0z" fill="#e3e9d6" />
      {Array.from({ length: 18 }, (_, index) => <path key={index} d={`M${index * 60} 70v80`} stroke="#d3dcc2" strokeWidth="2" />)}
      <path d="M0 110h1080" stroke="#d3dcc2" strokeWidth="2" />
      {/* Counter with the stove, a pan and a plant */}
      <rect x="60" y="170" width="420" height="130" fill="#b88a64" />
      <rect x="50" y="158" width="440" height="18" rx="4" fill="#e9dcc3" />
      <rect x="230" y="146" width="120" height="12" rx="3" fill="#3b3b3b" />
      <ellipse cx="290" cy="142" rx="44" ry="8" fill="#4a4a4a" />
      <path d="M110 158c-10-24 0-44 16-50-2 20-6 36-16 50zM122 158c6-24 22-36 38-36-6 18-20 30-38 36z" fill="#6B8F71" />
      {/* Fridge, with the calendar on it */}
      <rect x="880" y="40" width="150" height="260" rx="12" fill="#f8f8f4" stroke="#d9d3c4" strokeWidth="4" />
      <path d="M880 130h150" stroke="#d9d3c4" strokeWidth="4" />
      <rect x="905" y="150" width="70" height="70" rx="4" fill="#fff" stroke="#d9d3c4" strokeWidth="3" />
      <rect x="905" y="150" width="70" height="18" rx="4" fill="#4d0e12" />
      {/* Small table */}
      <rect x="690" y="210" width="160" height="14" rx="6" fill="#8C5A3C" />
      <path d="M710 224v76M830 224v76" stroke="#8C5A3C" strokeWidth="10" />
      {/* The animal's bowl, with its name */}
      <path d="M560 270h110l-12 26h-86z" fill="#4d0e12" />
      <ellipse cx="615" cy="270" rx="55" ry="9" fill="#c98a5a" />
      {petName && <text x="615" y="290" textAnchor="middle" fontSize="14" fontWeight="700" fontFamily="DM Sans, sans-serif" fill="#F5EFC6" letterSpacing="2">{petName.toUpperCase().slice(0, 10)}</text>}
      {night && <rect width="1080" height="300" fill="#141a33" opacity=".35" />}
      {night && <circle cx="540" cy="30" r="60" fill="#ffe7a3" opacity=".35" />}
      <path d="M540 0v22" stroke="#6b5549" strokeWidth="3" /><path d="M515 22h50l-10 16h-30z" fill="#4d0e12" />
    </svg>
  );
  return (
    <svg className="room-art" viewBox="0 0 1080 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="1080" height="300" fill="#efe3ec" />
      <rect y="230" width="1080" height="70" fill="#cfae8d" />
      {/* Window */}
      <rect x="70" y="40" width="150" height="120" rx="8" fill={night ? "#26304f" : "#cfe3ef"} stroke="#fff" strokeWidth="10" />
      {night && <circle cx="185" cy="72" r="12" fill="#f5efc6" />}
      {/* Double bed */}
      <rect x="340" y="90" width="400" height="90" rx="18" fill="#8C5A3C" />
      <rect x="320" y="170" width="440" height="80" rx="16" fill="#f4f1ea" />
      <rect x="320" y="190" width="440" height="60" rx="14" fill="#a5bcd6" />
      <rect x="360" y="152" width="120" height="34" rx="14" fill="#fff" />
      <rect x="600" y="152" width="120" height="34" rx="14" fill="#fff" />
      {/* Bedside table and lamp */}
      <rect x="790" y="180" width="80" height="70" rx="6" fill="#b88a64" />
      <path d="M830 180v-40" stroke="#6b5549" strokeWidth="5" />
      <path d="M806 140h48l-10-34h-28z" fill={night ? "#ffd77a" : "#e9dcc3"} />
      {night && <circle cx="830" cy="130" r="90" fill="#ffe7a3" opacity=".25" />}
      {/* The animal's bed */}
      <ellipse cx="960" cy="262" rx="70" ry="22" fill="#4D0E12" />
      <ellipse cx="960" cy="256" rx="54" ry="14" fill="#E4ECF5" />
      {night && <rect width="1080" height="300" fill="#141a33" opacity=".3" />}
    </svg>
  );
}

// Rain or snow falling over the garden.
function Weather({ scene }: { scene: HouseScene }) {
  const kind = scene.sky === "rain" ? "rain" : scene.christmas || scene.sky === "snow" ? "snow" : scene.season === "autumn" ? "leaves" : null;
  if (!kind) return null;
  return <div className={`garden-fall fall-${kind}`} aria-hidden="true">{Array.from({ length: kind === "leaves" ? 6 : 16 }, (_, index) => <i key={index} style={{ left: `${(index * 61) % 100}%`, animationDelay: `${(index * 0.37) % 3}s`, animationDuration: `${kind === "rain" ? 0.8 + (index % 4) * 0.15 : 3 + (index % 5) * 0.6}s` }} />)}</div>;
}

export function HouseRoom({ room, scene, mascots, pet, petPlace, names }: Props) {
  const night = scene.window === "night";
  const here = slots.filter((slot) => scene.rooms[slot] === room);
  const petHere = pet && petPlace.room === room;
  const said = [
    ...here.map((slot) => `${names[slot]} ${scene.doing[slot] ?? "por aqui"}`),
    ...(petHere && pet ? [`${pet.name} ${petPlace.mode === "bed" ? "a dormir na caminha" : petPlace.mode === "resting" ? "na caminha" : petPlace.mode === "eating" ? "a comer da tigela" : petPlace.mode === "ball" ? "a brincar com a bola" : "por perto"}`] : []),
  ];
  return (
    <section className={`house-room-strip room-${room}`} aria-label={`${roomNames[room]}${said.length ? `: ${said.join(", ")}` : ""}`}>
      <Art room={room} night={night} scene={scene} petName={pet?.name ?? null} />
      {room === "jardim" && <Weather scene={scene} />}
      <div className="room-people">
        {here.map((slot) => {
          const mascot = mascots.find((item) => item.partner_slot === slot);
          const pose = scene.poses[slot];
          return <span key={slot} className={`room-person pose-${pose}`}>
            <Avatar look={avatarOf(mascot ?? null) ?? defaultAvatar} outfit={scene.outfit} size={64} asleep={pose === "sleeping"} label={`Avatar de ${names[slot]}`} />
            {scene.doing[slot] && <small>{scene.doing[slot]}</small>}
          </span>;
        })}
      </div>
      {petHere && pet && <span className={`room-pet pet-${petPlace.mode} pet-arrive`}><PetArt look={petLook(pet)} size={48} asleep={petPlace.mode === "bed"} />{petPlace.mode === "ball" && <span className="pet-toy" aria-hidden="true" />}</span>}
    </section>
  );
}
