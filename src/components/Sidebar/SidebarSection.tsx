import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type SidebarSectionProps = {
  title: string;
  actionIcon: LucideIcon;
  children: ReactNode;
};

export function SidebarSection({ title, actionIcon: ActionIcon, children }: SidebarSectionProps) {
  return (
    <section className="sidebar-section">
      <button className="sidebar-section-header" type="button" onClick={() => {}}>
        <span>{title}</span>
        <ActionIcon size={16} strokeWidth={1.6} />
      </button>
      <div className="sidebar-nav">{children}</div>
    </section>
  );
}
