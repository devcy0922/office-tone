import { Calibrator } from "@/components/calibrator";
import { copy as ui } from "@/lib/copy";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-24 pt-10 md:pt-16">
      <header className="mb-10 space-y-5">
        <p className="text-sm font-semibold tracking-[0.18em] text-orange-800/80">{ui.brand}</p>
        <h1 className="whitespace-pre-line text-[34px] font-semibold leading-[1.25] tracking-tight text-stone-900 md:text-5xl">
          {ui.headline}
        </h1>
        <p className="whitespace-pre-line text-[17px] leading-7 text-stone-600 md:text-lg">{ui.sub}</p>
      </header>
      <Calibrator />
      <footer className="mt-16 text-xs leading-5 text-stone-400">
        오피스톤은 메시지를 저장하지 않아요. 로그인 없이, 보내기 직전의 온도만 맞춰요.
      </footer>
    </div>
  );
}
