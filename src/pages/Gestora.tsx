import { AppLayout } from "@/components/layout";
import { GestoraDocumentsContent } from "@/components/gestora/GestoraDocumentsContent";

export default function Gestora() {
  return (
    <AppLayout title="Gestora">
      <div className="mx-auto max-w-5xl py-2">
        <GestoraDocumentsContent />
      </div>
    </AppLayout>
  );
}
