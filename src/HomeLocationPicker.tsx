import { LocationSearch } from "./CalendarMap";
import type { GeocodedPlace, HomePartner } from "./types";

export function HomeLocationPicker({
  id,
  partnerOneName,
  partnerTwoName,
  homePartner,
  value,
  searchLabel,
  onHomePartnerChange,
  onLocationChange,
  onPlaceSelect,
}: {
  id: string;
  
  partnerOneName: string;
  partnerTwoName: string;
  homePartner: HomePartner | null;
  value: string;
  searchLabel?: string;
  onHomePartnerChange: (partner: HomePartner | null) => void;
  onLocationChange: (value: string) => void;
  onPlaceSelect: (place: GeocodedPlace) => void;
}) {
  return (
    <>
      <label className="form-label" htmlFor={id}>{"Onde vão?"}
        <select className="form-input" id={id} value={homePartner ?? "other"} onChange={(event) => {
          const value = event.target.value;
          onHomePartnerChange(value === "partner_one" || value === "partner_two" ? value : null);
        }}>
          <option value="other">Outro local</option>
          <option value="partner_one">{`Casa de ${partnerOneName}`}</option>
          <option value="partner_two">{`Casa de ${partnerTwoName}`}</option>
        </select>
      </label>
      {!homePartner && <label className="form-label">{searchLabel ?? "Pesquisar local"}
        <LocationSearch value={value} onChange={onLocationChange} onSelect={onPlaceSelect} />
      </label>}
    </>
  );
}
