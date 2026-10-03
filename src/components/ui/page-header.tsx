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
      <h1
  className="text-2xl font-bold"
  style={{ color: "var(--foreground)" }}
>
  {title}
</h1>

      {description && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {description}
        </p>
      )}
    </div>
  );
}