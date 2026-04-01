export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#050509] px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.28),transparent_55%),radial-gradient(circle_at_bottom,rgba(15,23,42,0.95),transparent_65%)]" />

      <div className="relative w-full max-w-[460px] animate-in-up">
        <div className="rounded-3xl border border-white/15 bg-white/10 p-[1.5px] shadow-[0_26px_80px_rgba(0,0,0,0.78)] backdrop-blur-2xl">
          <div className="rounded-[1.6rem] bg-white/95 px-8 py-10 shadow-[0_18px_45px_rgba(15,23,42,0.18)]">
            <div className="text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-ponto-black">
                <span className="text-ponto-black">Ponto</span> <span className="text-ponto-orange">OR</span>
              </h1>
              <p className="mt-2 text-sm text-ponto-muted">Escolha como você deseja acessar</p>
              <div className="mx-auto mt-4 h-[2px] w-20 rounded-full bg-gradient-to-r from-ponto-orange via-amber-300 to-ponto-orange" />
            </div>

            <div className="mt-8 space-y-3">
              <a
                href="/login"
                className="inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-lux-xl bg-ponto-orange px-6 text-base font-semibold text-white shadow-[0_10px_40px_rgba(249,115,22,0.55)] transition-all duration-200 hover:bg-ponto-orange-hover active:scale-[0.98]"
              >
                Entrar no sistema
              </a>

              <a
                href="/totem"
                className="inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-lux-xl border border-ponto-border bg-ponto-white px-6 text-base font-semibold text-ponto-black shadow-lux transition-all duration-200 hover:-translate-y-0.5 hover:bg-ponto-surface active:scale-[0.98]"
              >
                Registrar ponto (Totem)
              </a>
            </div>

            <p className="mt-6 text-center text-xs text-ponto-muted-soft">
              Para relatórios, banco de horas, ajustes e espelho completo, use o acesso do sistema.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
