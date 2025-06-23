import { TAbsolutePosition } from '../type'

type TProps = {
	infoBoxPosition: TAbsolutePosition
	pixelColor: string
	zoomArea: string
}

export function PixelColor({ infoBoxPosition, pixelColor, zoomArea }: TProps) {
	return (
		pixelColor && (
			<div
				className="fixed flex items-center p-2 bg-gray-800 text-white rounded shadow-lg z-50"
				style={{
					left: `${infoBoxPosition.left}px`,
					top: `${infoBoxPosition.top}px`,
				}}
			>
				<div
					className="w-6 h-6 mr-2 border border-gray-400"
					style={{ backgroundColor: pixelColor }}
				/>
				<div>
					<div className="text-sm font-mono">{pixelColor}</div>
					{zoomArea && (
						<img
							src={zoomArea}
							alt="zoom"
							className="mt-1 border border-gray-400"
							width={100}
							height={100}
						/>
					)}
				</div>
			</div>
		)
	)
}
