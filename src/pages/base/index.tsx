const url = import.meta.env.VITE_APP_API_BASE_URL
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export function Base() {
	return (
		<>
			<div className=" text-red-400">hello base {url}</div>
			<Button disabled>
				<Loader2 className="animate-spin" />
				Please wait
			</Button>
		</>
	)
}
