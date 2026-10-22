import { useState, type ComponentType } from 'react'
import { CloudUpload, Keyboard, Languages, Settings2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { sendNavigateBack } from '@/hooks/ipc/window'
import { AutoLaunch } from './components/AutoLaunch'
import { BaiduTranslate } from './components/BaiduTranslate'
import { ShortCut } from './components/ShortCut'
import { SpotlightShortcut } from './components/SpotlightShortcut'
import { Separator } from './components/Separator'
import { UpyunSettings } from './components/Upyun'

type TSectionId = 'general' | 'shortcuts' | 'translate' | 'imageHost'

type TSection = {
	id: TSectionId
	label: string
	icon: ComponentType<{ className?: string }>
	title: string
	description: string
}

const SECTIONS: TSection[] = [
	{
		id: 'general',
		label: '通用',
		icon: Settings2,
		title: '通用',
		description: '启动方式与基础行为',
	},
	{
		id: 'shortcuts',
		label: '快捷键',
		icon: Keyboard,
		title: '快捷键',
		description: '唤起 SnowTools、截屏，以及系统 ⌘Space',
	},
	{
		id: 'translate',
		label: '翻译',
		icon: Languages,
		title: '翻译',
		description: '配置百度翻译，桌面端直接调用',
	},
	{
		id: 'imageHost',
		label: '图床',
		icon: CloudUpload,
		title: '图床',
		description: '配置又拍云，上传图片后直接复制链接',
	},
]

export function SystemSetting() {
	const isMac = navigator.platform.includes('Mac')
	const [activeSection, setActiveSection] =
		useState<TSectionId>('general')
	const section =
		SECTIONS.find(item => item.id === activeSection) ?? SECTIONS[0]

	return (
		<div className="flex h-screen w-screen flex-col bg-slate-50 text-slate-800">
			<header className="app-drag flex shrink-0 select-none items-center justify-between border-b border-slate-200 bg-white px-5 py-3.5">
				<div>
					<h1 className="text-lg font-semibold">系统设置</h1>
					<p className="mt-0.5 text-xs text-slate-500">
						管理启动、快捷键与翻译
					</p>
				</div>
				<Button
					variant="ghost"
					size="icon"
					className="app-no-drag size-8 text-slate-400"
					title="关闭"
					onClick={() => sendNavigateBack()}
				>
					<X className="size-4" />
				</Button>
			</header>

			<div className="flex min-h-0 flex-1">
				<aside className="w-[190px] shrink-0 border-r border-slate-200 bg-slate-50/70 p-3">
					<nav className="space-y-1">
						{SECTIONS.map(item => {
							const Icon = item.icon
							const active = item.id === activeSection

							return (
								<button
									key={item.id}
									type="button"
									className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
										active
											? 'bg-white font-medium text-slate-900 shadow-sm ring-1 ring-slate-200'
											: 'text-slate-500 hover:bg-white/70 hover:text-slate-700'
									}`}
									onClick={() => setActiveSection(item.id)}
								>
									<Icon
										className={`size-4 ${
											active
												? 'text-blue-500'
												: 'text-slate-400'
										}`}
									/>
									{item.label}
								</button>
							)
						})}
					</nav>
				</aside>

				<main className="min-w-0 flex-1 overflow-y-auto px-6 py-5">
					<div className="mx-auto max-w-[620px]">
						<div className="mb-4">
							<h2 className="text-base font-semibold text-slate-800">
								{section.title}
							</h2>
							<p className="mt-0.5 text-xs text-slate-500">
								{section.description}
							</p>
						</div>

						{activeSection === 'general' && (
							<section className="rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
								<AutoLaunch />
							</section>
						)}

						{activeSection === 'shortcuts' && (
							<section className="rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
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
						)}

						{activeSection === 'translate' && (
							<section className="rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
								<BaiduTranslate />
							</section>
						)}

						{activeSection === 'imageHost' && (
							<section className="rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
								<UpyunSettings />
							</section>
						)}
					</div>
				</main>
			</div>

			<footer className="shrink-0 border-t border-slate-200 bg-white px-5 py-2 text-[11px] text-slate-400">
				快捷键即时保存，翻译配置点击保存后生效
			</footer>
		</div>
	)
}
