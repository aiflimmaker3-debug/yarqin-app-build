import React, { useState } from 'react';
import { Check, Copy, Download, MonitorDown, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';
import { BrandLogo } from './BrandLogo';

interface PWAInstallButtonProps {
  onInstalled?: () => void;
}

const SETUP_COMMANDS = `npm install
npm install -D electron electron-builder
npm run dist:win`;

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ onInstalled }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Suppress button when already running as installed standalone PWA or Electron desktop app
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted && onInstalled) {
        onInstalled();
      }
      return;
    }
    setShowGuideModal(true);
  };

  const handleCopyCommands = async () => {
    try {
      await navigator.clipboard.writeText(SETUP_COMMANDS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard might be restricted in sandboxed contexts
    }
  };

  return (
    <>
      <button
        type="button"
        title="كومپيۇتېر ياكى تېلېفونغا ئۈستەلئۈستى پىروگراممىسى قىلىپ قاچىلاش"
        onClick={() => void handleClick()}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium hover:bg-[var(--bg-hover)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
        style={{
          backgroundColor: isInstallable ? 'var(--accent-soft)' : 'var(--bg-surface)',
          borderColor: isInstallable ? 'var(--accent)' : 'var(--border-subtle)',
          color: isInstallable ? 'var(--accent-text)' : 'var(--text-secondary)',
        }}
      >
        <MonitorDown className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden xl:inline">{isInstallable ? 'پىروگرامما قاچىلاش' : 'ئۈستەلئۈستى'}</span>
      </button>

      {showGuideModal && (
        <div
          dir="rtl"
          className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]"
          onClick={() => setShowGuideModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl border shadow-2xl overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-primary)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              className="px-5 py-4 border-b flex items-center justify-between gap-3"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="flex items-center gap-2.5">
                <BrandLogo size={28} />
                <div>
                  <h3 className="text-sm font-bold">ئۈستەلئۈستى پىروگراممىسى قىلىپ قاچىلاش</h3>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    تورسىز (Offline) ئىشلەيدىغان مۇستەقىل نۇسخا — PWA ۋە Windows Setup.exe
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 text-xs leading-relaxed">
              {isIOS ? (
                <div
                  className="p-3.5 rounded-lg border space-y-2"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                >
                  <div className="font-semibold flex items-center gap-1.5">
                    <Download className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                    <span>iPhone / iPad غا قاچىلاش (Safari)</span>
                  </div>
                  <ol className="list-decimal pr-5 space-y-1" style={{ color: 'var(--text-secondary)' }}>
                    <li>Safari ئاستىدىكى <strong>ھەمبەھىرلەش (Share)</strong> كۇنۇپكىسىنى بېسىڭ.</li>
                    <li>تىزىملىكتىن <strong>باش ئېكرانغا قوشۇش (Add to Home Screen)</strong> نى تاللاڭ.</li>
                    <li>شۇنىڭ بىلەن «تەپەككۇر بۇلىقى» مۇستەقىل پىروگرامما بولۇپ قاچىلىنىدۇ.</li>
                  </ol>
                </div>
              ) : (
                <div
                  className="p-3.5 rounded-lg border space-y-2"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                >
                  <div className="font-semibold flex items-center gap-1.5">
                    <MonitorDown className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                    <span>1-ئۇسۇل: بىر چېكىپ ئۈستەلئۈستىگە قاچىلاش (PWA)</span>
                  </div>
                  <p className="uyghur-paragraph" style={{ color: 'var(--text-secondary)' }}>
                    بۇ پىروگراممىنى Chrome ياكى Edge تور كۆرگۈچىدە مۇستەقىل بەتكۈچتە ئېچىپ، ئادرېس بالدىقىنىڭ ئوڭ تەرىپىدىكى <strong>«قاچىلاش»</strong> بەلگىسىنى (ياكى يۇقىرىدىكى «پىروگرامما قاچىلاش» كۇنۇپكىسىنى) باسسىڭىزلا، Windows / macOS ئۈستەلئۈستىگە مۇستەقىل كۆزنەكلىك ۋە تورسىز ئىشلەيدىغان پىروگرامما بولۇپ قاچىلىنىدۇ.
                  </p>
                </div>
              )}

              <div
                className="p-3.5 rounded-lg border space-y-2.5"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Download className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                    <span>2-ئۇسۇل: رەسمىي Windows Setup.exe ھاسىل قىلىش</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleCopyCommands()}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] hover:bg-[var(--bg-hover)] cursor-pointer"
                    style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
                  >
                    {copied ? <Check className="w-3 h-3" style={{ color: 'var(--success)' }} /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'كۆچۈرۈلدى' : 'بۇيرۇقنى كۆچۈرۈش'}</span>
                  </button>
                </div>
                <p style={{ color: 'var(--text-secondary)' }}>
                  بارلىق Electron ۋە NSIS قاچىلاش سەپلىمىلىرى تەييارلاندى. تۈر كودىنى كومپيۇتېرىڭىزغا چۈشۈرۈپ تېرمىنالدا تۆۋەندىكى بۇيرۇقلارنى ئىجرا قىلسىڭىز،{' '}
                  <span className="font-code" dir="ltr">
                    release/Tepekkur-Buliqi-Setup-1.0.0.exe
                  </span>{' '}
                  قاچىلاش ھۆججىتى ھاسىل بولىدۇ:
                </p>
                <pre
                  dir="ltr"
                  className="font-code text-[11px] p-3 rounded-lg border overflow-x-auto leading-relaxed"
                  style={{
                    backgroundColor: 'var(--bg-canvas)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {SETUP_COMMANDS}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              className="px-5 py-3 border-t flex justify-end"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
              >
                چۈشەندىم
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="no-print fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-medium shadow-lg"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        borderColor: 'var(--accent)',
        color: 'var(--text-primary)',
      }}
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
      <span>تورسىز ھالەت — بارلىق يەرلىك خاتىرىلەر نورمال ئىشلەۋاتىدۇ</span>
    </div>
  );
};
