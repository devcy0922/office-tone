import { Calibrator } from "@/components/calibrator";
import { copy as ui } from "@/lib/copy";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-xl px-5 pb-28 pt-8 md:pt-12 lg:pb-16">
      <header className="mb-8 space-y-3">
        <p className="text-sm font-semibold tracking-[0.18em] text-orange-800/80">{ui.brand}</p>
        <h1 className="whitespace-pre-line text-[30px] font-semibold leading-[1.25] tracking-tight text-stone-900 md:text-4xl">
          {ui.headline}
        </h1>
        <p className="whitespace-pre-line text-[16px] leading-7 text-stone-600">{ui.sub}</p>
      </header>
      <Calibrator />
      <footer className="mt-12 text-xs leading-5 text-stone-400">
        오피스톤은 메시지를 저장하지 않아요. 로그인 없이, 보내기 직전의 온도만 맞춰요.
      </footer>
    </div>
  );
}
