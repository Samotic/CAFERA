'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/Field';
import { INGREDIENT_UNITS, TEMPERATURES } from '@/lib/constants/enums';
import { customRecipeInputSchema } from '@/lib/validation/custom-recipe';
import { readJson, writeJson, STORAGE_KEYS } from '@/lib/storage';

type Draft = {
  name: string;
  description: string;
  preparationTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  temperature: 'hot' | 'cold';
  isPublic: boolean;
  ingredients: Array<{
    name: string;
    amount: number;
    unit: (typeof INGREDIENT_UNITS)[number];
    scalable: boolean;
  }>;
  steps: Array<{ instruction: string; durationSeconds?: number }>;
};

const initialDraft: Draft = {
  name: '',
  description: '',
  preparationTime: 10,
  difficulty: 'easy',
  temperature: 'hot',
  isPublic: false,
  ingredients: [{ name: '', amount: 0, unit: 'g', scalable: true }],
  steps: [{ instruction: '' }],
};

export function CustomRecipeBuilder() {
  const [draft, setDraft] = useState<Draft>(() =>
    readJson(STORAGE_KEYS.customRecipeDraft, initialDraft),
  );
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    writeJson(STORAGE_KEYS.customRecipeDraft, draft);
  }, [draft]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function saveDraft(event: React.FormEvent) {
    event.preventDefault();
    const result = customRecipeInputSchema.safeParse(draft);
    if (!result.success) {
      setErrors(result.error.issues.slice(0, 4).map((issue) => issue.message));
      setMessage('');
      return;
    }
    setErrors([]);
    setMessage('Draft saved on this device. Sign in to publish it to My Café.');
  }

  return (
    <form onSubmit={saveDraft} className="space-y-10">
      <section className="space-y-5" aria-labelledby="custom-details-heading">
        <h2 id="custom-details-heading" className="font-display text-2xl font-semibold">
          Recipe details
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Recipe name" required className="sm:col-span-2">
            {({ id, ...props }) => (
              <Input
                {...props}
                id={id}
                value={draft.name}
                onChange={(event) => update('name', event.target.value)}
                placeholder="My morning brew"
              />
            )}
          </Field>
          <Field label="Description" required className="sm:col-span-2">
            {({ id, ...props }) => (
              <Textarea
                {...props}
                id={id}
                value={draft.description}
                onChange={(event) => update('description', event.target.value)}
                placeholder="What makes this recipe yours?"
                rows={3}
              />
            )}
          </Field>
          <Field label="Preparation time" required>
            {({ id, ...props }) => (
              <Input
                {...props}
                id={id}
                type="number"
                min={1}
                value={draft.preparationTime}
                onChange={(event) => update('preparationTime', Number(event.target.value))}
              />
            )}
          </Field>
          <Field label="Difficulty" required>
            {({ id, ...props }) => (
              <Select
                {...props}
                id={id}
                value={draft.difficulty}
                onChange={(event) =>
                  update('difficulty', event.target.value as Draft['difficulty'])
                }
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </Select>
            )}
          </Field>
          <Field label="Temperature" required>
            {({ id, ...props }) => (
              <Select
                {...props}
                id={id}
                value={draft.temperature}
                onChange={(event) =>
                  update('temperature', event.target.value as Draft['temperature'])
                }
              >
                {TEMPERATURES.map((value) => (
                  <option key={value} value={value}>
                    {value === 'hot' ? 'Hot' : 'Cold'}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </section>

      <section className="space-y-5" aria-labelledby="custom-ingredients-heading">
        <div className="flex items-center justify-between gap-4">
          <h2 id="custom-ingredients-heading" className="font-display text-2xl font-semibold">
            Ingredients
          </h2>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              update('ingredients', [
                ...draft.ingredients,
                { name: '', amount: 0, unit: 'g', scalable: true },
              ])
            }
          >
            <Plus className="size-4" /> Add ingredient
          </Button>
        </div>
        <div className="space-y-3">
          {draft.ingredients.map((ingredient, index) => (
            <div key={index} className="grid gap-3 sm:grid-cols-[1fr_7rem_8rem_auto] sm:items-end">
              <Field label={`Ingredient ${index + 1}`} required>
                {({ id, ...props }) => (
                  <Input
                    {...props}
                    id={id}
                    value={ingredient.name}
                    onChange={(event) =>
                      update(
                        'ingredients',
                        draft.ingredients.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, name: event.target.value } : item,
                        ),
                      )
                    }
                    placeholder="Coffee"
                  />
                )}
              </Field>
              <Field label="Amount" required>
                {({ id, ...props }) => (
                  <Input
                    {...props}
                    id={id}
                    type="number"
                    min={0}
                    value={ingredient.amount || ''}
                    onChange={(event) =>
                      update(
                        'ingredients',
                        draft.ingredients.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, amount: Number(event.target.value) }
                            : item,
                        ),
                      )
                    }
                  />
                )}
              </Field>
              <Field label="Unit" required>
                {({ id, ...props }) => (
                  <Select
                    {...props}
                    id={id}
                    value={ingredient.unit}
                    onChange={(event) =>
                      update(
                        'ingredients',
                        draft.ingredients.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                unit: event.target.value as Draft['ingredients'][number]['unit'],
                              }
                            : item,
                        ),
                      )
                    }
                  >
                    {INGREDIENT_UNITS.map((unit) => (
                      <option key={unit}>{unit}</option>
                    ))}
                  </Select>
                )}
              </Field>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Remove ingredient ${index + 1}`}
                onClick={() =>
                  update(
                    'ingredients',
                    draft.ingredients.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-5" aria-labelledby="custom-method-heading">
        <div className="flex items-center justify-between gap-4">
          <h2 id="custom-method-heading" className="font-display text-2xl font-semibold">
            Method
          </h2>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => update('steps', [...draft.steps, { instruction: '' }])}
          >
            <Plus className="size-4" /> Add step
          </Button>
        </div>
        <ol className="space-y-3">
          {draft.steps.map((step, index) => (
            <li key={index} className="flex gap-3">
              <span className="mt-3 flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent-text">
                {index + 1}
              </span>
              <Field label={`Step ${index + 1}`} hideLabel required className="flex-1">
                {({ id, ...props }) => (
                  <Textarea
                    {...props}
                    id={id}
                    value={step.instruction}
                    onChange={(event) =>
                      update(
                        'steps',
                        draft.steps.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, instruction: event.target.value } : item,
                        ),
                      )
                    }
                    placeholder="Describe what to do"
                    rows={2}
                  />
                )}
              </Field>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Remove step ${index + 1}`}
                onClick={() =>
                  update(
                    'steps',
                    draft.steps.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-border pt-6">
        <Checkbox
          label="Make this recipe public"
          checked={draft.isPublic}
          onChange={(event) => update('isPublic', event.target.checked)}
        />
        <p className="mt-2 text-sm text-text-muted">
          Public recipes can be shared. Private recipes stay in your café.
        </p>
      </section>
      {errors.length ? (
        <div
          role="alert"
          className="rounded-md border border-danger bg-danger-soft p-4 text-sm text-danger"
        >
          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      ) : null}
      {message ? (
        <p role="status" className="rounded-md bg-accent-soft p-4 text-sm text-accent-text">
          {message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="lg">
          Save recipe draft
        </Button>
        <ButtonLink href="/my-cafe" variant="secondary" size="lg">
          Back to My Café
        </ButtonLink>
      </div>
    </form>
  );
}
