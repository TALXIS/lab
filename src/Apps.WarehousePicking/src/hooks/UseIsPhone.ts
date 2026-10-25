import { useEffect, useState } from "react";

// The same width the layout switches its navigation at (styles/Layout.styles.ts)
const PHONE_QUERY = "(max-width: 640px)";

/** True while the window is phone-sized; follows resizes and rotation. */
export function useIsPhone() {
  const [isPhone, setIsPhone] = useState(() => window.matchMedia(PHONE_QUERY).matches);

  useEffect(() => {
    const query = window.matchMedia(PHONE_QUERY);
    const update = () => setIsPhone(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return isPhone;
}

