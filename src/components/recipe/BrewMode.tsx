'use client';

import Link from 'next/link';
import { ArrowLeft, Check, Pause, Play, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Recipe } from '@/types/recipe';

export function BrewMode({ recipe }: { recipe: Recipe }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [seconds, setSeconds] = useState(recipe.steps[0]?.durationSeconds ?? 0);
  const [running, setRunning] = useState(false);
  const step = recipe.steps[stepIndex]!;
  const isLast = stepIndex === recipe.steps.length - 1;

  useEffect(() => {
    if (!running || seconds <= 0) return;
    const timer = window.setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) setRunning(false);
        return Math.max(0, value - 1);
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, seconds]);

  function nextStep() {
    if (isLast) return;
    const next = recipe.steps[stepIndex + 1];
    setStepIndex((value) => value + 1);
    setSeconds(next?.durationSeconds ?? 0);
    setRunning(false);
  }

  function reset() {
    setStepIndex(0);
    setSeconds(recipe.steps[0]?.durationSeconds ?? 0);
    setRunning(false);
  }

  return (
    <div className="flex min-h-dvh flex-col px-5 py-6 sm:px-10">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between">
        <Link
          href={`/recipes/${recipe.slug}`}
          className="text-text-secondary inline-flex items-center gap-2 text-sm font-semibold"
        >
          <ArrowLeft className="size-4" /> Exit Brew Mode
        </Link>
        <button
          type="button"
          onClick={reset}
          className="border-border-strong text-text-secondary inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold"
        >
          <RotateCcw className="size-4" /> Restart
        </button>
      </header>
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center py-12">
        <p className="text-accent-text text-xs font-semibold uppercase tracking-[0.22em]">
          Brew Mode
        </p>
        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[length:var(--text-display-md)] font-semibold">
              {recipe.name}
            </h1>
            <p className="text-text-secondary mt-2">
              Step {stepIndex + 1} of {recipe.steps.length}
            </p>
          </div>
          <div className="text-accent-text text-5xl font-semibold tabular-nums">
            {seconds > 0 ? (
              `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
            ) : (
              <Check className="size-12" aria-label="Step complete" />
            )}
          </div>
        </div>
        <div className="bg-sunken mt-8 h-2 overflow-hidden rounded-full">
          <div
            className="bg-accent-line h-full rounded-full transition-[width]"
            style={{ width: `${((stepIndex + 1) / recipe.steps.length) * 100}%` }}
          />
        </div>
        <section className="rounded-card border-border bg-card mt-10 border p-6 shadow-sm sm:p-10">
          <span className="text-accent-text text-sm font-semibold">Step {step.order}</span>
          <p className="font-display mt-4 max-w-2xl text-2xl leading-snug sm:text-4xl">
            {step.instruction}
          </p>
          {step.durationSeconds ? (
            <p className="text-text-muted mt-5 text-sm">
              The timer pauses when you pause Brew Mode.
            </p>
          ) : (
            <p className="text-text-muted mt-5 text-sm">
              Take your time. This step has no countdown.
            </p>
          )}
        </section>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setRunning((value) => !value)}
            disabled={seconds === 0}
            className="bg-primary text-on-primary inline-flex h-12 items-center gap-2 rounded-full px-6 font-semibold disabled:opacity-50"
          >
            {running ? <Pause className="size-4" /> : <Play className="size-4" />}
            {running ? 'Pause timer' : 'Start timer'}
          </button>
          <button
            type="button"
            onClick={nextStep}
            disabled={!isLast && seconds > 0}
            className="border-border-strong text-text inline-flex h-12 items-center gap-2 rounded-full border px-6 font-semibold disabled:opacity-50"
          >
            {isLast ? 'Finished' : 'Next step'}
          </button>
        </div>
      </main>
    </div>
  );
}
