const COUNTERPARTY_REQUEST = /하세요|해주세요|부탁|작성하|보고하|완료해|확인해|주세요|하십시오/;
const PUSHBACK =
  /니(가|야)|내가 아|내 거 아|못 해|왜 내|씨발|개새끼|만든 거|내 업무 아|상관없|탓|절대 못|내가 해야|우리 탓|바꾸는데/;
const ACCEPTANCE =
  /작성하겠습니다|보고드리겠습니다|진행하겠습니다|완료하겠습니다|해보겠습니다|맞춰보겠습니다|오늘까지 해/;
const BLAME_DENIAL_KEEP =
  /아니|아닙|제가 (한|진행|만든|변경|발생)|제 (작업|업무|서비스)|제가 한 게|제가 만든 게|제가 변경|책임 범위|제 책임이 아/;
const REQUEST_AS_USER = /부탁드립|해주세요|하세요/;

function compact(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function isCounterpartyRequest(context: string): boolean {
  return COUNTERPARTY_REQUEST.test(context);
}

export function isPushback(rawReply: string): boolean {
  return PUSHBACK.test(rawReply);
}

export function deniesResponsibility(rawReply: string): boolean {
  return /니(가|야).*만들|니가 만든|내가 만든 게 아|내 거 아|내 업무 아|내 서비스 장애도 아|상관없|우리 탓/.test(
    rawReply,
  );
}

export function looksLikeRoleReversal(context: string, rawReply: string, output: string): boolean {
  if (!context.trim() || !output.trim()) return false;
  if (!isCounterpartyRequest(context) || !isPushback(rawReply)) return false;

  const text = compact(output);
  const challengesRequest = /맞는지|해야 하는|책임|확인했|제가 할 일인지|받아들이기|어렵/.test(text);

  if (deniesResponsibility(rawReply) && ACCEPTANCE.test(text) && !/아니|아닙|어렵|불가/.test(text)) {
    return true;
  }

  const contextAsksReport = /보고/.test(context) && /작성|하세요|해주세요/.test(context);
  if (contextAsksReport) {
    const restatesReportAsk = /보고.{0,16}(작성|부탁)/.test(text) && REQUEST_AS_USER.test(text);
    if (restatesReportAsk && !challengesRequest) return true;
  }

  const contextDeadline = /오늘|내일|퇴근 전|이번 주/.test(context) && /완료|작성|해주세요|하세요/.test(context);
  if (contextDeadline && /오늘까지\s*(해보|완료)|완료해보겠습니다|맞춰보겠습니다/.test(text)) {
    return true;
  }

  if (
    deniesResponsibility(rawReply) &&
    REQUEST_AS_USER.test(text) &&
    !challengesRequest &&
    !BLAME_DENIAL_KEEP.test(text)
  ) {
    return true;
  }

  return false;
}

export function looksLikeInventedAcceptance(rawReply: string, output: string): boolean {
  if (ACCEPTANCE.test(rawReply)) return false;
  if (!isPushback(rawReply) && !/못\s*합|어렵|안\s*됩|불가/.test(rawReply)) return false;
  return ACCEPTANCE.test(output) && !/아니|아닙|어렵|불가|못\s*합/.test(output);
}
