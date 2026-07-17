import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ApiError,
  type TeacherUnit,
  fetchLevelDetail,
  fetchLevelSummaries,
  fetchTeacherUnits,
} from "@/lib/api";
import { isTeacherUser } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { LevelDetailDto, LevelSummaryDto } from "@gojo/shared";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  addVocabAction,
  createUnitAction,
  deleteUnitAction,
  deleteVocabAction,
  updateUnitAction,
  updateVocabAction,
} from "./actions";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ level?: string }> };

export default async function CurriculumPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!isTeacherUser(user)) redirect("/dashboard");

  const params = await searchParams;
  const levelId = Math.min(30, Math.max(1, Number(params.level ?? 1) || 1));

  let summaries: LevelSummaryDto[] = [];
  let detail: LevelDetailDto | null = null;
  let allUnits: TeacherUnit[] = [];
  try {
    [summaries, detail, allUnits] = await Promise.all([
      fetchLevelSummaries(),
      fetchLevelDetail(levelId),
      fetchTeacherUnits(),
    ]);
  } catch (e) {
    return (
      <main className="min-h-screen bg-gojo-paper">
        <div className="mx-auto max-w-md px-6 py-24 text-center">
          <Card className="px-6 py-8">
            <p className="text-sm font-bold text-gojo-error">
              {e instanceof ApiError ? `Не удалось загрузить программу (${e.status})` : "Ошибка"}
            </p>
          </Card>
        </div>
      </main>
    );
  }

  const units = allUnits.filter((u) => u.levelId === levelId);
  const unassigned = detail?.vocab.filter((v) => !v.unitId).length ?? 0;

  return (
    <main className="min-h-screen bg-gojo-paper">
      <div className="mx-auto max-w-5xl px-6 py-14">
        <Link href="/teacher" className="text-sm font-bold text-gojo-orange hover:underline">
          ← К панели учителя
        </Link>
        <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.15em] text-gojo-orange">
          Программа · 30 уровней
        </div>
        <h1 className="mt-1 font-serif text-[32px] font-bold">Уровень {levelId}</h1>

        <div className="mt-5 flex flex-wrap gap-1.5">
          {summaries.map((level) => (
            <Link
              key={level.id}
              href={`/teacher/curriculum?level=${level.id}`}
              className={cn(
                "grid size-9 place-items-center rounded-lg border text-sm font-bold transition-colors",
                level.id === levelId
                  ? "border-gojo-orange bg-gojo-orange text-white"
                  : level.vocabCount > 0
                    ? "border-black/15 bg-white hover:border-gojo-orange"
                    : "border-black/10 bg-gojo-surface text-gojo-ink-muted hover:border-gojo-orange",
              )}
            >
              {level.id}
            </Link>
          ))}
        </div>

        <section className="mt-10">
          <h2 className="font-serif text-[22px] font-bold">Юниты</h2>
          <p className="mt-1 text-[13px] text-gojo-ink-muted">
            Юнит — кусок уровня размером в занятие, со ссылкой на источник (глава учебника). Урок
            привязывается к юниту; «пройден» выдаёт студенту деку юнита и открывает уровень.
          </p>

          {units.length === 0 ? (
            <p className="mt-4 text-sm text-gojo-ink-muted">Юнитов на этом уровне пока нет.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {units.map((unit) => (
                <Card key={unit.id} className="p-4">
                  <form action={updateUnitAction} className="flex flex-wrap items-end gap-3">
                    <input type="hidden" name="unitId" value={unit.id} />
                    <input type="hidden" name="levelId" value={levelId} />
                    <div className="w-14">
                      <span className="text-[10px] font-bold uppercase text-gojo-ink-ghost">№</span>
                      <Input name="position" type="number" min="1" defaultValue={unit.position} />
                    </div>
                    <div className="min-w-40 flex-1">
                      <span className="text-[10px] font-bold uppercase text-gojo-ink-ghost">
                        Название
                      </span>
                      <Input name="title" defaultValue={unit.title} required />
                    </div>
                    <div className="w-40">
                      <span className="text-[10px] font-bold uppercase text-gojo-ink-ghost">
                        Учебник
                      </span>
                      <Input
                        name="sourceBook"
                        defaultValue={unit.sourceBook ?? ""}
                        placeholder="Genki I"
                      />
                    </div>
                    <div className="w-28">
                      <span className="text-[10px] font-bold uppercase text-gojo-ink-ghost">
                        Глава
                      </span>
                      <Input
                        name="sourceChapter"
                        defaultValue={unit.sourceChapter ?? ""}
                        placeholder="Глава 3"
                      />
                    </div>
                    <Button type="submit" size="sm" variant="outline">
                      Сохранить
                    </Button>
                  </form>
                  <div className="mt-2 flex items-center justify-between text-[12px] text-gojo-ink-muted">
                    <span>
                      Слов в деке: {unit.vocabCount} · уроков привязано: {unit.lessonCount}
                    </span>
                    {unit.lessonCount === 0 && unit.vocabCount === 0 ? (
                      <form action={deleteUnitAction}>
                        <input type="hidden" name="unitId" value={unit.id} />
                        <input type="hidden" name="levelId" value={levelId} />
                        <Button type="submit" size="sm" variant="ghost" className="text-gojo-error">
                          Удалить
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </Card>
              ))}
            </div>
          )}

          <Card className="mt-4 border-dashed p-4">
            <form action={createUnitAction} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="levelId" value={levelId} />
              <div className="min-w-40 flex-1">
                <span className="text-[10px] font-bold uppercase text-gojo-ink-ghost">
                  Новый юнит
                </span>
                <Input name="title" placeholder="Каждый день · распорядок" required />
              </div>
              <div className="w-40">
                <span className="text-[10px] font-bold uppercase text-gojo-ink-ghost">Учебник</span>
                <Input name="sourceBook" placeholder="Genki I" />
              </div>
              <div className="w-28">
                <span className="text-[10px] font-bold uppercase text-gojo-ink-ghost">Глава</span>
                <Input name="sourceChapter" placeholder="Глава 3" />
              </div>
              <Button type="submit" size="sm">
                Создать
              </Button>
            </form>
          </Card>
        </section>

        <section className="mt-12">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-serif text-[22px] font-bold">
              Слова уровня · {detail?.vocab.length ?? 0}
            </h2>
            {unassigned > 0 ? (
              <span className="text-[12px] font-bold text-gojo-orange">
                без юнита: {unassigned}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[13px] text-gojo-ink-muted">
            Дека связана: правка слова обновит карточку у всех студентов, кому она уже выдана.
          </p>

          <Card className="mt-4 border-dashed p-4">
            <form action={addVocabAction} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="levelId" value={levelId} />
              <div className="w-32">
                <span className="text-[10px] font-bold uppercase text-gojo-ink-ghost">Слово</span>
                <Input name="word" placeholder="起きる" required />
              </div>
              <div className="w-36">
                <span className="text-[10px] font-bold uppercase text-gojo-ink-ghost">Чтение</span>
                <Input name="reading" placeholder="おきる" required />
              </div>
              <div className="min-w-32 flex-1">
                <span className="text-[10px] font-bold uppercase text-gojo-ink-ghost">
                  Значение
                </span>
                <Input name="meaning" placeholder="вставать" required />
              </div>
              <div className="w-44">
                <span className="text-[10px] font-bold uppercase text-gojo-ink-ghost">Юнит</span>
                <select
                  name="unitId"
                  defaultValue=""
                  className="h-9 w-full rounded-md border border-black/15 bg-white px-2 text-sm"
                >
                  <option value="">— без юнита —</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.position}. {unit.title}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" size="sm">
                Добавить
              </Button>
            </form>
          </Card>

          <div className="mt-4 space-y-1.5">
            {(detail?.vocab ?? []).map((vocab) => (
              <div
                key={vocab.id}
                className={cn(
                  "rounded-md border bg-white p-2.5",
                  vocab.unitId ? "border-black/10" : "border-gojo-orange/30",
                )}
              >
                <form action={updateVocabAction} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="vocabId" value={vocab.id} />
                  <input type="hidden" name="levelId" value={levelId} />
                  <Input name="word" defaultValue={vocab.word} required className="g-jp w-32" />
                  <Input name="reading" defaultValue={vocab.reading} required className="w-36" />
                  <Input
                    name="meaning"
                    defaultValue={vocab.meaning}
                    required
                    className="min-w-32 flex-1"
                  />
                  <select
                    name="unitId"
                    defaultValue={vocab.unitId ?? ""}
                    className={cn(
                      "h-9 w-44 rounded-md border bg-white px-2 text-sm",
                      vocab.unitId ? "border-black/15" : "border-gojo-orange/50 text-gojo-orange",
                    )}
                  >
                    <option value="">— без юнита —</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.position}. {unit.title}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" size="sm" variant="outline">
                    ОК
                  </Button>
                  <Button
                    type="submit"
                    formAction={deleteVocabAction}
                    size="sm"
                    variant="ghost"
                    className="text-gojo-error"
                  >
                    ✕
                  </Button>
                </form>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
