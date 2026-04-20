type MockNoticeProps = {
  children: React.ReactNode;
  tone?: "dark" | "light";
};

export function MockNotice({ children, tone = "light" }: MockNoticeProps) {
  const className =
    tone === "dark"
      ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
      : "border-amber-200 bg-amber-50 text-amber-900 shadow-amber-950/5";

  return (
    <div className={`rounded-2xl border p-4 text-sm leading-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}
