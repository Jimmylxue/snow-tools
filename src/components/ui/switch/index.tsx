type TProps = {
	checked: boolean
	disabled?: boolean
	label?: string
	onChange: (checked: boolean) => void
}

export function Switch({ checked, disabled, label, onChange }: TProps) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={label}
			disabled={disabled}
			onClick={() => onChange(!checked)}
			className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
				checked ? 'bg-blue-500' : 'bg-slate-300'
			}`}
		>
			<span
				className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
					checked ? 'translate-x-[18px]' : 'translate-x-0.5'
				}`}
			/>
		</button>
	)
}
