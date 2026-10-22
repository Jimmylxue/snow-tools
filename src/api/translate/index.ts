import {
	UndefinedInitialDataOptions,
	useMutation,
	UseMutationOptions,
	useQuery,
} from '@tanstack/react-query'
import { translateText } from '@/hooks/ipc/translate'
import { TBaiduFanyi, TRequestParams } from './type'

export const useTranslate = (
	config?: Omit<
		UndefinedInitialDataOptions<TBaiduFanyi, Error>,
		'queryFn'
	> & { params: TRequestParams }
) => {
	return useQuery<TBaiduFanyi, Error>({
		...config,
		queryFn: async () => {
			return await translateText(config!.params)
		},
		queryKey: config!.queryKey,
	})
}

export const useTranslateV2 = (
	config?: UseMutationOptions<TBaiduFanyi, Error, TRequestParams>
) => {
	return useMutation<TBaiduFanyi, Error, TRequestParams>({
		mutationFn: translateText,
		...config,
	})
}
