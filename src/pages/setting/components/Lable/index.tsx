export function Label({
	htmlFor,
	children,
	className = '',
}: {
	htmlFor?: string
	children: React.ReactNode
	className?: string
}) {
	return (
		<label
			htmlFor={htmlFor}
			className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
		>
			{children}
		</label>
	)
}
