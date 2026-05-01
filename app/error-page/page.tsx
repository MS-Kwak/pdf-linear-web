interface SearchParams {
  reason?: string;
}

interface Props {
  searchParams: Promise<SearchParams>;
}

const MESSAGES: Record<string, string> = {
  "no-token": "링크가 올바르지 않습니다.",
  "expired": "링크가 만료되었습니다.",
  "not-found": "파일을 찾을 수 없습니다.",
};

export default async function ErrorPage({ searchParams }: Props) {
  const { reason } = await searchParams;
  const message = (reason && MESSAGES[reason]) || "오류가 발생했습니다.";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center bg-gray-50">
      <div className="text-5xl mb-4">📄</div>
      <h1 className="text-xl font-semibold text-gray-700 mb-2">{message}</h1>
      <p className="text-sm text-gray-400">
        카카오톡 또는 문자로 받은 링크를 다시 확인해 주세요.
      </p>
    </div>
  );
}
