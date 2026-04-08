type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description?: string;
  theme?: "dark" | "light";
  className?: string;
  level?: "h1" | "h2";
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  theme = "light",
  className = "",
  level = "h1",
}: SectionHeadingProps) {
  const isDark = theme === "dark";
  const HeadingTag = level;
  const sizeClassName =
    level === "h1" ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl";

  return (
    <div className={className}>
      <p
        className={`text-sm font-medium uppercase tracking-[0.2em] ${
          isDark ? "text-zinc-400" : "text-zinc-500"
        }`}
      >
        {eyebrow}
      </p>
      <HeadingTag
        className={`mt-4 ${sizeClassName} font-semibold ${
          isDark ? "text-white" : "text-zinc-950"
        }`}
      >
        {title}
      </HeadingTag>
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
