const url = import.meta.env.VITE_APP_API_BASE_URL

export function Base() {
	return <div className=" text-red-400">hello base {url}</div>
}
