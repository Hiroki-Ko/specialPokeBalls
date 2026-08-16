import type { ReactNode } from 'react'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}

/**
 * モーダル本体の高さをビューポートの90%までに制限し、見出し(タイトル・閉じるボタン)は
 * 常に固定表示、本文(children)側だけを縦スクロールさせる。
 * これにより、スマホの小さい画面で本文が長くなっても保存ボタン等が画面外に隠れず、
 * 閉じるボタンも常にタップできる(以前は本文込みで高さ制限がなく、画面をリロードしないと
 * 抜け出せなくなることがあった)。
 */
export default function Modal({ title, onClose, children, wide }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className={`flex max-h-[90vh] w-full flex-col rounded-lg bg-white shadow-xl dark:bg-gray-900 ${
          wide ? 'max-w-2xl' : 'max-w-md'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between px-5 pt-5 pb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            onClick={onClose}
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-5">{children}</div>
      </div>
    </div>
  )
}
