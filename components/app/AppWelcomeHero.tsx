"use client";

import { useEffect, useState } from "react";

type Props = {
  name: string;
};

function getGreeting(date: Date) {
  const h = date.getHours();
  if (h < 5) return "Boa noite";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function AppWelcomeHero({ name }: Props) {
  const [greeting, setGreeting] = useState<string>("");

  useEffect(() => {
    const updateGreeting = () => setGreeting(getGreeting(new Date()));
    updateGreeting();
    const id = setInterval(updateGreeting, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative z-10 mx-auto flex max-w-5xl flex-col gap-10 px-2 pt-4 text-left sm:px-4 lg:px-0">
      <header className="space-y-2 animate-in-fade">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ponto-muted-soft">
          Ponto OR • Painel de jornada
        </p>
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-ponto-black sm:text-4xl lg:text-[36px]">
          <span className="text-ponto-black">
            {greeting},{" "}
            <span className="font-bold text-ponto-orange">
              {name || "usuário"}
            </span>
          </span>
          <span className="block text-base font-normal text-ponto-muted sm:text-lg">
            Acompanhe suas marcações, banco de horas e ajustes em um só lugar.
          </span>
        </h1>
      </header>
    </div>
  );
}

