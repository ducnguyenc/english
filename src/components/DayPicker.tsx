import { setItemDay } from '../lib/progress'
import { MASTERED_DAY, type LeitnerDay } from '../types'

export default function DayPicker({
  itemId,
  currentDay,
  className = '',
}: {
  itemId: string
  currentDay: LeitnerDay
  className?: string
}) {
  return (
    <select
      className={`input w-auto text-xs py-1 ${className}`}
      value={currentDay}
      title="Chuyển sang ngày khác"
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setItemDay(itemId, Number(e.target.value) as LeitnerDay)}
    >
      {[1, 2, 3, 4, 5].map((d) => (
        <option key={d} value={d}>
          Day {d}
        </option>
      ))}
      <option value={MASTERED_DAY}>Đã thuộc</option>
    </select>
  )
}
