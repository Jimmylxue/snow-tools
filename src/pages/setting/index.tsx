import { Keyboard, Power, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { sendNavigateBack } from '@/hooks/ipc/window'
import { AutoLaunch } from './components/AutoLaunch'
import { ShortCut } from './components/ShortCut'
import { SpotlightShortcut } from './components/SpotlightShortcut'
import { Separator } from './components/Separator'

export function SystemSetting() {
	const isMac = navigator.platform.includes('Mac')

	return (
		<div className="flex h-screen w-screen flex-col bg-slate-50 text-slate-800">
			<header className="flex items-start justify-between border-b border-slate-200 bg-white px-6 py-4">
				<div>
					<h1 className="text-lg font-semibold">系统设置</h1>
					<p className="mt-0.5 text-xs text-slate-500">
						快捷键与启动行为
					</p>
				</div>
				<Button
					variant="ghost"
					size="icon"
					className="size-8 text-slate-400"
					title="关闭"
					onClick={() => sendNavigateBack()}
				>
					<X className="size-4" />
				</Button>
			</header>

			<div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
				<section className="rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
					<div className="flex items-center gap-2 border-b border-slate-100 py-2.5">
						<Power className="size-4 text-blue-500" />
						<h2 className="text-sm font-semibold">启动与运行</h2>
					</div>
					<AutoLaunch />
				</section>

				<section className="rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
					<div className="flex items-center gap-2 border-b border-slate-100 py-2.5">
						<Keyboard className="size-4 text-blue-500" />
						<h2 className="text-sm font-semibold">全局快捷键</h2>
					</div>
					<ShortCut
						label="启动指令"
						description="在任何应用里唤起 SnowTools"
						shortCutUUKey="OPEN"
					/>
					<Separator />
					<ShortCut
						label="截屏"
						description="直接进入区域截屏"
						shortCutUUKey="CAPTURER"
					/>
					{isMac && (
						<>
							<Separator />
							<SpotlightShortcut />
						</>
					)}
				</section>
			</div>

			<footer className="border-t border-slate-200 bg-white px-6 py-2.5 text-[11px] text-slate-400">
				设置修改后会立即保存
			</footer>
		</div>
	)
}
