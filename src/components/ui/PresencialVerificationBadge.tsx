import { cn } from '../../lib/utils';
import { VerificationBadgePremium } from './VerificationBadgePremium';

type PresencialVerificationBadgeSize = 'sm' | 'md' | 'lg';

type PresencialVerificationBadgeProps = {
	className?: string;
	size?: PresencialVerificationBadgeSize;
};


const SIZE_CLASS_NAMES: Record<PresencialVerificationBadgeSize, string> = {
	sm: '',
	md: '',
	lg: '',
};

export const PresencialVerificationBadge = ({ className, size = 'md' }: PresencialVerificationBadgeProps) => {
	const mappedSize = size === 'sm' ? 'sm' : 'md';

	return (
		<VerificationBadgePremium
			size={mappedSize}
			className={cn(SIZE_CLASS_NAMES[size], className)}
		/>
	);
};

export default PresencialVerificationBadge;