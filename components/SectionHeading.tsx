import clsx from "clsx";

interface SectionHeadingProps {
  label?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}

export default function SectionHeading({
  label,
  title,
  description,
  align = "center",
}: SectionHeadingProps) {
  const alignClass = align === "center" ? "text-center mx-auto" : "text-left";

  return (
    <div className={`max-w-2xl mb-6 ${alignClass}`}>
      {label && <p className="section-label mb-2">{label}</p>}
      <h2
        className={clsx(
          "font-display text-xl sm:text-2xl lg:text-[1.65rem] font-semibold text-white tracking-tight",
          align === "center" ? "heading-accent heading-accent-center" : "heading-accent"
        )}
      >
        {title}
      </h2>
      {description && (
        <p className="text-sm text-white/45 mt-3 leading-relaxed max-w-xl">
          {description}
        </p>
      )}
    </div>
  );
}
