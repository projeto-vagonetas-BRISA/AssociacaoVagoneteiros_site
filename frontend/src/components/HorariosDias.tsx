import React from "react";

interface Passeio {
  id: number;
  valor: number;
  capacidade: number;
  data_hora: string;
  id_FK: number | null;
}

interface Props {
  passeiosDoDia: Passeio[];
  selectedPasseio: Passeio | null;
  setSelectedPasseio: React.Dispatch<React.SetStateAction<Passeio | null>>;
  setPassageiros: React.Dispatch<React.SetStateAction<number>>;
  formatHora: (iso: string) => string;
}

export const HorariosDia: React.FC<Props> = ({
  passeiosDoDia,
  selectedPasseio,
  setSelectedPasseio,
  setPassageiros,
  formatHora,
}) => {
  return (
    <div>
      {passeiosDoDia.length === 0 ? (
        <div className="flex items-center justify-center h-32 rounded-lg border border-dashed border-border bg-bg-light-2">
          <p className="text-xs text-[#9ca3af] text-center px-4">
            Nenhum passeio disponível nesta data.
            <br />
            Selecione outro dia no calendário.
          </p>
        </div>
      ) : (
        
        <div className="flex flex-col gap-2">
          <span className="font-medium text-xs text-text-secondary mb-2 block">
            Os passeios têm duração aproximada de 1 hora. O horário exibido é o início do passeio.
          </span>
          {passeiosDoDia.map((p) => {
            const esgotado = p.capacidade === 0;
            const isSelected = selectedPasseio?.id === p.id;

            return (
              <button
                key={p.id}
                disabled={esgotado}
                onClick={() => {
                  if (!esgotado) {
                    setSelectedPasseio(p);
                    setPassageiros((prev) => Math.min(prev, p.capacidade));
                  }
                }}
                className={`relative flex items-center justify-between rounded-lg px-3 py-2.5 border transition-colors text-left
                  ${
                    esgotado
                      ? "bg-bg-light-1 border-border opacity-60 cursor-not-allowed"
                      : isSelected
                        ? "bg-blue-accent border-blue-accent"
                        : "bg-white border-border hover:border-blue-accent"
                  }`}
              >
                <div>
                  <p
                    className={`font-semibold text-sm ${
                      isSelected ? "text-white" : "text-text-dark"
                    }`}
                  >
                    {formatHora(p.data_hora)}
                  </p>

                  <p
                    className={`font-normal text-xs mt-0.5 ${
                      isSelected
                        ? "text-white/70"
                        : esgotado
                          ? "text-red-dark"
                          : "text-text-secondary"
                    }`}
                  >
                    {esgotado ? "Esgotado" : `${p.capacidade} vagas disp.`}
                  </p>
                </div>

                <span
                  className={`font-bold text-sm ${
                    isSelected ? "text-white" : "text-text-dark"
                  }`}
                >
                  R$ {p.valor}
                </span>

                {isSelected && (
                  <span className="absolute top-1.5 right-1.5 bg-white text-blue-accent text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wide">
                    Selecionado
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
