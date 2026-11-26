"use client";

type TtlOption<T extends number> = {
  value: T;
  label: string;
};

export function TtlSelect<T extends number>(props: {
  id?: string;
  label: string;
  value: T;
  options: readonly T[];
  labels: Record<T, string>;
  onChange: (value: T) => void;
  disabled?: boolean;
  hint?: string;
  className?: string;
}) {
  const options: TtlOption<T>[] = props.options.map((value) => ({
    value,
    label: props.labels[value],
  }));

  return (
    <div className={props.className}>
      <label
        htmlFor={props.id}
        className="block text-xs font-bold uppercase tracking-wider text-[#0B1F3D]"
      >
        {props.label}
      </label>
      <select
        id={props.id}
        value={props.value}
        disabled={props.disabled}
        onChange={(e) => props.onChange(Number(e.target.value) as T)}
        className="mt-1 w-full rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] px-4 py-3 text-sm font-medium text-[#0B1F3D] outline-none focus:border-[#38B2D1] focus:bg-white disabled:opacity-60"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {props.hint ? (
        <p className="mt-1 text-xs text-[#557393]">{props.hint}</p>
      ) : null}
    </div>
  );
}
