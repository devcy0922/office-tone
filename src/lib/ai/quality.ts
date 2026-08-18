
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

const REFUSAL_CUES = [/못\s*합니다/, /어렵습니다/, /안\s*됩니다/, /불가/, /할\s*수\s*없/, /오늘은\s*어렵/];
const NOT_DEV_CUES = [/개발\s*문제(가\s*)?아닙니다/, /요구사항이\s*바/, /기획이\s*바/];

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
    const kept = /어렵|불가|못\s*합|할\s*수\s*없|진행할\s*수\s*없|완료(가|는)\s*어렵|오늘은\s*(어렵|불가|못)/.test(
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

export const PARAMETER_MATRIX: Array<[number, number, number]> = [
  [20, 20, 20],
  [20, 90, 80],
  [50, 50, 50],
  [80, 30, 80],
  [80, 80, 80],
  [100, 100, 30],
  [100, 100, 100],
];
