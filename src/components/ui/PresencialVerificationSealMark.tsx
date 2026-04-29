import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '../../lib/utils';

export const PRESENCIAL_VERIFICATION_SEAL_SRC = '/verified-presencial-circular.png';

type PresencialVerificationSealMarkProps = Omit<ComponentPropsWithoutRef<'img'>, 'src'>;

export const PresencialVerificationSealMark = ({
  alt = 'Verificado presencialmente',
  className,
  draggable = false,
  ...props
}: PresencialVerificationSealMarkProps) => (
  <img
    {...props}
    src={PRESENCIAL_VERIFICATION_SEAL_SRC}
    alt={alt}
    draggable={draggable}
    className={cn('object-contain', className)}
  />
);

export default PresencialVerificationSealMark;
