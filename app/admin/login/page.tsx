import { AdminLoginForm } from '@/src/components/admin/AdminLoginForm';

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-20 text-slate-50">
      <div className="mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-6xl items-center justify-center rounded-[32px] border border-slate-800 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_30%),linear-gradient(180deg,_rgba(15,23,42,0.96),_rgba(2,6,23,0.98))] p-8 shadow-[0_0_60px_rgba(2,6,23,0.45)] lg:justify-between lg:p-12">
        <div className="hidden max-w-xl space-y-4 lg:block">
          <p className="text-xs font-semibold tracking-[0.3em] text-sky-300">运营管理后台</p>
          <h1 className="text-5xl font-semibold leading-tight text-slate-50">
            集中处理内容审核、资源调度与挑战配置。
          </h1>
          <p className="max-w-lg text-sm leading-7 text-slate-300">
            登录后即可进入后台，统一管理 AI 素材、真实照片资源池与实时题目参数，确保运营流程稳定可控。
          </p>
        </div>
        <AdminLoginForm />
      </div>
    </main>
  );
}
