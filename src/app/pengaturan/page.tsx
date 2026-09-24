import { redirect } from "next/navigation";

/** /pengaturan langsung membuka bagian pertama. */
export default function SettingsIndex() {
  redirect("/pengaturan/audio");
}
