"use client";

import { useEffect } from "react";

export default function DomMutationGuard() {
  useEffect(() => {
    const nodeProto = Node.prototype;
    const documentProto = typeof Document !== "undefined" ? Document.prototype : undefined;
    const htmlDocumentProto = typeof HTMLDocument !== "undefined" ? HTMLDocument.prototype : undefined;

    const originalNodeAppend = nodeProto.appendChild;
    const originalNodeRemove = nodeProto.removeChild;
    const originalDocumentAppend = documentProto?.appendChild;
    const originalDocumentRemove = documentProto?.removeChild;
    const originalHtmlAppend = htmlDocumentProto?.appendChild;
    const originalHtmlRemove = htmlDocumentProto?.removeChild;

    function log(op: "appendChild" | "removeChild", parent: Node, child: Node) {
      try {
        const isDocument = parent === document;
        const isHtml = parent === document.documentElement;
        if (!isDocument && !isHtml) return;

        const parentName =
          parent === document
            ? "document"
            : parent === document.documentElement
            ? "documentElement"
            : "body";

        // eslint-disable-next-line no-console
        console.warn(`[DomMutationGuard] ${parentName}.${op} chamado`, { child });
        // eslint-disable-next-line no-console
        console.warn(new Error("stack").stack);
      } catch {
        // ignore
      }
    }

    type AppendRemoveProto = {
      appendChild: <T extends Node>(this: Node, child: T) => T;
      removeChild: <T extends Node>(this: Node, child: T) => T;
    };

    function patchProto(proto: unknown, originalAppend: unknown, originalRemove: unknown) {
      if (!proto || typeof originalAppend !== "function" || typeof originalRemove !== "function") return;

      const typedProto = proto as AppendRemoveProto;
      const append = originalAppend as AppendRemoveProto["appendChild"];
      const remove = originalRemove as AppendRemoveProto["removeChild"];

      typedProto.appendChild = function appendChildPatched<T extends Node>(this: Node, child: T): T {
      try {
        if (this === document && document.body && child) {
          // eslint-disable-next-line no-console
          console.warn("[DomMutationGuard] document.appendChild -> body.appendChild", { child });
          // eslint-disable-next-line no-console
          console.warn(new Error("stack").stack);
          return append.call(document.body, child) as T;
        }
      } catch {
        // ignore
      }
      log("appendChild", this, child);
      return append.call(this, child) as T;
      };

      typedProto.removeChild = function removeChildPatched<T extends Node>(this: Node, child: T): T {
        log("removeChild", this, child);
        return remove.call(this, child) as T;
      };
    }

    patchProto(nodeProto, originalNodeAppend, originalNodeRemove);
    patchProto(documentProto, originalDocumentAppend, originalDocumentRemove);
    patchProto(htmlDocumentProto, originalHtmlAppend, originalHtmlRemove);

    return () => {
      nodeProto.appendChild = originalNodeAppend;
      nodeProto.removeChild = originalNodeRemove;

      if (documentProto && typeof originalDocumentAppend === "function") {
        documentProto.appendChild = originalDocumentAppend;
      }
      if (documentProto && typeof originalDocumentRemove === "function") {
        documentProto.removeChild = originalDocumentRemove;
      }
      if (htmlDocumentProto && typeof originalHtmlAppend === "function") {
        htmlDocumentProto.appendChild = originalHtmlAppend;
      }
      if (htmlDocumentProto && typeof originalHtmlRemove === "function") {
        htmlDocumentProto.removeChild = originalHtmlRemove;
      }
    };
  }, []);

  return null;
}
