"use client";

// Importé uniquement via next/dynamic (ssr:false) — accès à window autorisé ici
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";

// Correction des icônes Leaflet (cassées dans Next.js par le bundler)
const iconMarker = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

type Props = {
  latitude: number;
  longitude: number;
  titre: string;
};

export default function MapLeaflet({ latitude, longitude, titre }: Props) {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={15}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={false}
      attributionControl={true}
    >
      <TileLayer
        attribution='© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Marker avec popup */}
      <Marker position={[latitude, longitude]} icon={iconMarker}>
        <Popup>
          <span style={{ fontFamily: "sans-serif", fontSize: 13, color: "#0F4C3A" }}>
            {titre}
          </span>
        </Popup>
      </Marker>

      {/* Cercle de 350 m — localisation approximative */}
      <Circle
        center={[latitude, longitude]}
        radius={350}
        pathOptions={{
          color: "#0F4C3A",
          fillColor: "#0F4C3A",
          fillOpacity: 0.1,
          weight: 2,
          dashArray: "6 4",
        }}
      />
    </MapContainer>
  );
}
