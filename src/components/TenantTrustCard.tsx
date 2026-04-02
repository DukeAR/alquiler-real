import { Icons } from './Icons';

export const TenantTrustCard = ({ tenant }: { tenant: any }) => {
    return (
        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center">
                        <Icons.User className="w-5 h-5 text-brand" />
                    </div>
                    <div>
                        <p className="font-bold text-sm">{tenant.name}</p>
                        {/* Usamos "Verificado" solo para referirnos a la identidad, no a la persona */}
                        <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                            {tenant.identityVerified ? (
                                <span className="text-blue-600 flex items-center gap-1">
                                    <Icons.ShieldCheck className="w-3 h-3" />
                                    Identidad verificada
                                </span>
                            ) : (
                                <span className="text-slate-400">
                                    Identidad no verificada
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Mostramos datos duros, no adjetivos */}
                <div className="text-right">
                    <div className="flex items-center gap-1 text-sm font-bold text-slate-900">
                        <Icons.Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        {tenant.rating || 'Sin dato'}
                    </div>
                    <p className="text-[10px] text-slate-500">{tenant.stays || 0} estadías previas</p>
                </div>
            </div>

            {/* Disclaimer legal educativo */}
            {!tenant.identityVerified && (
                <div className="text-[11px] bg-slate-100 text-slate-600 p-2 rounded-lg flex items-start gap-2">
                    <Icons.Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                        El usuario no ha completado el proceso de validación de identidad.
                        La decisión de alojar es responsabilidad exclusiva del anfitrión.
                    </span>
                </div>
            )}
        </div>
    );
};
