interface PageHeaderProps {
  title: string;
  description?: string;
}

export function PageHeader({
  title,
  description,
}: PageHeaderProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
        {title}
      </h1>

      {description && (
        <p className="text-sm text-zinc-500 dark:text-zinc-300">
          {description}
        </p>
      )}
    </div>
  );
}