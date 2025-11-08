import { useMutation, UseMutationOptions } from '@tanstack/react-query'
import { ClientError } from '..'
import { wslPost } from '../wsl'

export const useUploadStaticImage = (
	config?: UseMutationOptions<string, ClientError, FormData>
) => {
	return useMutation<string, ClientError, FormData>({
		mutationFn: async data => {
			return await wslPost('static/uploadfile', data)
		},
		...config,
	})
}
