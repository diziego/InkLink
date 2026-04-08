type CardProps = {
  children: React.ReactNode;
  className?: string;
  tone?: "light" | "subtle" | "dark";
};

const toneClassNames = {
  light: "border-zinc-200 bg-white text-zinc-950",
  subtle: "border-zinc-200 bg-zinc-50 text-zinc-950",
  dark: "border-white/15 bg-zinc-950 text-white",
};

export function Card({ children, className = "", tone = "light" }: CardProps) {
  return (
    <article className={`rounded-md border p-5 ${toneClassNames[tone]} ${className}`}>
      {children}
    </article>
  );
}
