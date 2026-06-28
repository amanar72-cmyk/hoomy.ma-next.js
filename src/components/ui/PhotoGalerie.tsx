"use client";

type Props = {
  photos: string[];
  hauteur?: number;
  largeurMax?: number;
  classeImage?: string;
};

export default function PhotoGalerie({
  photos,
  hauteur = 180,
  largeurMax = 280,
  classeImage = "rounded-2xl",
}: Props) {
  if (photos.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {photos.map((url, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={url}
          alt={`Photo ${i + 1}`}
          className={`object-cover flex-shrink-0 ${classeImage}`}
          style={{ height: hauteur, width: "auto", maxWidth: largeurMax }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ))}
    </div>
  );
}
