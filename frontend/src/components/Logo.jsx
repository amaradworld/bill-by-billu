export default function Logo({ size = 36, variant = 'icon', className = '' }) {
  if (variant === 'wordmark') {
    return (
      <img
        src="/logo/bb-wordmark.svg"
        alt="Bill By Billu"
        className={`h-${size === 36 ? 9 : size === 48 ? 12 : 'auto'} ${className}`}
        style={{ height: size * 0.28 }}
      />
    );
  }

  if (variant === 'full') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div
          className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg"
          style={{ width: size, height: size }}
        >
          <span className="text-white font-extrabold tracking-tight" style={{ fontSize: size * 0.38 }}>
            BB
          </span>
        </div>
        <div>
          <h1 className="font-bold text-gray-900 tracking-tight" style={{ fontSize: size * 0.39 }}>
            Bill By Billu
          </h1>
          <p className="text-gray-400" style={{ fontSize: Math.max(9, size * 0.22) }}>
            AI-Powered Billing
          </p>
        </div>
      </div>
    );
  }

  // Default: icon variant
  return (
    <div
      className={`bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg ${className}`}
      style={{ width: size, height: size }}
    >
      <span className="text-white font-extrabold tracking-tight" style={{ fontSize: size * 0.38 }}>
        BB
      </span>
    </div>
  );
}
