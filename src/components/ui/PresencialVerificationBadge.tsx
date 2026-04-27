import React from 'react';

import { cn } from '../../lib/utils';

type PresencialVerificationBadgeSize = 'sm' | 'md' | 'lg';

type PresencialVerificationBadgeProps = {
	className?: string;
	size?: PresencialVerificationBadgeSize;
};


const SIZE_CLASS_NAMES: Record<PresencialVerificationBadgeSize, string> = {
	sm: 'h-10 md:h-11',
	md: 'h-11 md:h-12',
	lg: 'h-14 md:h-16',
};

export const PresencialVerificationBadge = ({ className, size = 'md' }: PresencialVerificationBadgeProps) => {
	return (
		<div className={cn('flex items-center gap-2 rounded-full border border-white/40 bg-white/90 px-3 py-2 shadow-md backdrop-blur-md', className)}>
			<img
				src="/verified-presencial-badge.png"
				alt="Verificado presencialmente"
				className={cn('w-auto shrink-0 object-contain', SIZE_CLASS_NAMES[size])}
			/>
		</div>
	);
};

export default PresencialVerificationBadge;