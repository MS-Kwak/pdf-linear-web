import { Suspense } from "react";
import { redirect } from "next/navigation";
import PdfViewer from "@/components/PdfViewer";

interface SearchParams {
  token?: string;
}

interface Props {
  searchParams: Promise<SearchParams>;
}

export default async function ViewPage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) {
    redirect("/error-page?reason=no-token");
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PdfViewer token={token} />
    </Suspense>
  );
}
