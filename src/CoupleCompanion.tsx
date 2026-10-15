type Language = "en" | "pt";

const XP_PER_DATE = 25;
const XP_PER_GROWTH = 100;
const GROWTH_STAGES = [
  { name: "Little seed", namePt: "Pequena semente", message: "A little story is taking root.", messagePt: "A vossa história está a criar raízes." },
  { name: "Tiny sprout", namePt: "Pequeno rebento", message: "Your companion is beginning to grow.", messagePt: "O vosso companheiro está a começar a crescer." },
  { name: "Curious bud", namePt: "Botão curioso", message: "Every date helps a new leaf unfold.", messagePt: "Cada date ajuda uma nova folha a nascer." },
  { name: "Love in bloom", namePt: "Amor em flor", message: "Look how much your shared moments have grown.", messagePt: "Vejam como os vossos momentos já o fizeram crescer." },
  { name: "Little companion", namePt: "Companheiro especial", message: "A lovely little reminder of your life together.", messagePt: "Um pequeno companheiro para celebrar a vossa vida a dois." },
] as const;

export function CoupleCompanion({ completedDates, language }: { completedDates: number; language: Language }) {
  const xp = completedDates * XP_PER_DATE;
  const stageIndex = Math.min(Math.floor(xp / XP_PER_GROWTH), GROWTH_STAGES.length - 1);
  const stage = GROWTH_STAGES[stageIndex];
  const nextStageXp = (stageIndex + 1) * XP_PER_GROWTH;
  const progress = stageIndex === GROWTH_STAGES.length - 1 ? 100 : Math.min((xp - stageIndex * XP_PER_GROWTH) / XP_PER_GROWTH * 100, 100);
  const stageName = language === "pt" ? stage.namePt : stage.name;
  const stageMessage = language === "pt" ? stage.messagePt : stage.message;

  return (
    <section className="companion-card" aria-label={language === "pt" ? "O vosso companheiro" : "Your couple companion"}>
      <div className={`companion-portrait companion-stage-${stageIndex + 1}`} aria-hidden="true">
        <svg viewBox="0 0 120 120" role="presentation">
          <ellipse className="companion-shadow" cx="60" cy="105" rx="31" ry="6" />
          {stageIndex >= 1 && <path className="companion-stem" d="M60 42 C59 31 57 25 52 19 M60 34 C65 26 70 23 76 22" />}
          {stageIndex >= 1 && <ellipse className="companion-leaf companion-leaf-left" cx="49" cy="22" rx="8" ry="4" transform="rotate(30 49 22)" />}
          {stageIndex >= 1 && <ellipse className="companion-leaf companion-leaf-right" cx="76" cy="22" rx="8" ry="4" transform="rotate(-25 76 22)" />}
          {stageIndex >= 3 && <g className="companion-flower"><circle cx="60" cy="15" r="4" /><circle cx="55" cy="20" r="4" /><circle cx="65" cy="20" r="4" /><circle cx="60" cy="24" r="4" /><circle className="companion-flower-centre" cx="60" cy="20" r="3" /></g>}
          <path className="companion-body" d="M60 34 C39 34 27 49 28 70 C29 89 41 101 60 101 C79 101 91 89 92 70 C93 49 81 34 60 34Z" />
          {stageIndex >= 4 && <path className="companion-crown" d="m39 49 4-10 8 7 9-11 9 11 8-7 4 10" />}
          <ellipse className="companion-blush" cx="43" cy="70" rx="6" ry="3.5" />
          <ellipse className="companion-blush" cx="77" cy="70" rx="6" ry="3.5" />
          <ellipse className="companion-eye" cx="49" cy="63" rx="2.3" ry="3" />
          <ellipse className="companion-eye" cx="71" cy="63" rx="2.3" ry="3" />
          <path className="companion-smile" d="M55 74 Q60 79 65 74" />
          <path className="companion-heart" d="M60 88 C56 84 51 81 51 77 C51 73 56 72 60 77 C64 72 69 73 69 77 C69 81 64 84 60 88Z" />
          {stageIndex >= 2 && <path className="companion-extra-leaf" d="M83 88 Q98 78 95 67 Q84 69 83 88Z" />}
          {stageIndex >= 3 && <g className="companion-sparkles"><path d="M25 44v8M21 48h8M95 49v8M91 53h8" /><circle cx="31" cy="32" r="1.5" /><circle cx="88" cy="34" r="1.5" /></g>}
        </svg>
      </div>
      <div className="companion-content">
        <div className="companion-heading">
          <div><span className="section-kicker">{language === "pt" ? "CRESCE COM A VOSSA HISTÓRIA" : "GROWING WITH YOUR STORY"}</span><h2>{language === "pt" ? "O vosso companheiro" : "Your little companion"}</h2></div>
          <span className="companion-level">{language === "pt" ? `Nível ${stageIndex + 1}` : `Level ${stageIndex + 1}`}</span>
        </div>
        <p className="companion-stage-name">{stageName}</p>
        <p className="companion-message">{stageMessage}</p>
        <div className="companion-xp-row"><span>✦ {xp} XP</span><span>{completedDates} {language === "pt" ? completedDates === 1 ? "date concluído" : "dates concluídos" : completedDates === 1 ? "date completed" : "dates completed"}</span></div>
        <div className="companion-progress" role="progressbar" aria-label={language === "pt" ? "Progresso de crescimento do companheiro" : "Companion growth progress"} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div>
        <p className="companion-next-step">{stageIndex < GROWTH_STAGES.length - 1
          ? language === "pt" ? `Mais ${Math.ceil((nextStageXp - xp) / XP_PER_DATE)} ${Math.ceil((nextStageXp - xp) / XP_PER_DATE) === 1 ? "date" : "dates"} para crescer.` : `${Math.ceil((nextStageXp - xp) / XP_PER_DATE)} more ${Math.ceil((nextStageXp - xp) / XP_PER_DATE) === 1 ? "date" : "dates"} to grow.`
          : language === "pt" ? "O crescimento continua — nunca perde o progresso." : "Your XP keeps growing — progress never fades."}</p>
      </div>
      <span className="companion-decoration" aria-hidden="true">✧</span>
    </section>
  );
}
