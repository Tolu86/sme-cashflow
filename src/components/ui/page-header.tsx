interface PageHeaderProps {
  title: string;
  description?: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-emerald-100/80 bg-gradient-to-r from-white via-[#f8fbff] to-[#eaf8f1] px-5 py-6 shadow-sm sm:px-8 sm:py-8">
      <div className="pointer-events-none absolute -right-14 -top-24 h-48 w-48 rounded-full bg-emerald-200/35 blur-3xl" />
      <div className="relative">
        <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00c076]" />
          Financial workspace
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>}
      </div>
    </div>
  );
}
