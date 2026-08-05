import { useEffect } from "react";

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title
      ? `${title} | Daruttaufiq Computer Centre`
      : "Daruttaufiq Computer Centre";
  }, [title]);
}