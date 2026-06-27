import { useState, useEffect, useRef } from 'react';

export default function AnimatedCounter({ value, duration = 1000, prefix = '', suffix = '', decimals = 0 }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const startTime = useRef(null);
  const numValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, '')) || 0;

  useEffect(() => {
    if (numValue === 0) { setDisplay(0); return; }

    let raf;
    const animate = (timestamp) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(eased * numValue);
      if (progress < 1) raf = requestAnimationFrame(animate);
    };

    startTime.current = null;
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [numValue, duration]);

  const formatted = typeof numValue === 'number' && !isNaN(numValue)
    ? display.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : display;

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}{formatted}{suffix}
    </span>
  );
}
