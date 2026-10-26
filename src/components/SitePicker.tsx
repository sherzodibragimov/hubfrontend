import type { Site } from '../api/types';

interface Props { sites: Site[]; value: number[]; onChange: (ids: number[]) => void; linked?: number[] }

export default function SitePicker({ sites, value, onChange, linked = [] }: Props) {
  return (
    <div className="site-picker">
      {sites.filter((s) => s.is_active).map((s) => (
        <label key={s.id} className="check">
          <input type="checkbox" checked={value.includes(s.id)}
            onChange={(e) => onChange(e.target.checked ? [...value, s.id] : value.filter((x) => x !== s.id))} />
          {s.name}{linked.includes(s.id) && <span className="muted small"> · bog‘langan</span>}
        </label>
      ))}
    </div>
  );
}
