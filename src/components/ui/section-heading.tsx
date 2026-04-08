type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description?: string;
  theme?: "dark" | "light";
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  theme = "light",
  className = "",
}: SectionHeadingProps) {
  const isDark = theme === "dark";

  return (
    <div className={className}>
      <p
        className={`text-sm font-medium uppercase tracking-[0.2em] ${
          isDark ? "text-zinc-400" : "text-zinc-500"
        }`}
      >
        {eyebrow}
      </p>
      <h1
        className={`mt-4 text-4xl font-semibold sm:text-5xl ${
          isDark ? "text-white" : "text-zinc-950"
        }`}
      >
        {title}
      </h1>
      {description ? (
        <p
          className={`mt-5 text-lg leading-8 ${
            isDark ? "text-zinc-300" : "text-zinc-700"
          }`}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
