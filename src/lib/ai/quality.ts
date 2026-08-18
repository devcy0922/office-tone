import { looksLikeInventedAcceptance, looksLikeRoleReversal } from "@/lib/ai/semantics";

export type QualityVerdict = {
  pass: boolean;
  failures: string[];
};

const CONCESSION_PATTERNS = [
  /최대한\s*(노력|해보|검토)/,
  /가능하도록\s*검토/,
  /오늘\s*중\s*(확인|처리|완료)/,
  /제가\s*다시\s*확인/,
  /검토해보겠/,
  /확인해보겠/,
  /맞춰보겠/,
  /진행해보겠/,
  /노력해보겠/,
  /최선을\s*다/,
];

const REFUSAL_CUES = [/못\s*합니다/, /어렵습니다/, /안\s*됩니다/, /불가/, /할\s*수\s*없/, /오늘은\s*어렵/, /절대\s*못/];
const NOT_DEV_CUES = [/개발\s*문제(가\s*)?아닙니다/, /요구사항이\s*바/, /기획이\s*바/];
const FORMAL_CUES = /습니다|바랍니다|드립니다|확인하였|진행하고자|불가합니다/;
const CASUAL_CUES = /요\.|해요|잖아요|는데요|인데|근데|못 해요|그거|이거/;

function containsAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function originalAllows(original: string, pattern: RegExp): boolean {
  return pattern.test(original);
}

export function evaluateIntentPreservation(original: string, rewritten: string): QualityVerdict {
  const failures: string[] = [];

  if (containsAny(original, REFUSAL_CUES) && /최대한\s*(해보|노력|검토)/.test(rewritten)) {
    failures.push("거절이 양보/노력 약속으로 바뀌었습니다.");
  }

  if (containsAny(original, REFUSAL_CUES)) {
    const kept = /어렵|불가|못\s*합|할\s*수\s*없|진행할\s*수\s*없|완료(가|는)\s*어렵|오늘은\s*(어렵|불가|못)|못 해요/.test(
      rewritten,
    );
    if (!kept) failures.push("불가능한 일정/거절이 사라졌습니다.");
  }

  if (containsAny(original, NOT_DEV_CUES)) {
    if (/함께\s*확인|검토해보겠|최대한\s*해보/.test(rewritten)) {
      failures.push("책임 경계가 협력 약속으로 바뀌었습니다.");
    }
    if (/요구사항|기획/.test(original) && !/요구사항|기획|변경/.test(rewritten)) {
      failures.push("요구사항 변경 사실이 사라졌습니다.");
    }
  }

  for (const pattern of CONCESSION_PATTERNS) {
    if (pattern.test(rewritten) && !originalAllows(original, pattern) && !/노력|검토|확인|맞추/.test(original)) {
      failures.push(`원문에 없는 약속/양보가 추가되었습니다: ${pattern}`);
      break;
    }
  }

  if (/죄송|미안/.test(rewritten) && !/죄송|미안/.test(original)) {
    failures.push("사용자가 하지 않은 사과를 추가했습니다.");
  }

  return { pass: failures.length === 0, failures };
}

export function evaluateReplySemantics(context: string, rawReply: string, rewritten: string): QualityVerdict {
  const failures: string[] = [...evaluateIntentPreservation(rawReply, rewritten).failures];

  if (looksLikeRoleReversal(context, rawReply, rewritten)) {
    failures.push("상대의 말을 사용자의 말로 뒤집었습니다.");
  }

  if (looksLikeInventedAcceptance(rawReply, rewritten)) {
    failures.push("사용자가 하지 않은 수락을 만들었습니다.");
  }

  if (/니(가|야).*만들|니가 만든|내가 만든 게 아|내 거 아/.test(rawReply)) {
    if (!/아니|아닙|제가 (한|진행|만든|변경|발생)|제 (작업|업무)|제가 한 게|제가 만든/.test(rewritten)) {
      failures.push("책임 부인 입장이 사라졌습니다.");
    }
    if (/작성하겠습니다|보고드리겠습니다|작성해보겠습니다/.test(rewritten)) {
      failures.push("거부한 보고/작성을 수락했습니다.");
    }
  }

  if (/오늘 절대 못|오늘은 못|이미 다른 일정/.test(rawReply)) {
    if (/최대한 오늘까지 해보|오늘까지 완료해보|완료하겠습니다/.test(rewritten)) {
      failures.push("일정 거절이 수락으로 바뀌었습니다.");
    }
  }

  if (/배포랑 상관없|우리 탓/.test(rawReply)) {
    if (/죄송|저희 책임|배포 때문에 장애/.test(rewritten) && !/아니|아닙|무관|상관없/.test(rewritten)) {
      failures.push("배포 책임을 인정하는 방향으로 바뀌었습니다.");
    }
  }

  if (/요구사항을 일주일마다 바꾸/.test(rawReply) || /요구사항이 계속 바/.test(rawReply)) {
    if (!/요구사항|변경/.test(rewritten)) {
      failures.push("요구사항 변경 사실이 사라졌습니다.");
    }
  }

  if (/내 서비스 장애도 아닌데/.test(rawReply)) {
    if (/분석하겠습니다|보고하겠습니다/.test(rewritten) && !/아니|아닙|제 서비스가 아/.test(rewritten)) {
      failures.push("원인 분석 요청을 수락했습니다.");
    }
  }

  return { pass: failures.length === 0, failures };
}

export function formalityScore(text: string): number {
  let score = 0;
  if (FORMAL_CUES.test(text)) score += 2;
  if (/해당|관련하여|검토 부탁/.test(text)) score += 1;
  if (CASUAL_CUES.test(text)) score -= 2;
  if (/근데|아니 |진짜|그냥|그거|이거/.test(text)) score -= 2;
  return score;
}

export function evaluateBusinessShift(lowText: string, highText: string): QualityVerdict {
  const failures: string[] = [];
  const low = lowText.replace(/\s+/g, " ").trim();
  const high = highText.replace(/\s+/g, " ").trim();
  if (low === high) {
    failures.push("비즈니스 낮음/높음 결과가 같습니다.");
  }
  if (formalityScore(high) < formalityScore(low)) {
    failures.push("비즈니스가 높은데 문체가 더 공식이지 않습니다.");
  }
  if (/해당 건에 대하여|조치로 이어|드리옵/.test(lowText)) {
    failures.push("비즈니스가 낮은데 공문체가 나왔습니다.");
  }
  return { pass: failures.length === 0, failures };
}

export function evaluateDirectnessShift(softText: string, hardText: string): QualityVerdict {
  const failures: string[] = [];
  if (softText.replace(/\s+/g, " ").trim() === hardText.replace(/\s+/g, " ").trim()) {
    failures.push("직진도 낮음/높음 결과가 같습니다.");
  }
  const softHedge = /것 같|좋을 것|한번|검토해 보|어떨까/.test(softText);
  const hardHedge = /것 같|좋을 것|한번|검토해 보|어떨까/.test(hardText);
  if (softHedge && hardHedge) {
    failures.push("직진도가 높은데도 완곡 표현이 그대로입니다.");
  }
  return { pass: failures.length === 0, failures };
}

export function evaluateParameterShift(samples: Array<{ label: string; text: string }>): QualityVerdict {
  const failures: string[] = [];
  const unique = new Set(samples.map((sample) => sample.text.replace(/\s+/g, " ").trim()));
  if (unique.size < Math.min(4, samples.length)) {
    failures.push("파라미터 조합별 결과가 충분히 구분되지 않습니다.");
  }
  return { pass: failures.length === 0, failures };
}

export const FIXTURES: Record<string, { id: string; text: string; notes: string }> = {
  refusal: {
    id: "A",
    text: "오늘은 못 합니다. 이미 일정 꽉 찼는데 갑자기 주시면 어떻게 해요.",
    notes: "거절과 일정 불가",
  },
  boundary: {
    id: "B",
    text: "이건 우리가 잘못 만든 게 아니라 요구사항이 바뀐 거잖아요.",
    notes: "책임 경계",
  },
  chase: {
    id: "C",
    text: "저번주에 달라고 했는데 도대체 언제 주실 건가요?",
    notes: "재촉",
  },
  rebuttal: {
    id: "D",
    text: "그 내용은 사실과 다른데 왜 그렇게 보고하신 건가요?",
    notes: "반박",
  },
  boss: {
    id: "E",
    text: "저 이번 주 내내 야근했는데 이것까지 오늘 하라는 건 무리입니다.",
    notes: "상사",
  },
  customer: {
    id: "F",
    text: "계속 요구사항 바꾸면서 왜 일정 안 맞냐고 하시면 곤란합니다.",
    notes: "고객",
  },
  golden: {
    id: "GOLDEN",
    text: "아니 이거 요구사항이 계속 바뀐 건데 왜 제가 오늘 야근해서 맞춰야 하죠? 오늘은 어렵습니다.",
    notes: "라이브 E2E",
  },
  hardNo: {
    id: "FAIL1",
    text: "못 합니다.",
    notes: "critical refusal",
  },
  notDev: {
    id: "FAIL2",
    text: "개발 문제가 아닙니다.",
    notes: "critical boundary",
  },
};

export type ReplyFixture = {
  id: string;
  context: string;
  rawReply: string;
  notes: string;
};

export const REPLY_FIXTURES: Record<string, ReplyFixture> = {
  dbColumn: {
    id: "ROLE_DB",
    context: "DB 컬럼 미스 내일까지 보고 작성하세요.",
    rawReply: "개새끼야 니가 만든 거야 씨발새끼야",
    notes: "responsibility rejection / role reversal",
  },
  incident: {
    id: "ROLE_INCIDENT",
    context: "이 장애 건 원인 분석해서 오늘 보고하세요.",
    rawReply: "저거 내 서비스 장애도 아닌데 왜 내가 해야 해",
    notes: "responsibility reversal",
  },
  deadline: {
    id: "ROLE_DEADLINE",
    context: "오늘 퇴근 전까지 완료해주세요.",
    rawReply: "오늘 절대 못 해 이미 다른 일정 있다고 했잖아",
    notes: "deadline rejection",
  },
  assumption: {
    id: "ROLE_ASSUME",
    context: "지난 배포 때문에 장애가 난 것 같습니다.\n확인해주세요.",
    rawReply: "그 배포랑 상관없는데 왜 자꾸 우리 탓이라고 해요",
    notes: "incorrect assumption",
  },
  customerPushback: {
    id: "ROLE_CUST",
    context: "계속 일정이 늦어지는데 이번 주 안에 무조건 완료해주세요.",
    rawReply: "요구사항을 일주일마다 바꾸는데 어떻게 일정을 맞춰요",
    notes: "customer pushback",
  },
};

export const TONE_VARIANTS = {
  mid: { directness: 50, defensiveness: 70, business: 70 },
  strong: { directness: 95, defensiveness: 95, business: 60 },
  soft: { directness: 20, defensiveness: 70, business: 80 },
  gate: { directness: 80, defensiveness: 90, business: 70 },
  lowBusiness: { directness: 70, defensiveness: 80, business: 20 },
  highBusiness: { directness: 70, defensiveness: 80, business: 85 },
} as const;

export const PARAMETER_MATRIX: Array<[number, number, number]> = [
  [20, 20, 20],
  [20, 90, 80],
  [50, 50, 50],
  [80, 30, 80],
  [80, 80, 80],
  [99, 99, 30],
  [99, 99, 99],
];
