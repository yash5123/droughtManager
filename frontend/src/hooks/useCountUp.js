import { useState, useEffect, useRef } from 'react';

export function useCountUp(end, duration = 1200, startOnMount = true) {
  const [value, setValue] = useState(0);
  const frameRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    if (!startOnMount || end === 0) {
      setTimeout(() => setValue(end), 0);
      return;
    }

    startRef.current = null;

    const animate = (now) => {
      if (startRef.current === null) {
        startRef.current = now;
        setValue(0);
        frameRef.current = requestAnimationFrame(animate);
        return;
      }
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * end));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [end, duration, startOnMount]);

  return value;
}
