import type { CommunicationMeta, RewriteInput } from "@/lib/ai/types";

const rules: Array<[RegExp, string]> = [
  [/(못\s*해|어렵|불가|안\s*돼|안\s*합니다|거절)/u, "거절"],
  [/(왜\s*제가|제\s*책임|제가\s*한\s*게|제가\s*만든|담당이\s*아니|책임)/u, "책임 경계"],
  [/(아니|다릅|틀렸|사실이\s*아니|그게\s*아니)/u, "반박"],
  [/(언제|빨리|아직|확인\s*부탁|진행\s*상황|재촉)/u, "재촉"],
  [/(일정|오늘|내일|이번\s*주|기한|마감)/u, "일정"],
  [/(해\s*주세요|부탁|요청)/u, "요청"],
];

export function inferCommunicationMeta(input: RewriteInput): CommunicationMeta {
  const merged = `${input.rawReply}\n${input.context}`;
  const intent = input.intent ?? rules.find(([pattern]) => pattern.test(merged))?.[1] ?? "의견 전달";

  let audience = "동료/업무 상대";
  if (/(팀장|부장|상무|이사|대표|상사|리더)/u.test(input.context)) audience = "상사/리더";
  else if (/(고객|클라이언트|거래처|담당자님|귀사)/u.test(input.context)) audience = "고객/거래처";
  else if (/(후배|주니어|신입|팀원)/u.test(input.context)) audience = "팀원/후배";

  return { intent, audience };
}
