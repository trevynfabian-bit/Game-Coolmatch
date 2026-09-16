import type { Metadata } from "next";
import { PracticeExperience } from "@/components/practice/practice-experience";

export const metadata: Metadata = {
  title: "Tempat Latihan — Arena Tembak Simple",
  description:
    "Coba rasa tembakan tiap senjata pada sasaran di empat jarak berbeda, tanpa lawan dan tanpa batas waktu.",
};

export default function PracticePage() {
  return (
    <main className="h-dvh w-full">
      <PracticeExperience />
    </main>
  );
}
