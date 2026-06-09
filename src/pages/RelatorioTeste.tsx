// Kept for backward compatibility. The real implementation lives in
// src/components/fundos/ControleDeAtivosContent.tsx and is embedded in the
// Fundos page (/fundos). The /controle-de-ativos route now redirects to /fundos.
import { AppLayout } from "@/components/layout";
import { ControleDeAtivosContent } from "@/components/fundos/ControleDeAtivosContent";

export default function RelatorioTeste() {
  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-2">
        <ControleDeAtivosContent />
      </div>
    </AppLayout>
  );
}
