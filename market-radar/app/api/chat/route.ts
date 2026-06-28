import { POST as interviewPost } from "../interview/chat/route";

export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return interviewPost(request);
}
