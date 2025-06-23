export function Separator({ className = '' }: { className?: string }) {
	return (
		<div className={`h-[1px] w-full bg-border ${className}`} role="separator" />
	)
}
