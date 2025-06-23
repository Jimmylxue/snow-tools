import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from './components/Separator'
import { StartShortCut } from './components/ShortCut'

type TProps = {
	show: boolean
	onClose: () => void
}

export function SystemSetting({ show, onClose }: TProps) {
	return (
		<div>
			<Dialog
				open={show}
				onOpenChange={status => {
					if (status === false) {
						onClose()
					}
				}}
			>
				<DialogContent className="max-w-full h-full overflow-y-auto">
					<DialogHeader>
						<DialogTitle>系统设置</DialogTitle>
						<DialogDescription>根据您的偏好自定义软件行为</DialogDescription>
					</DialogHeader>

					<div className="space-y-6">
						{/* 快捷启动设置部分 */}
						<div className="space-y-4">
							<h3 className="text-lg font-medium">快捷启动</h3>
							<Separator />

							<StartShortCut label="启动指令" shortCutUUKey="OPEN" />

							<StartShortCut label="截屏" shortCutUUKey="CAPTURER" />

							{/* <div className="space-y-3">
								<div className=" flex items-center">
									<Label htmlFor="shortcut" className="text-right w-[80px]">
										截屏
									</Label>
									<div className="flex items-center gap-2 ml-4">
										{isListening ? (
											<>
												<Input
													id="shortcut"
													value={tempShortcut || '请按下快捷键...'}
													readOnly
													className="flex-1"
												/>
												<Button variant="outline" onClick={cancelEditing}>
													取消
												</Button>
												<Button onClick={saveShortcut}>确认</Button>
											</>
										) : (
											<>
												<Input
													id="shortcut"
													value={shortcut}
													readOnly
													className="flex-1"
												/>
												<Button onClick={startListening}>修改</Button>
											</>
										)}
									</div>
								</div>

								<div className="text-sm text-muted-foreground ml-[80px]">
									<div className=" ml-4">
										{isListening
											? '请按下您想要的快捷键组合'
											: `当前快捷键: ${shortcut}`}
									</div>
								</div>
							</div> */}
						</div>

						{/* 其他设置部分 */}
						{/* <div className="space-y-4">
							<h3 className="text-lg font-medium">通用设置</h3>
							<Separator />

							<div className="grid grid-cols-4 items-center gap-4">
								<Label htmlFor="name" className="text-right">
									名称
								</Label>
								<Input
									id="name"
									defaultValue="Pedro Duarte"
									className="col-span-3"
								/>
							</div>

							<div className="grid grid-cols-4 items-center gap-4">
								<Label htmlFor="username" className="text-right">
									用户名
								</Label>
								<Input
									id="username"
									defaultValue="@peduarte"
									className="col-span-3"
								/>
							</div>
						</div> */}
					</div>

					{/* <div className="mt-6 flex justify-end">
						<Button type="submit">保存设置</Button>
					</div> */}
				</DialogContent>
			</Dialog>
		</div>
	)
}
