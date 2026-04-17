import { cn } from '../../lib/utils';

type PropertyVerificationChecklistItem = {
  key: string;
  label: string;
  status: 'complete' | 'pending';
};

type PropertyVerificationChecklistSize = 'sm' | 'md';

type PropertyVerificationChecklistProps = {
  items: PropertyVerificationChecklistItem[];
  className?: string;
  size?: PropertyVerificationChecklistSize;
  columns?: 1 | 2;
};

const sizeClasses: Record<PropertyVerificationChecklistSize, {
  list: string;
  item: string;
  icon: string;
  label: string;
}> = {
  sm: {
    list: 'gap-1.5',
    item: 'rounded-[14px] px-2.5 py-2',
    icon: 'text-[11px]',
    label: 'text-[12px] leading-5',
  },
  md: {
    list: 'gap-2',
    item: 'rounded-[16px] px-3 py-2.5',
    icon: 'text-[12px]',
    label: 'text-sm leading-5',
  },
};

export const PropertyVerificationChecklist = ({
  items,
  className,
  size = 'sm',
  columns = 2,
}: PropertyVerificationChecklistProps) => {
  const scale = sizeClasses[size];

  return (
    <ul
      className={cn(
        'grid',
        scale.list,
        columns === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1',
        className,
      )}
    >
      {items.map((item) => {
        const complete = item.status === 'complete';

        return (
          <li
            key={item.key}
            className={cn(
              'flex items-start gap-2 border',
              scale.item,
              complete
                ? 'border-emerald-200/80 bg-emerald-50/80 text-emerald-900'
                : 'border-amber-200/80 bg-amber-50/80 text-slate-800',
            )}
          >
            <span className={cn('pt-0.5 font-semibold', scale.icon, complete ? 'text-emerald-700' : 'text-amber-700')}>
              {complete ? '✔' : '⚠'}
            </span>
            <span className={cn('font-medium', scale.label)}>{item.label}</span>
          </li>
        );
      })}
    </ul>
  );
};

export default PropertyVerificationChecklist;