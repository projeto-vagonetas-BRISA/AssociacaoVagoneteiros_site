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

const PHOTOS_PER_PAGE = 14;

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
  const [currentPage, setCurrentPage] = useState(1);

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

  // Paginação
  const totalPages = Math.ceil(displayPhotos.length / PHOTOS_PER_PAGE);
  const pageStart = (currentPage - 1) * PHOTOS_PER_PAGE;
  const pageEnd = pageStart + PHOTOS_PER_PAGE;
  const pagePhotos = displayPhotos.slice(pageStart, pageEnd);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    // Rola suavemente até o topo da galeria
    document.getElementById("galeria-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Gera array de páginas com reticências para muitas páginas
  const getPageNumbers = (): (number | "...")[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "...")[] = [];
    if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, "...", totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
    }
    return pages;
  };

  // Lightbox usa índice global dentro de displayPhotos
  const openLightbox = (globalIndex: number) => setLightbox(globalIndex);
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
      <section id="galeria-grid" className="bg-bg-light-1 py-8 md:py-16 w-full scroll-mt-4">
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
              {/* Mobile: lista vertical */}
              <div className="flex flex-col gap-4 md:hidden">
                {pagePhotos.map((photo, i) => (
                  <div
                    key={photo.id}
                    className="rounded-2xl overflow-hidden shadow-md cursor-pointer active:scale-[0.98] transition-transform duration-200"
                    onClick={() => openLightbox(pageStart + i)}
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

              {/* Desktop: grid 3 colunas */}
              <div className="hidden md:grid grid-cols-3 gap-4">
                {pagePhotos.length > 0 && (
                  <div
                    className="col-span-1 row-span-2 rounded-2xl overflow-hidden shadow-md cursor-pointer hover:scale-[1.02] transition-transform duration-200"
                    onClick={() => openLightbox(pageStart + 0)}
                  >
                    <img
                      src={pagePhotos[0].src}
                      alt={pagePhotos[0].alt}
                      className="w-full object-cover"
                      style={{ height: "420px" }}
                    />
                  </div>
                )}

                {pagePhotos.slice(1).map((photo, i) => (
                  <div
                    key={photo.id}
                    className="rounded-2xl overflow-hidden shadow-md cursor-pointer hover:scale-[1.02] transition-transform duration-200"
                    onClick={() => openLightbox(pageStart + i + 1)}
                  >
                    <img
                      src={photo.src}
                      alt={photo.alt}
                      className="w-full object-cover"
                      style={{ height: "200px" }}
                    />
                  </div>
                ))}
              </div>

              {/* Controles de paginação */}
              {totalPages > 1 && (
                <div className="mt-10 flex flex-col items-center gap-4">
                  {/* Indicador */}
                  <p className="text-sm text-text-primary">
                    Mostrando{" "}
                    <span className="font-semibold text-black">{pageStart + 1}–{Math.min(pageEnd, displayPhotos.length)}</span>
                    {" "}de{" "}
                    <span className="font-semibold text-black">{displayPhotos.length}</span>{" "}fotos
                  </p>

                  {/* Botões de página */}
                  <div className="flex items-center gap-1.5">
                    {/* Anterior */}
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium border border-[#dde2ea] bg-white text-text-primary hover:bg-blue-accent hover:text-white hover:border-blue-accent transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-text-primary disabled:hover:border-[#dde2ea]"
                    >
                      ‹ Anterior
                    </button>

                    {/* Números */}
                    {getPageNumbers().map((page, idx) =>
                      page === "..." ? (
                        <span key={`ellipsis-${idx}`} className="px-2 py-2 text-sm text-text-primary select-none">
                          …
                        </span>
                      ) : (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          className={`w-9 h-9 rounded-xl text-sm font-medium border transition-all duration-200 ${currentPage === page
                            ? "bg-blue-accent text-white border-blue-accent shadow-sm"
                            : "bg-white text-text-primary border-[#dde2ea] hover:bg-blue-accent hover:text-white hover:border-blue-accent"
                            }`}
                        >
                          {page}
                        </button>
                      )
                    )}

                    {/* Próximo */}
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium border border-[#dde2ea] bg-white text-text-primary hover:bg-blue-accent hover:text-white hover:border-blue-accent transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-text-primary disabled:hover:border-[#dde2ea]"
                    >
                      Próximo ›
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ver foto (lightbox — navegação pelo conjunto completo) */}
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
