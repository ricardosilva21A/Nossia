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

function Art({ room, night }: { room: Props["room"]; night: boolean }) {
  if (room === "cozinha") return (
    <svg className="room-art" viewBox="0 0 1080 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="1080" height="300" fill="#eef1e4" />
      <path d="M0 0h1080v150H0z" fill="#e3e9d6" />
      {Array.from({ length: 18 }, (_, index) => <path key={index} d={`M${index * 60} 70v80`} stroke="#d3dcc2" strokeWidth="2" />)}
      <path d="M0 110h1080" stroke="#d3dcc2" strokeWidth="2" />
      {/* Counter with the stove, a pan and a plant */}
      <rect x="60" y="170" width="520" height="130" fill="#b88a64" />
      <rect x="50" y="158" width="540" height="18" rx="4" fill="#e9dcc3" />
      <rect x="230" y="146" width="120" height="12" rx="3" fill="#3b3b3b" />
      <ellipse cx="290" cy="142" rx="44" ry="8" fill="#4a4a4a" />
      <path d="M110 158c-10-24 0-44 16-50-2 20-6 36-16 50zM122 158c6-24 22-36 38-36-6 18-20 30-38 36z" fill="#6B8F71" />
      {/* Fridge, with the calendar on it */}
      <rect x="880" y="40" width="150" height="260" rx="12" fill="#f8f8f4" stroke="#d9d3c4" strokeWidth="4" />
      <path d="M880 130h150" stroke="#d9d3c4" strokeWidth="4" />
      <rect x="905" y="150" width="70" height="70" rx="4" fill="#fff" stroke="#d9d3c4" strokeWidth="3" />
      <rect x="905" y="150" width="70" height="18" rx="4" fill="#4d0e12" />
      {/* Small table */}
      <rect x="640" y="210" width="190" height="14" rx="6" fill="#8C5A3C" />
      <path d="M660 224v76M810 224v76" stroke="#8C5A3C" strokeWidth="10" />
      {night && <rect width="1080" height="300" fill="#141a33" opacity=".35" />}
      {night && <circle cx="540" cy="30" r="60" fill="#ffe7a3" opacity=".35" />}
      <path d="M540 0v22" stroke="#6b5549" strokeWidth="3" /><path d="M515 22h50l-10 16h-30z" fill="#4d0e12" />
    </svg>
  );
  if (room === "quarto") return (
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
  return (
    <svg className="room-art" viewBox="0 0 1080 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="1080" height="300" fill={night ? "#26304f" : "#cfe8f5"} />
      {night ? <circle cx="900" cy="60" r="26" fill="#f5efc6" /> : <circle cx="900" cy="60" r="34" fill="#ffe08a" />}
      <path d="M0 210c180-40 360-40 540-10s360 30 540-10v110H0z" fill="#9cc58f" />
      <rect y="250" width="1080" height="50" fill="#86b37a" />
      {/* The front of the house, with its door */}
      <rect x="40" y="60" width="300" height="200" fill="#f4e8d4" />
      <path d="M20 70L190 0l170 70z" fill="#b5523b" />
      <rect x="150" y="140" width="80" height="120" rx="4" fill="#8C5A3C" />
      <rect x="260" y="110" width="60" height="50" rx="4" fill={night ? "#ffd77a" : "#cfe3ef"} stroke="#fff" strokeWidth="6" />
      {/* Tree and fence */}
      <rect x="760" y="150" width="22" height="100" fill="#8C5A3C" />
      <circle cx="771" cy="130" r="62" fill="#6B8F71" />
      {Array.from({ length: 12 }, (_, index) => <rect key={index} x={420 + index * 54} y="222" width="14" height="44" rx="4" fill="#fff" />)}
      <path d="M410 236h660M410 254h660" stroke="#fff" strokeWidth="6" />
      {night && <rect width="1080" height="300" fill="#141a33" opacity=".25" />}
    </svg>
  );
}

export function HouseRoom({ room, scene, mascots, pet, petPlace, names }: Props) {
  const night = scene.window === "night";
  const here = slots.filter((slot) => scene.rooms[slot] === room);
  const petHere = pet && petPlace.room === room;
  const said = [
    ...here.map((slot) => `${names[slot]} ${scene.doing[slot] ?? "por aqui"}`),
    ...(petHere && pet ? [`${pet.name} ${petPlace.mode === "bed" ? "a dormir na caminha" : petPlace.mode === "ball" ? "a brincar com a bola" : "por perto"}`] : []),
  ];
  return (
    <section className={`house-room-strip room-${room}`} aria-label={`${roomNames[room]}${said.length ? `: ${said.join(", ")}` : ""}`}>
      <Art room={room} night={night} />
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
      {petHere && pet && <span className={`room-pet pet-${petPlace.mode}`}><PetArt look={petLook(pet)} size={48} asleep={petPlace.mode === "bed"} />{petPlace.mode === "ball" && <span className="pet-toy" aria-hidden="true" />}</span>}
    </section>
  );
}
