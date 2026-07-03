import Navbar from "@/components/home/Navbar";
import SqueletteListe from "@/components/annonces/SqueletteListe";

// Affiché instantanément pendant le fetch serveur de /acheter
export default function ChargementAcheter() {
  return (
    <main style={{ background: "var(--fond-principal)", minHeight: "100vh" }}>
      <Navbar />
      <SqueletteListe />
    </main>
  );
}
