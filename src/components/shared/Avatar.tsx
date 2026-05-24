export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const colors = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-violet-500", "bg-rose-500", "bg-cyan-500"];
  const idx = name.charCodeAt(0) % colors.length;
  return (
    <div style={{ width: size, height: size, fontSize: size * 0.4 }} className={`${colors[idx]} flex shrink-0 items-center justify-center rounded-full font-semibold text-white`}>
      {initials}
    </div>
  );
}
