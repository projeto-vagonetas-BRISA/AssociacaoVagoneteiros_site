import React from "react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { SectionHeader } from "../components/SectionHeader";
import { TimelineItem } from "../components/TimeLineItem";
import { FeatureCard } from "../components/FeatureCard";
import conteudo from "../assets/conteudo.json";
import { imagens } from "../assets/imagens";
import Logo from "../assets/logo.png";

export const Historia: React.FC = () => {
  return (
    <div className="flex flex-col items-start w-full">

      {/* Header */}
      <section
        className="relative flex items-end justify-center min-h-[480px] w-full bg-slate-900 bg-cover bg-center"
        style={{
          backgroundImage: `url(${imagens[conteudo.historia.imagem_fundo]})`,
          imageRendering: 'auto',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black/60" />
        <div className="relative z-10 max-w-7xl w-full px-4 md:px-8 py-20">
          <div className="flex flex-col items-center text-center gap-5 max-w-2xl mx-auto">
            <div className="w-26 h-26 rounded-full bg-white border-4 border-white/30 shadow-xl flex items-center justify-center overflow-hidden">
              <img src={Logo} alt="Logo" className="w-24 h-24" />
            </div>

            <Badge text={conteudo.hero.tagline} />

            <h1 className="font-bold text-5xl md:text-7xl text-white tracking-tighter leading-none">
              {conteudo.historia.titulo}
            </h1>

            <p className="font-medium text-lg md:text-xl text-white/80 leading-relaxed max-w-4xl text-justify md:text-center">
              {conteudo.hero.descricao}
            </p>
          </div>
        </div>
      </section>

      {/* História */}
      <section className="bg-[#f2f3fb] py-16 md:py-24 w-full">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-start">

            <div className="flex flex-col gap-4">
              <SectionHeader
                label={conteudo.historia.tag}
                title={conteudo.historia.titulo}
                titleSize="large"
              />
              <div className="flex flex-col gap-5 pt-2">
                <p className="font-normal text-lg text-[#414752] leading-relaxed text-justify md:text-left">
                  {conteudo.historia.paragrafos[0]}
                </p>
                <p className="font-normal text-lg text-[#414752] leading-relaxed text-justify md:text-left">
                  {conteudo.historia.paragrafos[1]}
                </p>
                <p className="font-normal text-lg text-[#414752] leading-relaxed text-justify md:text-left">
                  {conteudo.historia.paragrafos[2]}
                </p>
                <p className="font-normal text-lg text-[#414752] leading-relaxed text-justify md:text-left">
                  {conteudo.historia.paragrafos[3]}
                </p>
              </div>

              <div className="border-l-4 border-[#b61722] pl-4 mt-2">
                <span className="inline-block bg-[#005f9d] text-white text-xs font-bold tracking-widest uppercase px-3 py-1 rounded mb-2">
                  {conteudo.historia.citacao_label}
                </span>
                <p className="font-normal text-base text-[#414752] italic leading-relaxed text-justify md:text-left">
                  {conteudo.historia.citacao}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="w-full rounded-2xl h-[200px] md:h-[250px] overflow-hidden shadow-2xl">
                <img
                  src={imagens[conteudo.galeria_fotos.imagens[12]]}
                  alt="Molhes da Barra"
                  className="w-full h-full object-cover"
                />
                </div>
              <div className="w-full rounded-2xl h-[300px] md:h-[450px] overflow-hidden shadow-2xl">
                <img
                  src={imagens[conteudo.galeria_fotos.imagens[11]]}
                  alt="Molhes da Barra"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="w-full rounded-2xl h-[300px] md:h-[450px] overflow-hidden shadow-2xl">
                <img
                  src={imagens[conteudo.historia.imagem_url]}
                  alt="Recorte de jornal Vagoneteiros"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Linha do Tempo */}
      <section className="bg-[#f2f3fb] pb-16 md:pb-24 w-full">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col gap-10">
            <SectionHeader
              title={conteudo.linha_do_tempo.titulo}
              description={conteudo.linha_do_tempo.descricao}
            />

            <div className="relative flex flex-col gap-10">
              <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-[#dde2ea] -translate-x-1/2" />

              {conteudo.linha_do_tempo.eventos.map((evento, i) => (
                <TimelineItem
                  key={i}
                  year={evento.ano}
                  title={evento.titulo}
                  description={evento.descricao}
                  variant={["blue", "red", "green", "dark", "yellow", "purple", "orange", "pink"][i] as "blue" | "red" | "green" | "dark" | "yellow" | "purple" | "orange" | "pink"}
                  side={i % 2 === 0 ? "left" : "right"}
                  image={imagens[evento.image_url]}
                />
              ))}
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

              <p className="font-normal text-lg text-white/80 leading-relaxed text-justify md:text-left">
                {conteudo.vagoneteiros.descricao}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {conteudo.vagoneteiros.features.map((f, i) => (
                  <FeatureCard key={i} title={f.titulo} description={f.descricao} />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl h-48 md:h-64 overflow-hidden">
                <img
                  src={imagens[conteudo.vagoneteiros.imagem_url]}
                  alt="Vagoneteiro"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="rounded-xl h-48 md:h-64 overflow-hidden mt-8">
                <img
                  src={imagens[conteudo.galeria_fotos.imagens[0]]}
                  alt="Vagoneta"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="col-span-2 rounded-xl h-48 md:h-64 overflow-hidden">
                <img
                  src={imagens[conteudo.galeria_fotos.imagens[3]]}
                  alt="Molhes"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Referências */}
      <section className="bg-[#f2f3fb] pb-6 w-full">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="border-t border-[#dde2ea] pt-6">
            <h3 className="font-semibold text-xs text-[#7a8394] tracking-widest uppercase mb-3">
              {conteudo.referencias.titulo}
            </h3>
            <ul className="flex flex-col gap-1">
              {conteudo.referencias.itens.map((ref, i) => (
                <li key={i}>
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-normal text-xs text-[#9ca3af] hover:text-blue-accent transition-colors leading-relaxed underline underline-offset-2"
                  >
                    {ref.texto}
                  </a>
                </li>
              ))}
            </ul>
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
            <p className="font-normal text-lg text-[#414752] leading-relaxed text-justify md:text-left">
              {conteudo.cta.descricao}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2 justify-center">
              <Button text="AGENDAR" icon="plane" to="/agendamento" />
              <Button
                text={conteudo.rodape_localizacao.botao.texto}
                variant="secondary"
                icon="pin"
                onClick={() => window.open('https://www.google.com/maps/place/Vagonetas+dos+Molhes+da+Barra/@-32.1607519,-52.1029801,17z', '_blank')}
              />
              <Button text={conteudo.galeria_fotos.botao.texto} variant="secondary" icon="image" to="/galeria" />
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};