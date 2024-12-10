import { TShortEn } from '@/api/translate/type'
import { createContext, ReactNode, useContext } from 'react'
import { useLocalStorageState } from 'ahooks'

type TTranslateContext = {
	from: TShortEn
	to: TShortEn
	updateFrom?: (lang: TShortEn) => void
	updateTo?: (lang: TShortEn) => void
}

const TranslateContext = createContext<TTranslateContext>({
	from: 'zh',
	to: 'en',
})

export const TranslateContextProvider = ({
	children,
}: {
	children: ReactNode
}) => {
	const [translateState, setTranslateState] =
		useLocalStorageState<TTranslateContext>('translateConfig', {
			defaultValue: {
				from: 'auto',
				to: 'en',
			},
		})

	const updateFrom = (lang: TShortEn) => {
		setTranslateState({ ...translateState!, from: lang })
	}

	const updateTo = (lang: TShortEn) => {
		setTranslateState({ ...translateState!, to: lang })
	}

	return (
		<TranslateContext.Provider
			value={{
				...translateState!,
				updateFrom,
				updateTo,
			}}
		>
			{children}
		</TranslateContext.Provider>
	)
}

export function useTranslateConfig() {
	return useContext(TranslateContext)
}
