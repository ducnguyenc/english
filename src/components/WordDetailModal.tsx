import { useEffect, useState } from 'react'
import { closeWordDetail, getWordDetail, subscribeWordDetail } from '../lib/wordDetail'
import { loadProgress, subscribeProgress } from '../lib/progress'
import { isWord } from '../lib/quiz'
import { speak } from '../lib/speech'
import WordImage from './WordImage'
import { MASTERED_DAY, type WordEtymology } from '../types'

export default function WordDetailModal() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const off1 = subscribeWordDetail(() => setTick((t) => t + 1))
    const off2 = subscribeProgress(() => setTick((t) => t + 1))
    return () => {
      off1()
      off2()
    }
  }, [])

  const item = getWordDetail()
  if (!item) return null

  const progress = loadProgress()
  const day = progress.items[item.id]?.day

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={closeWordDetail}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <WordImage image={item.image} className="w-14 h-14" />
            <div>
              <div className="text-xl font-bold flex items-center gap-2">
                {isWord(item) ? item.english : item.formula}
                {isWord(item) && (
                  <button type="button" onClick={() => speak(item.english, 'en-US')}>
                    🔊
                  </button>
                )}
              </div>
              {isWord(item) && item.ipa && <div className="text-sm text-slate-500">{item.ipa}</div>}
            </div>
          </div>
          <button type="button" className="btn-icon" onClick={closeWordDetail} title="Đóng">
            ✕
          </button>
        </div>

        {day !== undefined && (
          <div className="text-xs inline-block rounded-full px-2 py-1 bg-slate-100 dark:bg-slate-800">
            {day === MASTERED_DAY ? '✅ Đã thuộc' : `Day ${day}`}
          </div>
        )}

        {isWord(item) ? (
          <>
            <div className="font-medium">{item.vietnamese}</div>
            {item.type && <div className="text-xs text-slate-400">Loại từ: {item.type}</div>}
            {item.example && (
              <div className="text-sm text-slate-600 dark:text-slate-300 italic flex items-center gap-2">
                "{item.example}"
                <button type="button" onClick={() => speak(item.example, 'en-US')}>
                  🔊
                </button>
              </div>
            )}
            {item.exampleVi && <div className="text-sm text-slate-400">{item.exampleVi}</div>}
            {item.note && <div className="text-xs text-amber-600 dark:text-amber-400">💡 {item.note}</div>}
            {item.collocations && item.collocations.length > 0 && (
              <div className="text-xs text-slate-500">
                Collocations: {item.collocations.join(', ')}
              </div>
            )}
            {item.topic && <div className="text-xs text-slate-400">Chủ đề: {item.topic}</div>}
            {item.etymology && <EtymologySection etymology={item.etymology} />}
          </>
        ) : (
          <>
            <div className="text-slate-500 dark:text-slate-400">{item.meaningVi}</div>
            <ul className="space-y-1 text-sm">
              {item.examples.map((ex, i) => (
                <li key={i} className="flex items-center gap-2">
                  <button type="button" onClick={() => speak(ex.en, 'en-US')}>
                    🔊
                  </button>
                  <span className="italic">"{ex.en}"</span>
                  <span className="text-slate-400">— {ex.vi}</span>
                </li>
              ))}
            </ul>
            {item.note && <div className="text-xs text-amber-600 dark:text-amber-400">💡 {item.note}</div>}
            {item.topic && <div className="text-xs text-slate-400">Chủ đề: {item.topic}</div>}
          </>
        )}
      </div>
    </div>
  )
}

/** Nhãn tiếng Việt cho các key hay gặp trong "common_confusions[].details" — key lạ thì hiện nguyên key. */
const DETAIL_KEY_LABELS: Record<string, string> = {
  word: 'Từ',
  form: 'Dạng',
  stress: 'Trọng âm',
  meaning: 'Nghĩa',
  region: 'Vùng',
  example: 'Ví dụ',
  phonetic: 'Phiên âm',
}

function detailKeyLabel(key: string): string {
  return DETAIL_KEY_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1)
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">{children}</div>
}

/** Bảng đơn giản, tự cuộn ngang trên màn hình hẹp — dùng chung cho các bảng trong phần từ nguyên. */
function Table({ head, children }: { head: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="w-full text-xs border-collapse">
        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
          <tr>{head}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{children}</tbody>
      </table>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left font-medium px-2 py-1.5 whitespace-nowrap">{children}</th>
}

function Td({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-2 py-1.5 align-top ${className}`}>{children}</td>
}

function EtymologySection({ etymology }: { etymology: WordEtymology }) {
  return (
    <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-4">
      <div className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">📖 Từ nguyên & gia đình từ</div>

      {etymology.root && (
        <div>
          <SectionTitle>Từ gốc (Root)</SectionTitle>
          <div className="text-xs space-y-1 rounded-lg bg-slate-50 dark:bg-slate-800/50 p-2.5">
            {etymology.root.origin && (
              <div>
                <span className="font-medium">Nguồn gốc:</span> {etymology.root.origin}
              </div>
            )}
            {etymology.root.root_word && (
              <div>
                <span className="font-medium">Từ gốc:</span> {etymology.root.root_word}
              </div>
            )}
            {etymology.root.original_meaning && (
              <div>
                <span className="font-medium">Nghĩa gốc:</span> {etymology.root.original_meaning}
              </div>
            )}
            {etymology.root.type && (
              <div>
                <span className="font-medium">Loại:</span> {etymology.root.type}
              </div>
            )}
            {etymology.root.note && (
              <div className="italic text-amber-600 dark:text-amber-400">💡 {etymology.root.note}</div>
            )}
          </div>
        </div>
      )}

      {etymology.word_family && etymology.word_family.length > 0 && (
        <div>
          <SectionTitle>Bảng Word Family</SectionTitle>
          {(() => {
            const hasStructure = etymology.word_family!.some((f) => f.structure)
            return (
              <Table
                head={
                  <>
                    <Th>Từ loại</Th>
                    <Th>Từ</Th>
                    <Th>Phiên âm</Th>
                    <Th>Nghĩa tiếng Việt</Th>
                    {hasStructure && <Th>Cấu tạo</Th>}
                  </>
                }
              >
                {etymology.word_family!.map((f, i) => (
                  <tr key={`${f.word}-${f.part_of_speech}-${i}`}>
                    <Td className="text-slate-400 whitespace-nowrap">{f.part_of_speech}</Td>
                    <Td className="font-medium whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        {f.word}
                        <button type="button" onClick={() => speak(f.word, 'en-US')}>
                          🔊
                        </button>
                      </span>
                    </Td>
                    <Td className="text-slate-400 whitespace-nowrap">{f.phonetic}</Td>
                    <Td className="text-slate-600 dark:text-slate-300">{f.meaning_vi}</Td>
                    {hasStructure && <Td className="text-slate-500 dark:text-slate-400">{f.structure}</Td>}
                  </tr>
                ))}
              </Table>
            )
          })()}
        </div>
      )}

      {etymology.word_formation && etymology.word_formation.length > 0 && (
        <div>
          <SectionTitle>Phân tích cấu tạo từ</SectionTitle>
          <Table
            head={
              <>
                <Th>Từ</Th>
                <Th>Tiền tố + Gốc + Hậu tố</Th>
              </>
            }
          >
            {etymology.word_formation.map((f, i) => (
              <tr key={`${f.word}-${i}`}>
                <Td className="font-medium whitespace-nowrap">{f.word}</Td>
                <Td className="text-slate-600 dark:text-slate-300">{f.structure}</Td>
              </tr>
            ))}
          </Table>
        </div>
      )}

      {etymology.common_confusions && etymology.common_confusions.length > 0 && (
        <div className="space-y-3">
          <SectionTitle>Phân biệt dễ nhầm</SectionTitle>
          {etymology.common_confusions.map((c, i) => {
            const keys = Array.from(new Set(c.details?.flatMap((d) => Object.keys(d)) ?? []))
            return (
              <div key={i} className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2.5 space-y-2">
                <div className="text-xs font-medium text-amber-700 dark:text-amber-400">{c.title}</div>
                {keys.length > 0 && (
                  <Table head={keys.map((k) => <Th key={k}>{detailKeyLabel(k)}</Th>)}>
                    {c.details!.map((d, di) => (
                      <tr key={di} className="bg-white dark:bg-slate-900">
                        {keys.map((k) => (
                          <Td key={k}>{d[k]}</Td>
                        ))}
                      </tr>
                    ))}
                  </Table>
                )}
                {c.examples?.map((ex, ei) => (
                  <div key={ei} className="text-xs italic text-slate-500">
                    {ex}
                  </div>
                ))}
                {c.note && <div className="text-xs text-amber-600 dark:text-amber-400">💡 {c.note}</div>}
              </div>
            )
          })}
        </div>
      )}

      {etymology.example_sentences && etymology.example_sentences.length > 0 && (
        <div>
          <SectionTitle>Ví dụ theo dạng/nghĩa</SectionTitle>
          <ul className="text-sm space-y-1.5">
            {etymology.example_sentences.map((ex, i) => (
              <li key={i}>
                <span className="text-xs text-slate-400">{ex.form}: </span>
                <span className="italic">"{ex.sentence_en}"</span>
                <button type="button" className="mx-1" onClick={() => speak(ex.sentence_en, 'en-US')}>
                  🔊
                </button>
                <span className="text-slate-400">— {ex.sentence_vi}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {etymology.additional_notes && etymology.additional_notes.length > 0 && (
        <div>
          <SectionTitle>Lưu ý thêm</SectionTitle>
          <ul className="text-xs space-y-1 list-disc list-inside text-slate-500 dark:text-slate-400">
            {etymology.additional_notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
