type MockNoticeProps = {
  children: React.ReactNode;
  tone?: "dark" | "light";
};

export function MockNotice({ children, tone = "light" }: MockNoticeProps) {
  const className =
    tone === "dark"
      ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
      : "border-amber-300 bg-amber-50 text-amber-900";

  return (
    <div className={`rounded-md border p-4 text-sm leading-6 ${className}`}>
      {children}
    </div>
  );
}
