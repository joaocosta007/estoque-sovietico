import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function PrimaryButton({
  children,
  className = "",
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      className={[
        "rounded-none border-4 border-[#1A1A1A] bg-[#A91D11] px-5 py-4",
        "font-sans text-sm font-black uppercase tracking-[0.12em] text-white",
        "shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]",
        "transition-transform active:translate-x-1 active:translate-y-1 active:shadow-none",
        "focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4",
        "disabled:cursor-not-allowed disabled:bg-gray-500",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function TextInput({
  label,
  error,
  id,
  className = "",
  ...props
}: TextInputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label htmlFor={inputId} className="block font-sans">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em]">
        {label}
      </span>
      <input
        id={inputId}
        className={[
          "w-full rounded-none border-4 border-[#1A1A1A] bg-white px-4 py-3",
          "font-mono text-base text-[#1A1A1A] placeholder:text-gray-500",
          "shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] outline-none",
          "focus:bg-yellow-100 focus:shadow-[6px_6px_0px_0px_rgba(169,29,17,1)]",
          className,
        ].join(" ")}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error && (
        <span
          id={`${inputId}-error`}
          className="mt-2 block border-l-4 border-[#A91D11] pl-2 text-xs font-black uppercase text-[#A91D11]"
        >
          {error}
        </span>
      )}
    </label>
  );
}

type DataCardProps = {
  children: ReactNode;
  title?: string;
  index?: string;
  className?: string;
};

export function DataCard({
  children,
  title,
  index,
  className = "",
}: DataCardProps) {
  return (
    <article
      className={[
        "rounded-none border-4 border-[#1A1A1A] bg-white p-4",
        "shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]",
        className,
      ].join(" ")}
    >
      {(title || index) && (
        <header className="mb-4 flex items-start justify-between gap-3 border-b-2 border-[#1A1A1A] pb-2">
          {title && (
            <h2 className="font-sans text-xs font-black uppercase tracking-[0.12em]">
              {title}
            </h2>
          )}
          {index && (
            <span className="bg-[#1A1A1A] px-2 py-1 font-mono text-[10px] font-bold text-white">
              {index}
            </span>
          )}
        </header>
      )}
      {children}
    </article>
  );
}

