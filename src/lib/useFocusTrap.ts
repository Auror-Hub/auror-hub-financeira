import { useEffect, type RefObject } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Foco básico para overlays (Drawer/Modal): move o foco para dentro ao abrir,
 * prende Tab/Shift+Tab dentro do overlay, e devolve o foco a quem abriu ao
 * fechar. Ajuste de acessibilidade da fase FE-5.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active || !ref.current) return;

    const previamenteFocado = document.activeElement as HTMLElement | null;
    const container = ref.current;

    const focaveis = () => Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    const primeiro = focaveis()[0];
    (primeiro ?? container).focus();

    function aoPressionarTecla(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const itens = focaveis();
      if (itens.length === 0) return;
      const [primeiro, ultimo] = [itens[0], itens[itens.length - 1]];
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    }

    container.addEventListener("keydown", aoPressionarTecla);
    return () => {
      container.removeEventListener("keydown", aoPressionarTecla);
      previamenteFocado?.focus();
    };
  }, [active, ref]);
}
