export function register() {
  try {
    const nodeProto = Node?.prototype;
    if (!nodeProto) return;

    const originalNodeAppend = nodeProto.appendChild;
    const originalNodeRemove = nodeProto.removeChild;

    function isCriticalParent(parent: Node) {
      return parent === document || parent === document.documentElement;
    }

    function patchProto(proto: any, label: string) {
      if (!proto) return;
      const originalAppend: typeof originalNodeAppend | undefined = proto.appendChild;
      const originalRemove: typeof originalNodeRemove | undefined = proto.removeChild;
      if (typeof originalAppend !== "function" || typeof originalRemove !== "function") return;

      proto.appendChild = function appendChildPatched<T extends Node>(this: Node, child: T): T {
        try {
          if (this === document && document.body && child) {
            // eslint-disable-next-line no-console
            console.warn(`[InstrumentationDomGuard:${label}] document.appendChild -> body.appendChild`, child);
            // eslint-disable-next-line no-console
            console.warn(new Error("stack").stack);
            return originalAppend.call(document.body, child) as T;
          }
          if (isCriticalParent(this)) {
            // eslint-disable-next-line no-console
            console.warn(`[InstrumentationDomGuard:${label}] appendChild`, this, child);
            // eslint-disable-next-line no-console
            console.warn(new Error("stack").stack);
          }
        } catch {
          // ignore
        }
        return originalAppend.call(this, child) as T;
      };

      proto.removeChild = function removeChildPatched<T extends Node>(this: Node, child: T): T {
        try {
          if (isCriticalParent(this)) {
            // eslint-disable-next-line no-console
            console.warn(`[InstrumentationDomGuard:${label}] removeChild`, this, child);
            // eslint-disable-next-line no-console
            console.warn(new Error("stack").stack);
          }
        } catch {
          // ignore
        }
        return originalRemove.call(this, child) as T;
      };
    }

    patchProto(nodeProto, "Node");
    patchProto(typeof Document !== "undefined" ? (Document as any).prototype : undefined, "Document");
    patchProto(typeof HTMLDocument !== "undefined" ? (HTMLDocument as any).prototype : undefined, "HTMLDocument");
  } catch {
    // ignore
  }
}
