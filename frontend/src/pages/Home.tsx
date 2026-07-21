import React from "react";
import { MapPin, Clock } from "lucide-react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { SectionHeader } from "../components/SectionHeader";
import { TimelineCard } from "../components/TimelineCard";

import Logo from "../assets/logo.png";
import conteudo from "../assets/conteudo.json";
import { imagens } from "../assets/imagens";

export const Home: React.FC = () => {
  return (
    <div className="flex flex-col items-start w-full">

      {/* Hero Section */}
      <section
        className="relative flex items-center justify-center min-h-screen md:min-h-175 w-full bg-slate-900 bg-cover bg-center"
        style={{
          backgroundImage: `url(${imagens[conteudo.hero.imagem_fundo]})`,
          imageRendering: 'auto',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/45 to-black/60" />
        <div className="relative z-10 max-w-7xl w-full px-4 md:px-8 py-20">
          <div className="flex flex-col items-center w-full overflow-x-hidden">
            <Badge text={conteudo.hero.tagline} />

            <div className="flex flex-col items-center text-center md:flex-row md:items-center md:text-left gap-4">
              <img src={Logo} alt="Logo" className="w-64 h-64 shrink-0" />
              <h1 className="font-bold text-white tracking-tighter leading-none">
                <span className="block text-[clamp(2.5rem,7vw,6rem)]">Vagoneteiros</span>
                <span className="block text-[clamp(2.5rem,7vw,6rem)]">dos Molhes da Barra</span>
              </h1>
            </div>

            <p className="font-medium text-lg md:text-lg text-white/80 leading-relaxed text-justify md:text-left">
              {conteudo.hero.descricao}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button text="AGENDAR PASSEIO" icon="plane" to="/agendamento" />
              <Button text="VER GALERIA" variant="outline" to="/galeria" />
            </div>
          </div>
        </div>
      </section>

      {/* Nossa História Section */}
      <section className="bg-bg-light-1 py-16 md:py-24 w-full">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">

            <div className="flex flex-col gap-4">
              <SectionHeader
                label="O Legado"
                title="Nossa História"
                titleSize="large"
              />
              <div className="flex flex-col gap-6 pt-4">
                <p className="font-normal text-lg text-text-primary leading-relaxed text-justify md:text-left">
                  {conteudo.historia.paragrafos[0]}
                </p>
                <p className="font-normal text-lg text-text-primary leading-relaxed text-justify md:text-left">
                  {conteudo.historia.paragrafos[1]}
                </p>
              </div>
            </div>

            <div className="w-full rounded-2xl h-75 md:h-112.5 overflow-hidden shadow-2xl">
              <img
                src={imagens[conteudo.historia.imagem_url]}
                alt="Recorte de jornal Vagoneteiros"
                className="w-full h-full object-cover"
              />
            </div>

          </div>
        </div>
      </section>

      {/* Linha do Tempo Section */}
      <section className="bg-bg-light-1 pb-16 md:pb-24 w-full">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <SectionHeader
                title="LINHA DO TEMPO"
                description={conteudo.linha_do_tempo.descricao}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {conteudo.linha_do_tempo.eventos.slice(0, 3).map((evento, i) => (
                <TimelineCard
                  key={i}
                  year={evento.ano}
                  title={evento.titulo}
                  description={evento.descricao}
                  variant={["blue", "red", "green"][i] as "blue" | "red" | "green"}
                />
              ))}
            </div>

            <div className="w-fit">
              <Button text="SAIBA MAIS" variant="secondary" icon="arrow" to="/historia" />
            </div>
          </div>
        </div>
      </section>

      {/* Como Funciona o Passeio Section */}
      <section className="bg-bg-light-2 py-16 w-full">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">
            <div className="flex flex-col gap-8">
              <SectionHeader title="Como Funciona o Passeio" />

              <div className="flex flex-col gap-6">
                <p className="font-normal text-lg text-text-primary leading-relaxed text-justify md:text-left">
                  {conteudo.como_funciona.paragrafos[0]}
                </p>
                <p className="font-normal text-lg text-text-primary leading-relaxed text-justify md:text-left">
                  {conteudo.como_funciona.paragrafos[1]}
                </p>

                <div className="flex gap-4 items-center pt-4">
                  <MapPin className="size-5 shrink-0 text-green-alt" strokeWidth={2} />
                  <div>
                    <p className="font-bold text-lg text-blue leading-relaxed">
                      {conteudo.como_funciona.ponto_partida.rotulo}
                    </p>
                    <p className="font-normal text-sm text-text-primary leading-5 text-justify md:text-left">
                      {conteudo.como_funciona.ponto_partida.endereco}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative rounded-2xl h-75 md:h-112.5 overflow-hidden shadow-2xl">
              <img
                src={imagens[conteudo.como_funciona.trajeto.imagem_url]}
                alt="Molhes da Barra"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-6 left-6 backdrop-blur-sm bg-white/90 rounded-lg p-4 border-l-4 border-red-dark shadow-lg">
                <p className="font-bold text-xs text-blue tracking-widest uppercase leading-4">
                  {conteudo.como_funciona.trajeto.rotulo}
                </p>
                <p className="font-bold text-sm text-text-dark leading-5 pt-1">
                  {conteudo.como_funciona.trajeto.descricao}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Galeria de Fotos Section */}
      <section className="bg-bg-light-2 py-16 md:py-24 w-full">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-6">
            <div className="md:col-span-5 flex flex-col justify-center items-start">
              <h2 className="font-bold text-4xl md:text-5xl text-black tracking-tighter uppercase leading-tight pb-6">
                {conteudo.galeria_fotos.titulo}
              </h2>
              <p className="font-normal text-lg text-text-primary leading-relaxed pb-8 text-justify md:text-left">
                {conteudo.galeria_fotos.descricao}
              </p>
              <Button text={conteudo.galeria_fotos.botao.texto} variant="secondary" icon="image" to="/galeria" />
            </div>

            <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl h-64 md:h-80 overflow-hidden">
                <img
                  src={imagens[conteudo.galeria_fotos.imagens[0]]}
                  alt="Galeria"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="rounded-xl h-64 md:h-80 overflow-hidden sm:mt-12">
                <img
                  src={imagens[conteudo.galeria_fotos.imagens[1]]}
                  alt="Galeria"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Avaliações Section */}
      <section className="bg-bg-light-3 py-16 md:py-24 w-full">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col gap-12 md:gap-16">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <h2 className="font-bold text-3xl md:text-4xl text-black text-center tracking-tight uppercase">
                {conteudo.avaliacoes.titulo}
              </h2>
              <Button text={conteudo.avaliacoes.botao.texto} variant="secondary" icon="star" onClick={() => window.open('https://www.google.com/search?sca_esv=160fecc51e0f0354&sxsrf=APpeQnsw5C3VRPon4DYoUDLm5lqhN6xECA:1784676258941&si=APenkKm7iecQ4G6P-TsbSMFKIQtv3EFIqRAFw-i8uEbk55Z-_zYJXj1ba_IkP5Hhe_TE_i5B9O_uZfSbZ0e1v5ODwyF267foBqvRMlVFKD3JTS1PG7X2xlSCnoKePZB4ly45NojLQen9AWNV56Tzv3Ck5YCySqi9CXrt-Q28G7vaSSpKGLKIq28%3D&q=Vagonetas+dos+Molhes+da+Barra+Coment%C3%A1rios&sa=X&ved=2ahUKEwjE2s-T9eSVAxXPBrkGHc64C7wQ0bkNegQIHBAF&biw=1528&bih=732&dpr=1.25#lrd=0x951183d1b248dfb3:0xc051970bebca8884,3,,,,', '_blank')} />
            </div>

            <div className="w-full">
              <div className="elfsight-app-073217d6-a999-4926-a942-fc7e62274ba7" data-elfsight-app-lazy></div>
            </div>
          </div>
        </div>
      </section>

      {/* Curiosidade */}
      <section className="bg-[#f2f3fb] py-16 md:py-24 w-full">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <Badge text={conteudo.curiosidade_tocha.tag} />
              <h2 className="font-bold text-3xl md:text-4xl text-black tracking-tight uppercase">
                {conteudo.curiosidade_tocha.titulo}
              </h2>
            </div>

            <div className="flex flex-col md:flex-row gap-8 md:gap-16 items-center">
              <div className="flex flex-col gap-5 flex-1">
                {conteudo.curiosidade_tocha.paragrafos.map((p, i) => (
                  <p key={i} className="font-normal text-lg text-text-primary leading-relaxed text-justify">
                    {p}
                  </p>
                ))}
              </div>

              <div className="w-full md:w-120 shrink-0">
                <div className="rounded-2xl overflow-hidden shadow-2xl bg-black/5 aspect-video flex items-center justify-center">
                  {conteudo.curiosidade_tocha.video_url ? (
                    <iframe
                      src={conteudo.curiosidade_tocha.video_url}
                      title="Vagoneteiros e a Chama Olímpica"
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-text-secondary p-8 text-center">
                      <svg className="w-16 h-16 opacity-30" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      <p className="font-medium text-sm">Espaço reservado para vídeo</p>
                      <p className="text-xs opacity-60">
                        Adicione a URL do vídeo no campo "video_url" do conteúdo para exibi-lo aqui.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Siga-nos Section */}
      <section className="bg-bg-light-1 py-16 md:py-24 w-full">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <h2 className="font-bold text-3xl md:text-4xl text-black tracking-tight uppercase">
                Siga-nos
              </h2>
              <a href="https://www.instagram.com/passeiodevagoneta_molhesbarra/" target="_blank" rel="noopener noreferrer">
                <Button text="Instagram" variant="instagram" icon="instagram" />
              </a>
            </div>

            <div className="w-full rounded-2xl overflow-hidden shadow-lg bg-border relative" style={{ height: '550px' }}>
              <iframe
                src="https://widget.tagembed.com/326341?website=1"
                allow="fullscreen"
                scrolling="no"
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
              <div className="absolute bottom-0 left-0 w-full bg-bg-light-1" style={{ height: '40px' }} />
            </div>
          </div>
        </div>
      </section>

      {/* Localização Section */}
      <section className="bg-bg-light-2 py-16 md:py-24 w-full">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="bg-blue rounded-xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
            <div className="p-8 md:p-12 flex flex-col justify-center w-full md:w-101.25 shrink-0">
              <h2 className="font-bold text-3xl md:text-4xl text-white tracking-tighter uppercase pb-6">
                {conteudo.rodape_localizacao.titulo}
              </h2>

              <div className="flex flex-col gap-6 pb-8">
                <div className="flex gap-4 items-start">
                  <MapPin className="size-5 shrink-0 text-[#8DFB8D] mt-0.5" strokeWidth={2} />
                  <p className="font-normal text-base text-[#fdfcff] leading-relaxed text-justify md:text-left">
                    {conteudo.rodape_localizacao.endereco}
                  </p>
                </div>

                <div className="flex gap-4 items-start">
                  <Clock className="size-5 shrink-0 text-[#8DFB8D] mt-0.5" strokeWidth={2} />
                  <div>
                    <p className="font-normal text-base text-[#fdfcff] leading-relaxed text-justify md:text-left">
                      Verão: {conteudo.rodape_localizacao.horario_funcionamento.verao}
                    </p>
                    <p className="font-normal text-base text-[#fdfcff] leading-relaxed text-justify md:text-left">
                      Inverno: {conteudo.rodape_localizacao.horario_funcionamento.inverno}
                    </p>
                    <p className="font-normal text-xs text-[#71dd74] leading-relaxed mt-1">
                      {conteudo.rodape_localizacao.horario_funcionamento.nota}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                text={conteudo.rodape_localizacao.botao.texto}
                variant="white"
                onClick={() => window.open('https://www.google.com/maps/place/Vagonetas+dos+Molhes+da+Barra/@-32.1607519,-52.1029801,17z', '_blank')}
              />
            </div>

            <div className="flex-1 min-h-75 md:min-h-full md:h-106 relative bg-slate-200">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3377.6125848091906!2d-52.102980147679155!3d-32.160751965596084!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x951183d1b248dfb3%3A0xc051970bebca8884!2sVagonetas%20dos%20Molhes%20da%20Barra!5e0!3m2!1spt-BR!2sbr!4v1778708468619!5m2!1spt-BR!2sbr"
                width="100%"
                height="450"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};