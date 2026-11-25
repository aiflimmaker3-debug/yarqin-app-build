import React from 'react';
import {
  BookOpen,
  FileCode2,
  FolderArchive,
  Languages,
  Layers,
  LayoutGrid,
  Lock,
  Network,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface AboutPageProps {
  noteCount: number;
  folderCount: number;
  attachmentCount: number;
  onStartWriting: () => void;
}

const FEATURES_LIST = [
  {
    icon: FileCode2,
    title: 'ئۇيغۇرچە RTL ۋە BiDi Markdown تەھرىرلىگۈچ',
    desc: 'پۈتۈن كۆرۈنمە يۈز ئوڭدىن سولغا تىزىلغان بولۇپ، كۆپ قۇرلۇق ئۇيغۇرچە ئابزاسلار ئىككى تەرەپكە تەڭلەنگەن ۋە باش قۇرى 2 ھەرپ ئىچىدىن باشلىنىدۇ. ئارىلاش يېزىلغان پىروگرامما كودلىرى ئاپتوماتىك سولدىن ئوڭغا (LTR) ئايرىلىدۇ؛ تەھرىرلەش، بۆلۈپ كۆرۈش ۋە ساپ ئوقۇش ھالىتىنى قوللايدۇ.',
  },
  {
    icon: Network,
    title: 'قوش باغلىنىش [[ئۇلانما]] ۋە بىلىم تورى گرافىكى',
    desc: 'خالىغان خاتىرىدە [[خاتىرە نامى]] دەپ يېزىپ ئىدىيەلەرنى ئۆزئارا باغلايسىز. خاتىرە نامىنى ئۆزگەرتسىڭىز باشقا بەتلەردىكى بارلىق ئۇلانمىلار ئاپتوماتىك يېڭىلىنىدۇ؛ ئەكسى ئۇلانمىلار (Backlinks)، يەرلىك گرافىك ۋە تولۇق بىلىم گرافىكى ئارقىلىق تەپەككۇر تورىڭىزنى كۆز بىلەن كۆرەلەيسىز.',
  },
  {
    icon: BookOpen,
    title: 'كۆپ فورماتلىق ھۆججەت (PDF، Word، TXT، MD) ۋە بىللە ئوقۇش',
    desc: 'كومپيۇتېرىڭىزدىكى .docx (Word)، .md، .txt ۋە .pdf ھۆججەتلىرىنى بىۋاسىتە يەرلىكتە ئەكىرەلەيسىز؛ يازغان خاتىرىلىرىڭىزنى Word (.docx)، Markdown (.md)، ساپ تېكىست (.txt) ياكى ئۇيغۇرچە مەتبەئە ئۆلچىمىدىكى PDF قىلىپ چىقىرالايسىز. PDF كىتابنى بىر تەرەپتە ئوقۇغاچ يەنە بىر تەرەپتە شۇ كىتابنىڭ خاتىرىسىنى يېزىش ھالىتىمۇ بار.',
  },
  {
    icon: Languages,
    title: 'ئۇيغۇرچە كۆپ يېزىق ئالماشتۇرغۇچ (كونا يېزىق ⇄ لاتىن يېزىقى)',
    desc: 'تەھرىرلىگۈچ قورال بالدىقىدىن بىر چېكىش بىلەن تاللانغان تېكىستنى ياكى پۈتۈن خاتىرىنى ئۇيغۇر ئەرەب يېزىقى (UEY) بىلەن ئۇيغۇر لاتىن يېزىقى (ULY) ئارىسىدا پۈتۈنلەي يەرلىكتە ئايلاندۇرالايسىز (كود بۆلەكلىرى ۋە تور ئادرېسلىرىغا تەگمەيدۇ).',
  },
  {
    icon: FolderArchive,
    title: 'يۇقىرى سىغىملىق IndexedDB ساقلاش ۋە رەسىم چاپلاش',
    desc: 'بارلىق خاتىرىلەر، PDF كىتابلار ۋە خاتىرە ئىچىگە چاپلىغان (Ctrl+V ياكى سۆرەپ تاشلىغان) رەسىملەر كومپيۇتېرىڭىزنىڭ يەرلىك IndexedDB ئامبىرىدا بىخەتەر ساقلىنىدۇ.',
  },
  {
    icon: LayoutGrid,
    title: 'تەپەككۇر تاختىسى (Canvas)',
    desc: 'ئىدىيەلەر ۋە خاتىرىلەرنى كارتا شەكلىدە چەكسىز تاختىغا ئەركىن تىزىپ، ئارا باغلىنىش سىزىقلىرىنى تارتىپ پىلان ۋە ئەقىل خەرىتىسى تۈزەلەيسىز.',
  },
  {
    icon: Layers,
    title: 'ئەسلەش كارتىلىرى ۋە ئارىلىق تەكرارلاش (Flashcards)',
    desc: 'خاتىرە ئىچىدە «سوئال :: جاۋاب» ياكى «س: / ج:» شەكلىدە يېزىلغان بىلىملەر ئاپتوماتىك ئەسلەش كارتىسىغا ئايلىنىپ، ئىلمىي ئارىلىق تەكرارلاش ئۇسۇلى بىلەن ئەستە ساقلاشقا ياردەم بېرىدۇ.',
  },
  {
    icon: Sparkles,
    title: 'ئۇيغۇرچە سۈنئىي ئەقىل ياردەمچىسى',
    desc: 'خالىغان چاغدا سول تەكشۈرۈش تاختىسىدىن خاتىرىنى خۇلاسىلەش، ئىملا ۋە ئۇسلۇبىنى راۋانلاشتۇرۇش، ئامباردىكى باشقا خاتىرىلەر بىلەن باغلىنىش تەۋسىيەسى ئېلىش ۋە مەزمۇن ھەققىدە سوئال سوراشقا ئىشلىتەلەيسىز.',
  },
  {
    icon: Lock,
    title: 'يەرلىك شىفىرلىق قۇلۇپ (PBKDF2 + SHA-256)',
    desc: 'تەڭشەكلەردىن ئامبار پارولى تەسىس قىلسىڭىز، خىزمەت مۇھىتىنى بىر چېكىش بىلەن قۇلۇپلىيالايسىز. پارول ھېچقاچان تورغا چىقمايدۇ، پەقەت ئۆز ئۈسكۈنىڭىزدە تەكشۈرۈلىدۇ.',
  },
];

const SHORTCUTS = [
  { keys: 'Ctrl + K', desc: 'تېز ئىزدەش ۋە بۇيرۇق تاختىسىنى ئېچىش' },
  { keys: 'Ctrl + Shift + G', desc: 'بىلىم تورى گرافىكى بىلەن تەھرىرلىگۈچ ئارىسىدا ئالمىشىش' },
  { keys: '[[', desc: 'تەھرىرلىگۈچتە باشقا خاتىرىگە تېز ئۇلانما قويۇش' },
  { keys: 'Ctrl + V', desc: 'رەسىمنى بىۋاسىتە خاتىرىگە چاپلاپ يەرلىكتە ساقلاش' },
  { keys: 'سوئال :: جاۋاب', desc: 'خاتىرىدىن ئاپتوماتىك ئەسلەش كارتىسى ياساش' },
];

export const AboutPage: React.FC<AboutPageProps> = ({
  noteCount,
  folderCount,
  attachmentCount,
  onStartWriting,
}) => {
  return (
    <div className="h-full overflow-y-auto px-6 sm:px-10 py-8" style={{ backgroundColor: 'var(--bg-canvas)' }}>
      <article dir="rtl" className="max-w-4xl mx-auto space-y-12 pb-16">
        {/* Editorial Intro */}
        <header className="space-y-4 pb-8 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <h1 className="text-3xl font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>
            تەپەككۇر بۇلىقى — بىز ھەققىدە ۋە تولۇق قوللانما
          </h1>
          <p className="uyghur-paragraph text-base leading-[1.9]" style={{ color: 'var(--text-secondary)' }}>
            «تەپەككۇر بۇلىقى» — ئۇيغۇر ئوقۇغۇچىلىرى، تەتقىقاتچىلىرى، يازغۇچىلىرى ۋە بىلىم خىزمەتچىلىرى ئۈچۈن مەخسۇس لايىھەلەنگەن، كومپيۇتېرنىڭ ئۆزىدە ساقلىنىپ مۇستەقىل ئىجرا بولىدىغان شەخسىي بىلىم ۋە خاتىرە باشقۇرۇش سىستېمىسىدۇر. مەقسىتىمىز — ئۇيغۇر تىلىنىڭ ئوڭدىن سولغا يېزىلىش ئالاھىدىلىكى، ئەنئەنىۋى مەتبەئە گۈزەللىكى ۋە زامانىۋى بىلىم تورى تېخنىكىسىنى بىرلەشتۈرۈپ، ھەر بىر كىشىنىڭ ئۆز قولىدا تولۇق كونترول قىلالايدىغان ساپ، تېز ۋە بىخەتەر «ئىككىنچى مېڭە» بەرپا قىلىشتۇر.
          </p>

          <div
            className="pt-2 flex items-center flex-wrap gap-x-3 gap-y-1 text-xs tabular-nums"
            style={{ color: 'var(--text-muted)' }}
          >
            <span>ئامبارىڭىزدا: {noteCount} خاتىرە</span>
            <span aria-hidden="true">·</span>
            <span>{folderCount} قىسقۇچ</span>
            <span aria-hidden="true">·</span>
            <span>{attachmentCount} يەرلىك ھۆججەت/رەسىم</span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={onStartWriting}
              className="font-medium hover:underline cursor-pointer"
              style={{ color: 'var(--accent-text)' }}
            >
              تەھرىرلىگۈچكە قايتىش
            </button>
          </div>
        </header>

        {/* Full Feature Explanation */}
        <section className="space-y-6">
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              01. دېتالنىڭ بارلىق ئىقتىدارلىرى
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              تۆۋەندە «تەپەككۇر بۇلىقى» ئىچىدىكى ھەر بىر مودۇلنىڭ رولى ۋە ئەمەلىي قوللىنىلىشى تەپسىلىي تونۇشتۇرۇلدى:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {FEATURES_LIST.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="p-5 rounded-xl border space-y-2.5"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {item.title}
                    </h3>
                  </div>
                  <p className="uyghur-paragraph text-xs leading-[1.85]" style={{ color: 'var(--text-secondary)' }}>
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Security, Privacy & Independence Principles */}
        <section
          className="p-6 rounded-xl border space-y-4"
          style={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 shrink-0" style={{ color: 'var(--success)' }} />
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              02. بىخەتەرلىك، مەخپىيەتلىك ۋە مۇستەقىللىق پرىنسىپلىرىمىز
            </h2>
          </div>

          <ul className="space-y-3 text-sm leading-[1.85]" style={{ color: 'var(--text-secondary)' }}>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>نۆل ئىز قوغلاش (Zero Telemetry):</strong> دېتال ئىچىدە گۇگول ئانالىتىكس ياكى ھېچقانداق تاشقى ئىستاتىستىكا كودى يوق. يازغان خاتىرىلىرىڭىز ۋە ئەكىرگەن PDF، Word، رەسىملىرىڭىز پەقەت ئۆز كومپيۇتېرىڭىزدا (IndexedDB ۋە يەرلىك ساقلىغۇچتا) ساقلىنىدۇ.
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>تاشقى CDN دىن خالىي مۇستەقىللىق:</strong> بارلىق خەت نۇسخىلىرى سىستېمىڭىزدىكى يەرلىك ئۇيغۇرچە فونتلارغا (<span className="font-code text-xs" dir="ltr">UKIJ Tuz, ALKATIP Basma, Uyghur Pashto</span>) تايىنىدۇ؛ ھېچقانداق خىتاي شىركىتىنىڭ API سى ياكى تاشقى CDN مۇلازىمىتى ئىشلىتىلمەيدۇ.
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>ھۆججەت ئىگىدارلىقى ۋە ئەركىنلىك:</strong> مەلۇماتلىرىڭىز ھېچقانداق يېپىق فورماتقا باغلىنىپ قالمايدۇ؛ خالىغان ۋاقىتتا ئۆلچەملىك Markdown، Word، TXT، PDF ياكى تولۇق JSON زاپاسى قىلىپ ئۆز قولىڭىزغا ئالالايسىز.
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>مىللىي ئاتالغۇ ۋە ئىلمىي ئەخلاق:</strong> بارلىق كۆرۈنمە يۈز، قېلىپ ۋە قوللانمىلار ساپ، توغرا ئۇيغۇر تىلى، شەرقىي تۈركىستان خەلقىنىڭ قەدىر-قىممىتى ۋە ئىلمىي ئەخلاق مىزانلىرىغا ئۇيغۇن تەييارلانغان.
            </li>
          </ul>
        </section>

        {/* Keyboard Shortcuts Reference */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            03. تېز كۇنۇپكا ۋە يېزىش بەلگىلىرى
          </h2>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface)' }}>
                  <th className="px-4 py-3 font-semibold border-b" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                    كۇنۇپكا / بەلگە
                  </th>
                  <th className="px-4 py-3 font-semibold border-b" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                    ئىقتىدارى
                  </th>
                </tr>
              </thead>
              <tbody>
                {SHORTCUTS.map((s) => (
                  <tr key={s.keys} className="border-b last:border-b-0" style={{ borderColor: 'var(--border-subtle)' }}>
                    <td className="px-4 py-3 font-code tabular-nums" dir="ltr" style={{ color: 'var(--accent-text)', textAlign: 'right' }}>
                      {s.keys}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                      {s.desc}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Large Centered Logo Showcase at the Bottom */}
        <footer
          className="pt-12 pb-6 border-t flex flex-col items-center justify-center text-center gap-5"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div
            className="p-3 rounded-2xl border shadow-lg"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-strong)' }}
          >
            <BrandLogo size={192} className="rounded-xl" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              تەپەككۇر بۇلىقى
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              بىلىمنى باغلاڭ، تەپەككۇرنى مەڭگۈلۈك ساقلاڭ.
            </p>
            <p className="text-xs pt-1" style={{ color: 'var(--text-muted)' }}>
              يەرلىك، بىخەتەر ۋە مۇستەقىل ئۇيغۇرچە بىلىم ئامبىرى
            </p>
          </div>
        </footer>
      </article>
    </div>
  );
};
