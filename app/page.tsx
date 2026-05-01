import { redirect } from "next/navigation";

// 루트 접근 시 에러 안내 페이지로 이동
export default function Home() {
  redirect("/error-page?reason=no-token");
}
