import type { RefObject } from 'react';

type UploadDrawerProps = {
  aiInputRef?: RefObject<HTMLInputElement>;
  audioInputRef?: RefObject<HTMLInputElement>;
  onUploadAi?: (file: File) => void;
  onUploadAudio?: (file: File) => void;
  onUploadReal?: (file: File) => void;
  realInputRef?: RefObject<HTMLInputElement>;
};

type UploadControlProps = {
  accept: string;
  inputRef?: RefObject<HTMLInputElement>;
  label: string;
  onUpload?: (file: File) => void;
};

function UploadControl({ accept, inputRef, label, onUpload }: UploadControlProps) {
  return (
    <label
      className="block cursor-pointer rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4 text-left text-sm text-slate-200 transition hover:border-slate-600"
      role="button"
      tabIndex={0}
    >
      <input
        accept={accept}
        aria-label={label}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file) {
            onUpload?.(file);
            event.target.value = '';
          }
        }}
        ref={inputRef}
        type="file"
      />
      <span>{label}</span>
    </label>
  );
}

export function UploadDrawer({
  aiInputRef,
  audioInputRef,
  onUploadAi,
  onUploadAudio,
  onUploadReal,
  realInputRef,
}: UploadDrawerProps) {
  return (
    <aside className="rounded-[28px] border border-slate-800 bg-slate-900/70 p-5" id="admin-upload-drawer">
      <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-50">上传图片</h2>
          <p className="mt-1 text-sm text-slate-400">上传队列保持常驻，方便运营人员快速补充题库素材。</p>
        </div>
        <span className="rounded-full border border-slate-800 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-500">
          上传队列
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <UploadControl accept="image/jpeg,image/png,image/webp" inputRef={aiInputRef} label="上传 AI 图片" onUpload={onUploadAi} />
        <UploadControl accept="image/jpeg,image/png,image/webp" inputRef={realInputRef} label="上传真人图片" onUpload={onUploadReal} />
        <UploadControl accept="audio/mpeg,audio/ogg,audio/wav,audio/x-wav" inputRef={audioInputRef} label="上传音频素材" onUpload={onUploadAudio} />
      </div>
    </aside>
  );
}
