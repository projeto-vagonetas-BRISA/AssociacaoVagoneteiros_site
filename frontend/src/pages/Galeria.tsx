import React, { useEffect, useState } from "react";
import { Button } from "../components/Button";
import conteudo from "../assets/conteudo.json";
import { GalleryThumbnailsIcon } from "lucide-react";
import { api } from "../services/api";

type GalleryPhoto = {
  id: string;
  name: string;
  src: string;
  alt: string;
};

const fallbackPhotos: GalleryPhoto[] = [
  { id: "fallback-1", name: "Foto 1", src: "https://placehold.co/800x600/1878c1/white?text=Foto+1", alt: "Vagoneteiros foto 1" },
  { id: "fallback-2", name: "Foto 2", src: "https://placehold.co/800x600/005f9d/white?text=Foto+2", alt: "Vagoneteiros foto 2" },
  { id: "fallback-3", name: "Foto 3", src: "https://placehold.co/800x600/b61722/white?text=Foto+3", alt: "Vagoneteiros foto 3" },
  { id: "fallback-4", name: "Foto 4", src: "https://placehold.co/800x600/1878c1/white?text=Foto+4", alt: "Vagoneteiros foto 4" },
  { id: "fallback-5", name: "Foto 5", src: "https://placehold.co/800x600/005f9d/white?text=Foto+5", alt: "Vagoneteiros foto 5" },
  { id: "fallback-6", name: "Foto 6", src: "https://placehold.co/800x600/b61722/white?text=Foto+6", alt: "Vagoneteiros foto 6" },
  { id: "fallback-7", name: "Foto 7", src: "https://placehold.co/800x600/1878c1/white?text=Foto+7", alt: "Vagoneteiros foto 7" },
  { id: "fallback-8", name: "Foto 8", src: "https://placehold.co/800x600/1878c1/white?text=Foto+8", alt: "Vagoneteiros foto 8" },

];

const SectionIcon: React.FC<{ icon: React.ReactNode }> = ({ icon }) => (
  <div className="w-8 h-8 rounded-md bg-blue-accent/10 flex items-center justify-center text-blue-accent shrink-0">
    {icon}
  </div>
);

export const Galeria: React.FC = () => {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadPhotos = async () => {
      setLoading(true);

      try {
        const response = await api.request<{ photos?: GalleryPhoto[] }>("/galeria/fotos");
        const drivePhotos = (response.photos ?? []).map((photo) => ({
          ...photo,
          src: `${api.baseUrl}/galeria/imagem/${photo.id}`,
        }));

        if (!active) {
          return;
        }

        if (drivePhotos.length > 0) {
          setPhotos(drivePhotos);
          setErrorMessage(null);
        } else {
          setPhotos(fallbackPhotos);
          setErrorMessage("A pasta da galeria não retornou imagens.");
        }
      } catch (error) {
        if (!active) {
          return;
        }

        setPhotos(fallbackPhotos);
        setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar as fotos da galeria.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadPhotos();

    return () => {
      active = false;
    };
  }, []);

  const displayPhotos = photos.length > 0 ? photos : fallbackPhotos;

  const openLightbox = (i: number) => setLightbox(i);
  const closeLightbox = () => setLightbox(null);
  const prev = () => setLightbox((i) => (i !== null && i > 0 ? i - 1 : displayPhotos.length - 1));
  const next = () => setLightbox((i) => (i !== null && i < displayPhotos.length - 1 ? i + 1 : 0));

  const galeria = conteudo.galeria_fotos;
  return (
    <div className="flex flex-col items-start w-full">

      {/* header */}
      <section className="bg-bg-light-1 py-10 w-full border-b border-[#dde2ea]">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
          <SectionIcon icon={<GalleryThumbnailsIcon className="size-4" strokeWidth={2} />} />
              <h1 className="font-bold text-3xl md:text-5xl text-black tracking-tighter">
                {galeria?.titulo ?? "Galeria de Fotos"}
              </h1>
            </div>
            <p className="font-normal text-sm md:text-base text-text-primary max-w-xl leading-relaxed">
              {galeria?.descricao ?? "Confira os melhores momentos dos nossos passeios pelos molhes da barra."}
            </p>
          </div>
        </div>
      </section>

      {/* grid de fotos */}
      <section className="bg-bg-light-1 py-8 md:py-16 w-full">
        <div className="max-w-7xl mx-auto px-4 md:px-8">

          {errorMessage && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {errorMessage}. Exibindo um fallback local enquanto isso.
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="rounded-2xl overflow-hidden shadow-md bg-white/70 animate-pulse">
                  <div className="w-full h-55 md:h-55 bg-slate-200" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4 md:hidden">
                {displayPhotos.map((photo, i) => (
                  <div
                    key={photo.id}
                    className="rounded-2xl overflow-hidden shadow-md cursor-pointer active:scale-[0.98] transition-transform duration-200"
                    onClick={() => openLightbox(i)}
                  >
                    <img
                      src={photo.src}
                      alt={photo.alt}
                      className="w-full object-cover"
                      style={{ height: "220px" }}
                    />
                  </div>
                ))}
              </div>

              <div className="hidden md:grid grid-cols-3 gap-4">
                {displayPhotos.length > 0 && (
                  <div
                    className="col-span-1 row-span-2 rounded-2xl overflow-hidden shadow-md cursor-pointer hover:scale-[1.02] transition-transform duration-200"
                    onClick={() => openLightbox(0)}
                  >
                    <img
                      src={displayPhotos[0].src}
                      alt={displayPhotos[0].alt}
                      className="w-full h-full object-cover"
                      style={{ minHeight: "420px" }}
                    />
                  </div>
                )}

                {displayPhotos.slice(1).map((photo, i) => (
                  <div
                    key={photo.id}
                    className="rounded-2xl overflow-hidden shadow-md cursor-pointer hover:scale-[1.02] transition-transform duration-200"
                    onClick={() => openLightbox(i + 1)}
                  >
                    <img
                      src={photo.src}
                      alt={photo.alt}
                      className="w-full h-full object-cover"
                      style={{ minHeight: "200px" }}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ver foto */}
      {lightbox !== null && displayPhotos[lightbox] && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 text-white text-4xl font-bold px-3 py-2 hover:text-blue-accent"
            onClick={(e) => { e.stopPropagation(); prev(); }}
          >
            ‹
          </button>
          <img
            src={displayPhotos[lightbox].src}
            alt={displayPhotos[lightbox].alt}
            className="max-h-[85vh] max-w-[85vw] rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 text-white text-4xl font-bold px-3 py-2 hover:text-blue-accent"
            onClick={(e) => { e.stopPropagation(); next(); }}
          >
            ›
          </button>
          <button
            className="absolute top-4 right-4 text-white text-2xl hover:text-red-dark"
            onClick={closeLightbox}
          >
            ✕
          </button>
        </div>
      )}

      {/* envie sua foto */}
      <section className="bg-[#eef0f8] py-12 md:py-20 w-full">
        <div className="max-w-7xl mx-auto px-4 md:px-8 text-center">
          <div className="flex flex-col items-center gap-4 max-w-xl mx-auto">
            <h2 className="font-bold text-2xl md:text-4xl text-black tracking-tighter">
              {galeria?.upload?.titulo ?? "Envie sua foto"}
            </h2>
            <p className="font-normal text-sm md:text-base text-text-primary leading-relaxed text-justify md:text-left">
              {galeria?.upload?.descricao ?? "Foi em um dos nossos passeios e quer compartilhar o momento? Envie sua foto e ela pode aparecer aqui!"}
            </p>
            <div className="pt-2">
              <Button
                text="Fazer Upload"
                icon="upload"
                variant="secondary"
              />
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
