import React from "react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { SectionHeader } from "../components/SectionHeader";
import { imagens } from "../assets/imagens";
import conteudo from "../assets/conteudo.json";

export const Investimento: React.FC = () => {
  const data = conteudo.investimento;

  return (
    <div className="flex flex-col items-start w-full">

      {/* Header */}
      <section
        className="relative flex items-end justify-center min-h-[480px] w-full bg-slate-900 bg-cover bg-center"
        style={{
          backgroundImage: `url(${imagens[data.imagem_fundo]})`,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black/60" />
        <div className="relative z-10 max-w-7xl w-full px-4 md:px-8 py-20">
          <div className="flex flex-col items-center text-center gap-5 max-w-2xl mx-auto">
            <Badge text={data.tag} />

            <h1 className="font-bold text-5xl md:text-7xl text-white tracking-tighter leading-none">
              {data.titulo}
            </h1>

            <p className="font-medium text-lg md:text-xl text-white/80 leading-relaxed max-w-4xl text-justify md:text-center">
              {data.subtitulo}
            </p>
          </div>
        </div>
      </section>

      {/* O Problema */}
      <section className="bg-[#f2f3fb] py-16 md:py-24 w-full">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="max-w-4xl mx-auto">
            <SectionHeader
              label={data.label}
              title={data.titulo_secao}
              titleSize="large"
            />
            <div className="flex flex-col gap-5 pt-6">
              {data.paragrafos.map((p, i) => (
                <p key={i} className="font-normal text-lg text-[#414752] leading-relaxed text-justify md:text-left">
                  {p}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Impactos da Falta de Investimento */}
      <section className="bg-bg-light-1 py-16 md:py-24 w-full">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="max-w-4xl mx-auto">
            <SectionHeader
              title={data.impactos.titulo}
              description={data.impactos.descricao}
            />

            <div className="flex flex-col gap-5 pt-8">
              {data.impactos.itens.map((item, i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-border border-l-4 border-l-red-dark">
                  <h3 className="font-bold text-lg text-text-dark mb-2">{item.titulo}</h3>
                  <p className="font-normal text-base text-text-secondary leading-relaxed">{item.descricao}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Como Ajudar */}
      <section className="bg-[#005f9d] py-16 md:py-24 w-full">
        <div className="max-w-7xl mx-auto px-4 md:px-8 text-center">
          <div className="flex flex-col items-center gap-5 max-w-2xl mx-auto">
            <span className="inline-block bg-white/15 border border-white/30 text-white text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full w-fit">
              {data.cta.badge}
            </span>
            <h2 className="font-bold text-4xl md:text-5xl text-white tracking-tighter leading-tight">
              {data.cta.titulo}
            </h2>
            <p className="font-normal text-lg text-white/80 leading-relaxed">
              {data.cta.descricao}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2 justify-center">
              <Button text="AGENDAR PASSEIO" icon="plane" to="/agendamento" />
              <Button 
                text="CONHEÇA NOSSA HISTÓRIA" 
                variant="outline"
                to="/historia" 
              />
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};