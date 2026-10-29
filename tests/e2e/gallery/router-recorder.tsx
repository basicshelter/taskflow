import { type ReactNode, useEffect, useState } from "react";

export function RouterRecorder({ children }: { children: ReactNode }) {
  const [replacement, setReplacement] = useState("");
  const [refreshes, setRefreshes] = useState(0);

  useEffect(() => {
    const recordReplacement = (event: Event) => {
      setReplacement((event as CustomEvent<string>).detail);
    };
    const recordRefresh = () => setRefreshes((count) => count + 1);

    window.addEventListener("taskflow-test:router-replace", recordReplacement);
    window.addEventListener("taskflow-test:router-refresh", recordRefresh);

    return () => {
      window.removeEventListener(
        "taskflow-test:router-replace",
        recordReplacement,
      );
      window.removeEventListener("taskflow-test:router-refresh", recordRefresh);
    };
  }, []);

  return (
    <>
      {children}
      <div hidden>
        <output data-testid="router-replace">{replacement}</output>
        <output data-testid="router-refresh">{refreshes}</output>
      </div>
    </>
  );
}
