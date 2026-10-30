// Fylls på i takt med att besökaren svarar.
// Fyllningen är en gradient från mauve-500 till blush-300. Den ljusa änden syns alltid
// tydligt mot den mörka banan (kontrast över 3:1), även när fyllningen är kort.
export function ProgressBar({ done, total }: { done: number; total: number }) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)

  return (
    <div
      role="progressbar"
      aria-label="Framsteg i quizet"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      aria-valuetext={`${done} av ${total} frågor besvarade`}
      className="h-3 w-full overflow-hidden rounded-full border border-blush-300/30 bg-plum-900"
    >
      <div
        className="h-full rounded-full bg-linear-to-r from-mauve-500 to-blush-300 transition-[width] duration-500 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
