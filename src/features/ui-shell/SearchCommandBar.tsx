type Props = {
  value: string;
  onChange: (v: string) => void;
};

export function SearchCommandBar({ value, onChange }: Props) {
  return (
    <div className="relative flex justify-center px-4 pt-3 pb-2">
      <div
        data-tauri-drag-region
        className="absolute inset-x-0 top-0 h-10 z-0"
      />
      <input
        type="search"
        autoCorrect="off"
        spellCheck={false}
        placeholder="filter · command · port"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={
          "relative z-10 font-mono tracking-[0.22em] text-sm text-neutral-100 placeholder:text-neutral-600 " +
          "w-full max-w-xl rounded-md border border-white/12 bg-white/[0.05] px-4 py-2 " +
          "backdrop-blur-md outline-none ring-0 focus:border-white/25 transition-[border-color] duration-100"
        }
      />
    </div>
  );
}
