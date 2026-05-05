import React from "react";
import { MapPin, Clock } from "lucide-react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { SectionHeader } from "../components/SectionHeader";
import { TimelineCard } from "../components/TimelineCard";
import { ReviewCard } from "../components/ReviewCard";
import Logo from "../assets/logo.png";
import conteudo from "../assets/conteudo.json";

export const Home: React.FC = () => {
  return (
    <div className="flex flex-col items-start w-full">

      {/*  style={{ backgroundImage: `url(${imgUrl})` }} */}
      <section className="relative flex items-center justify-center min-h-screen md:min-h-[700px] w-full bg-slate-900 bg-cover bg-center">
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 max-w-7xl w-full px-4 md:px-8 py-20">
          <div className="flex flex-col gap-6 items-center text-center md:items-start md:text-left max-w-2xl mx-auto md:mx-0">
            <Badge text="Est. 1932" />

            <div className="flex flex-col items-center text-center md:flex-row md:items-center md:text-left gap-4">
              <img src={Logo} alt="Logo" className="w-64 h-64 shadow-xl shrink-0" />
              <h1 className="font-bold text-white tracking-tighter leading-none">
                <span className="block text-[clamp(2.5rem,7vw,6rem)]">Vagoneteiros</span>
                <span className="block text-[clamp(2.5rem,7vw,6rem)] whitespace-nowrap">dos Molhes da Barra</span>
              </h1>
            </div>

            <p className="font-medium text-lg md:text-lg text-white/80 leading-relaxed">
              {conteudo.hero.descricao}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button text="AGENDAR PASSEIO" icon="plane" />
              <Button text="VER GALERIA" variant="outline" />
            </div>
          </div>
        </div>
      </section>

      {/* Nossa História Section */}
      <section className="bg-[#f2f3fb] py-16 md:py-24 w-full">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">

            <div className="flex flex-col gap-4">
              <SectionHeader
                label="O Legado"
                title="Nossa História"
                titleSize="large"
              />
              <div className="flex flex-col gap-6 pt-4">
                <p className="font-normal text-lg text-[#414752] leading-relaxed">
                  {conteudo.historia.paragrafos[0]}
                </p>
                <p className="font-normal text-lg text-[#414752] leading-relaxed">
                  {conteudo.historia.paragrafos[1]}
                </p>
              </div>
            </div>

            <div className="w-full rounded-2xl h-[300px] md:h-[450px] overflow-hidden shadow-2xl bg-[#e6e8f0] flex items-center justify-center">
              {/* img */}
            </div>

          </div>
        </div>
      </section>

      {/* Linha do Tempo Section */}
      <section className="bg-[#f2f3fb] pb-16 md:pb-24 w-full">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <SectionHeader
                title="LINHA DO TEMPO"
                description={conteudo.linha_do_tempo.descricao}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <TimelineCard year="1881" title={conteudo.linha_do_tempo.eventos[0].titulo} description={conteudo.linha_do_tempo.eventos[0].descricao} variant="blue" />
              <TimelineCard year="1920" title={conteudo.linha_do_tempo.eventos[1].titulo} description={conteudo.linha_do_tempo.eventos[1].descricao} variant="red" />
              <TimelineCard year="1970" title={conteudo.linha_do_tempo.eventos[2].titulo} description={conteudo.linha_do_tempo.eventos[2].descricao} variant="green" />
              <TimelineCard year="TODAY" title={conteudo.linha_do_tempo.eventos[3].titulo} description={conteudo.linha_do_tempo.eventos[3].descricao} variant="dark" />
            </div>

            <div className="w-fit">
              <Button text="SAIBA MAIS" variant="secondary" icon="arrow" />
            </div>
          </div>
        </div>
      </section>

      {/* Como Funciona o Passeio Section */}
      <section className="bg-[#f8f9ff] py-16 w-full">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">
            <div className="flex flex-col gap-8">
              <SectionHeader title="Como Funciona o Passeio" />

              <div className="flex flex-col gap-6">
                <p className="font-normal text-lg text-[#414752] leading-relaxed">
                  {conteudo.como_funciona.paragrafos[0]}
                </p>
                <p className="font-normal text-lg text-[#414752] leading-relaxed">
                  {conteudo.como_funciona.paragrafos[1]}
                </p>

                <div className="flex gap-4 items-center pt-4">
                  <MapPin className="size-5 shrink-0 text-[#006B1E]" strokeWidth={2} />
                  <div>
                    <p className="font-bold text-lg text-[#005f9d] leading-relaxed">Ponto de Partida</p>
                    <p className="font-normal text-sm text-[#414752] leading-5">{conteudo.como_funciona.ponto_partida.endereco}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative bg-[#1878c1]/10 rounded-2xl h-[300px] md:h-[450px] overflow-hidden shadow-2xl">
              <div className="absolute bottom-6 left-6 backdrop-blur-sm bg-white/90 rounded-lg p-4 border-l-4 border-[#b61722] shadow-lg">
                <p className="font-bold text-xs text-[#005f9d] tracking-widest uppercase leading-4">Trajeto</p>
                <p className="font-bold text-sm text-[#181c21] leading-5 pt-1">{conteudo.como_funciona.trajeto.descricao}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Galeria de Fotos Section */}
      <section className="bg-[#f8f9ff] py-16 md:py-24 w-full">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-6">
            <div className="md:col-span-5 flex flex-col justify-center items-start">
              <h2 className="font-bold text-4xl md:text-5xl text-black tracking-tighter uppercase leading-tight pb-6">
                galeria de fotos
              </h2>
              <p className="font-normal text-lg text-[#414752] leading-relaxed pb-8">
                {conteudo.galeria_fotos.descricao}
              </p>
              <Button text="VER GALERIA" variant="secondary" icon="image" />
            </div>

            <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#e6e8f0] rounded-xl h-64 md:h-80 overflow-hidden" />
              <div className="bg-[#e6e8f0] rounded-xl h-64 md:h-80 overflow-hidden sm:mt-12" />
            </div>
          </div>
        </div>
      </section>

      {/* Avaliações Section */}
      <section className="bg-[#e0e2ea] py-16 md:py-24 w-full">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col gap-12 md:gap-16">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <h2 className="font-bold text-3xl md:text-4xl text-black text-center tracking-tight uppercase">
                AVALIAÇÕES
              </h2>
              <Button text="AVALIAR" variant="secondary" icon="star" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              <ReviewCard name="Marco Silva" location="São Paulo, BR" comment="Lorem ipsum..." rating={5} avatarLetter="M" avatarColor="bg-[#1878c1]" />
              <ReviewCard name="Ana Beatriz" location="Porto Alegre, BR" comment="Lorem ipsum..." rating={5} avatarLetter="A" avatarColor="bg-[#b61722]" />
              <ReviewCard name="John Miller" location="London, UK" comment="Lorem ipsum..." rating={5} avatarLetter="J" avatarColor="bg-[#0a872a]" />
            </div>
          </div>
        </div>
      </section>

      {/* Localização Section */}
      <section className="bg-[#f8f9ff] py-16 md:py-24 w-full">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="bg-[#005f9d] rounded-xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
            <div className="p-8 md:p-12 flex flex-col justify-center w-full md:w-[405px] shrink-0">
              <h2 className="font-bold text-3xl md:text-4xl text-white tracking-tighter uppercase pb-6">
                LOCALIZAÇÃO
              </h2>

              <div className="flex flex-col gap-6 pb-8">
                <div className="flex gap-4 items-start">
                  <MapPin className="size-5 shrink-0 text-[#8DFB8D] mt-0.5" strokeWidth={2} />
                  <p className="font-normal text-base text-[#fdfcff] leading-relaxed">
                    {conteudo.rodape_localizacao.endereco}
                  </p>
                </div>

                <div className="flex gap-4 items-start">
                  <Clock className="size-5 shrink-0 text-[#8DFB8D] mt-0.5" strokeWidth={2} />
                  <div>
                    <p className="font-normal text-base text-[#fdfcff] leading-relaxed">
                      Funcionamento: {conteudo.rodape_localizacao.horario_funcionamento.horario}
                    </p>
                    <p className="font-normal text-xs text-[#71dd74] leading-relaxed mt-1">
                      {conteudo.rodape_localizacao.horario_funcionamento.nota}
                    </p>
                  </div>
                </div>
              </div>

              <Button text="Ver Localização" variant="white" />
            </div>

            <div className="flex-1 min-h-[300px] md:min-h-full md:h-[424px] relative bg-slate-200">
              {/* Mapa entra aqui */}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};