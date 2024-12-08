import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

type TProps = {
	show: boolean
	onClose: () => void
}

export function Setting({ show, onClose }: TProps) {
	return (
		<Dialog
			open={show}
			defaultOpen
			onOpenChange={status => {
				if (status === false) {
					onClose()
				}
			}}
		>
			<DialogContent className=" max-w-full max-h-full h-full">
				<DialogHeader>
					<DialogTitle>Edit profile</DialogTitle>
					<DialogDescription>
						Make changes to your profile here. Click save when you're done.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<div className="grid grid-cols-4 items-center gap-4">
						{/* <Label htmlFor="name" className="text-right">
					Name
				</Label> */}
						<Input
							id="name"
							defaultValue="Pedro Duarte"
							className="col-span-3"
						/>
					</div>
					<div className="grid grid-cols-4 items-center gap-4">
						{/* <Label htmlFor="username" className="text-right">
					Username
				</Label> */}
						<Input
							id="username"
							defaultValue="@peduarte"
							className="col-span-3"
						/>
					</div>
				</div>
				<DialogFooter>
					<Button type="submit">Save changes</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
