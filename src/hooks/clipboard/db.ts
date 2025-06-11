import { TCopyItem } from 'electron/biz/clipboard/type'

interface ClipboardItem {
	id: number
	content: TCopyItem
	timestamp: number
}

const DB_NAME = 'clipboardDB'
const STORE_NAME = 'clipboardItems'
const INDEX_NAME = 'timestamp_idx' // 统一定义索引名
let dbInstance: IDBDatabase | null = null

// 统一数据库版本号，升级时修改此版本号
const DB_VERSION = 2

export async function getDB(): Promise<IDBDatabase> {
	if (dbInstance) return dbInstance

	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION)

		request.onupgradeneeded = e => {
			const db = (e.target as IDBOpenDBRequest).result
			const tx = (e.target as IDBOpenDBRequest).transaction

			// 创建或升级对象存储
			let store: IDBObjectStore
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				store = db.createObjectStore(STORE_NAME, {
					keyPath: 'id',
					autoIncrement: true,
				})
			} else {
				store = tx.objectStore(STORE_NAME)
			}

			// 确保索引存在
			if (!store.indexNames.contains(INDEX_NAME)) {
				store.createIndex(INDEX_NAME, 'timestamp')
			}
		}

		request.onsuccess = e => {
			dbInstance = (e.target as IDBOpenDBRequest).result
			dbInstance.onclose = () => {
				dbInstance = null
			}
			resolve(dbInstance)
		}

		request.onerror = e => {
			reject((e.target as IDBOpenDBRequest).error)
		}
	})
}

/**
 * 存 剪切板
 */
export async function saveClipboardItem(content: TCopyItem) {
	try {
		const db = await getDB()
		return new Promise((resolve, reject) => {
			console.log('add 了', content)
			const tx = db.transaction(STORE_NAME, 'readwrite')
			tx.objectStore(STORE_NAME).add({
				content,
				timestamp: Date.now(),
			})
			tx.oncomplete = () => resolve(true)
			tx.onerror = e => reject((e.target as IDBRequest).error)
		})
	} catch (err) {
		console.error('保存失败:', err)
		return false
	}
}

/**
 * 获取分页剪切板数据（修复版）
 */
export async function getClipboardList(params: {
	page: number
	pageSize: number
}): Promise<{ data: ClipboardItem[]; total: number }> {
	const db = await getDB()

	return new Promise((resolve, reject) => {
		// 使用单个事务处理计数和查询
		const tx = db.transaction(STORE_NAME, 'readonly')
		const store = tx.objectStore(STORE_NAME)

		// 1. 获取总数
		const countRequest = store.count()

		countRequest.onsuccess = () => {
			const total = countRequest.result
			const data: ClipboardItem[] = []

			// 2. 获取分页数据
			const index = store.index(INDEX_NAME) // 使用统一定义的索引名
			const cursorRequest = index.openCursor(null, 'prev')

			let skipped = false
			let itemsCollected = 0
			const skipCount = (params.page - 1) * params.pageSize

			cursorRequest.onsuccess = e => {
				const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result

				if (!cursor) {
					resolve({ data, total })
					return
				}

				// 跳过前面页的数据
				if (!skipped && skipCount > 0) {
					skipped = true
					cursor.advance(skipCount)
					return
				}

				// 收集当前页数据
				if (itemsCollected < params.pageSize) {
					data.push(cursor.value)
					itemsCollected++
					cursor.continue()
				} else {
					resolve({ data, total })
				}
			}

			cursorRequest.onerror = () => {
				reject(new Error('Failed to read data with cursor'))
			}
		}

		countRequest.onerror = () => {
			reject(new Error('Failed to count records'))
		}

		tx.onerror = () => {
			reject(new Error('Transaction failed'))
		}
	})
}
