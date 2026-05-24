import { forwardRef } from 'react';
import type { ReactNode } from 'react';

type SidebarItemProps = {
  icon: ReactNode;
  label: string;
  active?: boolean;
  isActive?: boolean;
  onClick?: () => void;
};

export const SidebarItem = forwardRef<HTMLDivElement, SidebarItemProps>(function SidebarItem(
  { icon, label, active = false, isActive = false, onClick = () => {} },
  ref,
) {
  const itemActive = active || isActive;

  return (
    <div ref={ref} className={itemActive ? 'sidebar-item is-active' : 'sidebar-item'} onClick={onClick} style={{ cursor: 'pointer' }}>
      {icon}
      <span>{label}</span>
    </div>
  );
});
