import {
	UndefinedInitialDataOptions,
	useMutation,
	UseMutationOptions,
	useQuery,
} from '@tanstack/react-query'
import { ClientError, post } from '..'
import { TBaiduFanyi, TRequestParams } from './type'

export const useTranslate = (
	config?: Omit<
		UndefinedInitialDataOptions<TBaiduFanyi, ClientError>,
		'queryFn'
	> & { params: TRequestParams }
) => {
	return useQuery<TBaiduFanyi, ClientError>({
		...config,
		queryFn: async () => {
			return await post('translate/base', { ...config?.params })
		},
		queryKey: config!.queryKey,
	})
}

export const useTranslateV2 = (
	config?: UseMutationOptions<TBaiduFanyi, ClientError, TRequestParams>
) => {
	return useMutation<TBaiduFanyi, ClientError, TRequestParams>({
		mutationFn: async data => {
			const response: any = await post('translate/base', data)
			return response
		},
		...config,
	})
}
