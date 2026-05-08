import React from "react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { SectionHeader } from "../components/SectionHeader";
import { TimelineItem } from "../components/TimeLineItem";
import { FeatureCard } from "../components/FeatureCard";
import conteudo from "../assets/conteudo.json";
import Logo from "../assets/logo.png";

export const Historia: React.FC = () => {
  return (
    <div className="flex flex-col items-start w-full">
      {/* header */}
      <section className="relative flex items-end justify-center min-h-[480px] w-full bg-slate-900 bg-cover bg-center">
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative z-10 max-w-7xl w-full px-4 md:px-8 py-20">
          <div className="flex flex-col items-center text-center gap-5 max-w-2xl mx-auto">
            <div className="w-26 h-26 rounded-full bg-white border-4 border-white/30 shadow-xl flex items-center justify-center overflow-hidden">
              <img src={Logo} alt="Logo" className="w-24 h-24" />
            </div>

            <Badge text={conteudo.hero.tagline} />

            <h1 className="font-bold text-5xl md:text-7xl text-white tracking-tighter leading-none">
              {conteudo.hero.titulo}
            </h1>

            <p className="font-medium text-lg md:text-xl text-white/80 leading-relaxed max-w-xl">
              {conteudo.hero.descricao}
            </p>
          </div>
        </div>
      </section>
      {/* História */}
      <section className="bg-[#f2f3fb] py-16 md:py-24 w-full">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">

            <div className="flex flex-col gap-4">
              <SectionHeader
                label={conteudo.historia.tag}
                title={conteudo.historia.titulo}
                titleSize="large"
              />
              <div className="flex flex-col gap-5 pt-2">
                <p className="font-normal text-lg text-[#414752] leading-relaxed">
                  {conteudo.historia.paragrafos[0]}
                </p>
                <p className="font-normal text-lg text-[#414752] leading-relaxed">
                  {conteudo.historia.paragrafos[1]}
                </p>
              </div>
              <div className="flex flex-col gap-5 pt-2">
                <p className="font-normal text-lg text-[#414752] leading-relaxed">
                  {conteudo.historia.paragrafos[0]}
                </p>
                <p className="font-normal text-lg text-[#414752] leading-relaxed">
                  {conteudo.historia.paragrafos[1]}
                </p>
              </div>

              <div className="flex flex-col gap-5 pt-2">
                <p className="font-normal text-lg text-[#414752] leading-relaxed">
                  {conteudo.historia.paragrafos[0]}
                </p>
                <p className="font-normal text-lg text-[#414752] leading-relaxed">
                  {conteudo.historia.paragrafos[1]}
                </p>
              </div>

              <div className="border-l-4 border-[#b61722] pl-4 mt-2">
                <span className="inline-block bg-[#005f9d] text-white text-xs font-bold tracking-widest uppercase px-3 py-1 rounded mb-2">
                  {conteudo.historia.citacao_label}
                </span>
                <p className="font-normal text-base text-[#414752] italic leading-relaxed">
                  {conteudo.historia.citacao}
                </p>
              </div>
            </div>

            <div>
              <div className="w-full rounded-2xl h-[300px] md:h-[450px] overflow-hidden shadow-2xl bg-[#e6e8f0] flex items-center justify-center mb-8">
                {/* img */}
              </div>
              <div className="w-full rounded-2xl h-[200px] md:h-[250px] overflow-hidden shadow-2xl bg-[#e6e8f0] flex items-center justify-center">
                {/* img */}
              </div>
            </div>

          </div>
        </div>
      </section>
      {/* Linha do Tempo */}
      <section className="bg-[#f2f3fb] pb-16 md:pb-24 w-full">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col gap-10">

            <div>
              <SectionHeader
                title="LINHA DO TEMPO"
                description={conteudo.linha_do_tempo.descricao}
              />
            </div>

            <div className="relative flex flex-col gap-10">
              <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-[#dde2ea] -translate-x-1/2" />

              <TimelineItem
                year={conteudo.linha_do_tempo.eventos[0].ano}
                title={conteudo.linha_do_tempo.eventos[0].titulo}
                description={conteudo.linha_do_tempo.eventos[0].descricao}
                variant="blue"
                side="left"
              />
              <TimelineItem
                year={conteudo.linha_do_tempo.eventos[1].ano}
                title={conteudo.linha_do_tempo.eventos[1].titulo}
                description={conteudo.linha_do_tempo.eventos[1].descricao}
                variant="red"
                side="right"
              />
              <TimelineItem
                year={conteudo.linha_do_tempo.eventos[2].ano}
                title={conteudo.linha_do_tempo.eventos[2].titulo}
                description={conteudo.linha_do_tempo.eventos[2].descricao}
                variant="green"
                side="left"
              />
              <TimelineItem
                year={conteudo.linha_do_tempo.eventos[3].ano}
                title={conteudo.linha_do_tempo.eventos[3].titulo}
                description={conteudo.linha_do_tempo.eventos[3].descricao}
                variant="dark"
                side="right"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Os Vagoneteiros */}
      <section className="bg-[#005f9d] py-16 md:py-24 w-full">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-start">

            <div className="flex flex-col gap-6">
              <span className="inline-block bg-white/15 border border-white/30 text-white text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full w-fit">
                {conteudo.vagoneteiros.badge}
              </span>

              <h2 className="font-bold text-4xl md:text-5xl text-white tracking-tighter leading-tight">
                {conteudo.vagoneteiros.titulo}
              </h2>

              <p className="font-normal text-lg text-white/80 leading-relaxed">
                {conteudo.vagoneteiros.descricao}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {conteudo.vagoneteiros.features.map((f: { titulo: string; descricao: string }, i: number) => (
                  <FeatureCard key={i} title={f.titulo} description={f.descricao} />
                ))}
              </div>
            </div>

            {/* fotos */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#1878c1]/40 rounded-xl h-48 md:h-64 overflow-hidden" />
              <div className="bg-[#1878c1]/40 rounded-xl h-48 md:h-64 overflow-hidden mt-8" />
              <div className="col-span-2 bg-[#1878c1]/40 rounded-xl h-32 overflow-hidden" />
            </div>
          </div>
        </div>
      </section>

      {/* Agende Um Passeio */}
      <section className="bg-[#f8f9ff] py-16 md:py-24 w-full">
        <div className="max-w-7xl mx-auto px-4 md:px-8 text-center">
          <div className="flex flex-col items-center gap-5 max-w-xl mx-auto">
            <h2 className="font-bold text-4xl md:text-5xl text-black tracking-tighter uppercase leading-tight">
              {conteudo.cta.titulo}
            </h2>
            <p className="font-normal text-lg text-[#414752] leading-relaxed">
              {conteudo.cta.descricao}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Button text="AGENDAR" icon="plane" />
              <Button text={conteudo.rodape_localizacao.botao.texto} variant="secondary" icon="pin" />
              <Button text={conteudo.galeria_fotos.botao.texto} variant="secondary" icon="image" />
            </div>
          </div>
        </div>
      </section>



    </div>
  );
};