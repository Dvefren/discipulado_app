import Link from "next/link";
import { Presentation as PresentationIcon, Layers, ImageOff } from "lucide-react";
import presentationsData from "../../../../public/presentations.json";

interface Presentation {
  slug: string;
  title: string;
  description: string;
  slideCount: number;
  imageExt: string;
}

export default function PresentationsPage() {
  const presentations = presentationsData as Presentation[];
  const readyCount = presentations.filter((p) => p.slideCount > 0).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium text-foreground">Presentaciones</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Material visual para clases de recuperación
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {readyCount} de {presentations.length} disponibles
        </span>
      </div>

      {/* Grid */}
      {presentations.length === 0 ? (
        <div className="bg-muted rounded-xl p-10 text-center">
          <PresentationIcon size={32} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Aún no hay presentaciones disponibles.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {presentations.map((p) => {
            const isEmpty = p.slideCount === 0;

            // Empty state — non-clickable placeholder card
            if (isEmpty) {
              return (
                <div
                  key={p.slug}
                  className="bg-card border border-dashed border-border rounded-xl overflow-hidden opacity-60"
                >
                  <div className="relative aspect-video bg-muted flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                      <ImageOff size={24} className="text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                        Sin contenido
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-medium text-foreground mb-1">
                      {p.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {p.description || "Pendiente de subir"}
                    </p>
                  </div>
                </div>
              );
            }

            // Active state — clickable card with thumbnail
            return (
              <Link
                key={p.slug}
                href={`/dashboard/presentations/${p.slug}`}
                className="group bg-card border border-border rounded-xl overflow-hidden hover:border-foreground/20 transition-colors"
              >
                <div className="relative aspect-video bg-muted overflow-hidden">
                  <img
                    src={`/presentations/${p.slug}/slide-1.${p.imageExt}`}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-background/90 backdrop-blur-sm flex items-center gap-1">
                    <Layers size={10} className="text-muted-foreground" />
                    <span className="text-[10px] font-medium text-foreground">
                      {p.slideCount} slides
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="text-sm font-medium text-foreground mb-1">
                    {p.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {p.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}