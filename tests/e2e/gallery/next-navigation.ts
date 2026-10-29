export function useRouter() {
  return {
    replace: (path: string) => {
      window.dispatchEvent(
        new CustomEvent("taskflow-test:router-replace", { detail: path }),
      );
    },
    refresh: () => {
      window.dispatchEvent(new Event("taskflow-test:router-refresh"));
    },
  };
}
