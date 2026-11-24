import type { Product } from "@/lib/api";

// Sản phẩm chọn biểu tượng 📦 là "hộp Secret" của minigame: ai mua được đầu tiên thì thắng.
export const SECRET_ICON = "📦";
export const isSecret = (p: Pick<Product, "icon">) => p.icon === SECRET_ICON;

/** Hộp quà vàng có dấu hỏi, phát sáng và lấp lánh. `size` tính bằng px. */
export function SecretBox({ size = 64, animated = true }: { size?: number; animated?: boolean }) {
  return (
    <span className={`relative inline-flex items-center justify-center ${animated ? "secret-float" : ""}`} style={{ width: size, height: size }}>
      <span className="secret-halo absolute inset-[-18%] rounded-full" aria-hidden />
      <svg viewBox="0 0 64 64" width={size} height={size} className="relative drop-shadow-[0_6px_14px_rgba(245,158,11,0.55)]" aria-label="Hộp Secret">
        <defs>
          <linearGradient id="sb-body" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FDE68A" />
            <stop offset="0.55" stopColor="#F59E0B" />
            <stop offset="1" stopColor="#B45309" />
          </linearGradient>
          <linearGradient id="sb-lid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FEF3C7" />
            <stop offset="1" stopColor="#F59E0B" />
          </linearGradient>
          <linearGradient id="sb-ribbon" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#C084FC" />
            <stop offset="1" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
        {/* nơ */}
        <path d="M32 19 C24 6 12 9 16 17 C18 21 26 20 32 19 Z" fill="url(#sb-ribbon)" />
        <path d="M32 19 C40 6 52 9 48 17 C46 21 38 20 32 19 Z" fill="url(#sb-ribbon)" />
        {/* thân hộp */}
        <rect x="11" y="29" width="42" height="29" rx="4" fill="url(#sb-body)" />
        {/* nắp */}
        <rect x="8" y="19" width="48" height="12" rx="3.5" fill="url(#sb-lid)" />
        {/* ruy băng dọc */}
        <rect x="28" y="19" width="8" height="39" fill="url(#sb-ribbon)" />
        <circle cx="32" cy="19.5" r="4" fill="#A855F7" />
        {/* dấu hỏi */}
        <g transform="translate(0 1)">
          <text x="21" y="52" textAnchor="middle" fontSize="18" fontWeight="900" fontFamily="Arial, sans-serif" fill="#fff" stroke="#92400E" strokeWidth="1.2" paintOrder="stroke">?</text>
          <text x="43" y="52" textAnchor="middle" fontSize="18" fontWeight="900" fontFamily="Arial, sans-serif" fill="#fff" stroke="#92400E" strokeWidth="1.2" paintOrder="stroke">?</text>
        </g>
        {/* ánh sáng lóe trên nắp */}
        <rect x="12" y="21" width="14" height="2.5" rx="1.2" fill="#fff" opacity="0.7" />
      </svg>
      {animated && (
        <>
          <Sparkle className="secret-twinkle left-[-6%] top-[6%]" size={size * 0.22} />
          <Sparkle className="secret-twinkle right-[-4%] top-[-6%] [animation-delay:0.6s]" size={size * 0.16} />
          <Sparkle className="secret-twinkle bottom-[2%] right-[-8%] [animation-delay:1.1s]" size={size * 0.18} />
        </>
      )}
    </span>
  );
}

function Sparkle({ className, size }: { className: string; size: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} className={`absolute ${className}`} aria-hidden>
      <path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" fill="#FEF3C7" />
    </svg>
  );
}

/** Nhãn ruy băng "SECRET" đặt ở góc thẻ sản phẩm. */
export function SecretBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`rounded-md bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 px-2 py-0.5 text-[10px] font-extrabold tracking-[0.2em] text-amber-950 shadow-[0_0_14px_rgba(251,191,36,0.7)] ${className}`}
    >
      SECRET
    </span>
  );
}
