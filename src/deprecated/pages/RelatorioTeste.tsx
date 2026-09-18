// DEPRECATED (SPEC07-document-improvements, T16). Not registered in App.tsx —
// /controle-de-ativos and /relatorio-teste both redirect to /fundos, and this
// component is not imported anywhere in the live app. Its only action (POST
// /report) was disabled (501) in T4 of this same spec: it built a PDF
// hardcoded to a fund that no longer exists in the system. To reactivate:
// restore /report in data_fidc/report/api.py (layout code is at
// data_fidc/deprecated/pdf_builder.py) and re-add the "controle" tab in
// src/pages/Fundos.tsx.
import { AppLayout } from "@/components/layout";
import { ControleDeAtivosContent } from "@/deprecated/components/fundos/ControleDeAtivosContent";

export default function RelatorioTeste() {
  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-2">
        <ControleDeAtivosContent />
      </div>
    </AppLayout>
  );
}
