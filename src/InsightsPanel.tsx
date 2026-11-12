import { activities, activityLabel } from "./activities";
import type { Activity } from "./activities";
import type { HomePartner } from "./types";

// Nós › Números: what they have done together, in a few numbers and their favourite kinds of date.

export type CompletedStats = {
  total: number;
  uniqueActivities: number;
  topCategory: Activity | null;
  wouldRepeat: number;
  uniquePlaces: number;
  estimatedSpend: number;
  thisMonth: number;
  homeDates: number;
  homeByPartner: Array<{ partner: HomePartner; count: number }>;
};
export type MoodStats = { total: number; activities: Array<{ activity: Activity; count: number }>; top: Array<{ activity: Activity; count: number }> };

type Props = {
  completedStats: CompletedStats;
  completedMoodStats: MoodStats;
  mostFrequentHome: { partner: HomePartner; count: number } | null;
  couple: { partner_one_name: string; partner_two_name: string };
};

export function InsightsPanel({ completedStats, completedMoodStats, mostFrequentHome, couple }: Props) {
  return (
    <section className="insights-panel" aria-label={"Estatísticas dos dates"}>
              <div className="insights-total"><span className="stat-icon green">♡</span><div><strong>{completedMoodStats.total}</strong><span>dates feitos juntos</span></div></div>
              <div className="insights-metrics">
                <article className="insight-metric"><span>✳</span><div><strong>{completedStats.uniqueActivities}</strong><small>atividades diferentes</small></div></article>
                <article className="insight-metric"><span>⌖</span><div><strong>{completedStats.uniquePlaces}</strong><small>locais visitados</small></div></article>
                <article className="insight-metric"><span>↻</span><div><strong>{completedStats.wouldRepeat}</strong><small>dates para repetir</small></div></article>
                <article className="insight-metric"><span>€</span><div><strong>{new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(completedStats.estimatedSpend)}</strong><small>despesa estimada</small></div></article>
                <article className="insight-metric"><span>♡</span><div><strong>{completedStats.thisMonth}</strong><small>dates este mês</small></div></article>
                <article className="insight-metric"><span>⌂</span><div><strong>{completedStats.topCategory ? activityLabel(completedStats.topCategory) : "—"}</strong><small>o que mais fazem</small></div></article>
                <article className="insight-metric"><span>⌂</span><div><strong>{completedStats.homeDates}</strong><small>dates em casa</small></div></article>
                <article className="insight-metric"><span>♡</span><div><strong>{mostFrequentHome && mostFrequentHome.count > 0 ? `Casa de ${mostFrequentHome.partner === "partner_one" ? couple.partner_one_name : couple.partner_two_name}` : "—"}</strong><small>{mostFrequentHome && mostFrequentHome.count > 0 ? `${mostFrequentHome.count} dates · local mais frequente` : "local mais frequente"}</small></div></article>
              </div>
              <p className="insights-estimate-note">A despesa é estimada a partir do orçamento definido em cada ideia; não representa valores reais registados.</p>
              {completedMoodStats.total < 5
                ? <div className="insights-empty"><span className="section-kicker">O VOSSO PERFIL DE CASAL</span><h2>A vossa história está a começar</h2><p>{`Façam mais ${5 - completedMoodStats.total} ${5 - completedMoodStats.total === 1 ? "date" : "dates"} para desbloquear o perfil de casal. Vamos mostrar os dois moods mais frequentes.`}</p><div className="insights-progress" role="progressbar" aria-label={"Dates até desbloquear o perfil de casal"} aria-valuenow={completedMoodStats.total} aria-valuemin={0} aria-valuemax={5}><span style={{ width: `${Math.min(completedMoodStats.total / 5 * 100, 100)}%` }} /></div><span className="insights-progress-label">{completedMoodStats.total} {"de"} 5 {"dates"}</span></div>
                : <div className="insights-profile"><span className="section-kicker">O VOSSO PERFIL DE CASAL</span><h2>{`Gostam sobretudo de ${completedMoodStats.top.map((stat) => (activities.find((item) => item.value === stat.activity)?.label ?? stat.activity).toLocaleLowerCase("pt-PT")).join(" e ")}`}</h2><p>{`Com base nos vossos ${completedMoodStats.total} dates concluídos, isto é o que mais fazem juntos:`}</p><div className="insights-moods">{completedMoodStats.activities.map((stat) => <div className="insights-mood" key={stat.activity}><div><strong>{activityLabel(stat.activity)}</strong><span>{stat.count} {stat.count === 1 ? "date" : "dates"}</span></div><div className="insights-progress" aria-hidden="true"><span style={{ width: `${stat.count / completedMoodStats.total * 100}%` }} /></div></div>)}</div></div>}
            </section>
  );
}
