import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema, resetPasswordSchema } from '../src/schemas/auth.js';
import { recipeListQuerySchema } from '../src/schemas/recipe.js';
import { upsertReviewSchema } from '../src/schemas/review.js';
import { objectIdSchema } from '../src/schemas/common.js';
import { scorePassword } from '../src/utils/password.js';
import { slugify, uniqueSlug } from '../src/utils/slug.js';
import { getGreeting, pickOfTheDay, toDayKey } from '../src/utils/daily.js';

/**
 * These schemas are the only validation the server performs, so a gap here is a
 * gap in the API's defences — not merely a form that lets a typo through.
 */

describe('registerSchema', () => {
  it('accepts a valid registration and normalises the email', () => {
    const result = registerSchema.safeParse({
      name: '  Sam Karimpour ',
      email: '  SAM@Example.COM ',
      password: 'coffee-beans-42',
      confirmPassword: 'coffee-beans-42',
    });

    expect(result.success).toBe(true);
    // Stored lowercase so the unique index cannot be bypassed with capitals.
    expect(result.data?.email).toBe('sam@example.com');
    expect(result.data?.name).toBe('Sam Karimpour');
  });

  it('rejects mismatched passwords against the confirm field', () => {
    const result = registerSchema.safeParse({
      name: 'Sam',
      email: 'sam@example.com',
      password: 'coffee-beans-42',
      confirmPassword: 'coffee-beans-43',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['confirmPassword']);
  });

  it('requires a password with both letters and digits', () => {
    expect(
      registerSchema.safeParse({
        name: 'Sam',
        email: 'sam@example.com',
        password: 'onlyletters',
        confirmPassword: 'onlyletters',
      }).success,
    ).toBe(false);
  });

  it('rejects a password below the minimum length', () => {
    expect(
      registerSchema.safeParse({
        name: 'Sam',
        email: 'sam@example.com',
        password: 'a1b2c3',
        confirmPassword: 'a1b2c3',
      }).success,
    ).toBe(false);
  });
});

describe('loginSchema', () => {
  it('refuses a non-string password, which is how NoSQL operators arrive', () => {
    // `{ $ne: null }` as a password is the classic authentication bypass.
    const result = loginSchema.safeParse({
      email: 'sam@example.com',
      password: { $ne: null },
    });

    expect(result.success).toBe(false);
  });

  it('refuses an object in place of an email', () => {
    expect(loginSchema.safeParse({ email: { $gt: '' }, password: 'x' }).success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('rejects a token that is too short to be genuine', () => {
    expect(
      resetPasswordSchema.safeParse({
        token: 'short',
        password: 'coffee-beans-42',
        confirmPassword: 'coffee-beans-42',
      }).success,
    ).toBe(false);
  });
});

describe('objectIdSchema', () => {
  it('accepts a 24-character hex id and nothing else', () => {
    expect(objectIdSchema.safeParse('507f1f77bcf86cd799439011').success).toBe(true);
    expect(objectIdSchema.safeParse('not-an-id').success).toBe(false);
    expect(objectIdSchema.safeParse({ $ne: null }).success).toBe(false);
  });
});

describe('recipeListQuerySchema', () => {
  it('coerces string query params and applies defaults', () => {
    const result = recipeListQuerySchema.parse({ page: '2', limit: '12', maxTime: '10' });

    expect(result.page).toBe(2);
    expect(result.limit).toBe(12);
    expect(result.maxTime).toBe(10);
    expect(result.sort).toBe('popularity');
  });

  it('reads the loose boolean forms a URL can carry', () => {
    expect(recipeListQuerySchema.parse({ milk: 'true' }).milk).toBe(true);
    expect(recipeListQuerySchema.parse({ milk: '1' }).milk).toBe(true);
    expect(recipeListQuerySchema.parse({ milk: '' }).milk).toBe(true);
    expect(recipeListQuerySchema.parse({ milk: 'false' }).milk).toBe(false);
  });

  it('refuses a page size beyond the cap rather than letting one request scan the collection', () => {
    expect(recipeListQuerySchema.safeParse({ limit: '5000' }).success).toBe(false);
  });

  it('refuses an unknown category instead of silently ignoring it', () => {
    expect(recipeListQuerySchema.safeParse({ category: 'not-a-category' }).success).toBe(false);
  });
});

describe('upsertReviewSchema', () => {
  it('stores an omitted or empty body as null', () => {
    expect(upsertReviewSchema.parse({ rating: 5 }).body).toBeNull();
    expect(upsertReviewSchema.parse({ rating: 5, body: '' }).body).toBeNull();
  });

  it('holds ratings to whole numbers from 1 to 5', () => {
    expect(upsertReviewSchema.safeParse({ rating: 0 }).success).toBe(false);
    expect(upsertReviewSchema.safeParse({ rating: 6 }).success).toBe(false);
    expect(upsertReviewSchema.safeParse({ rating: 3.5 }).success).toBe(false);
    expect(upsertReviewSchema.safeParse({ rating: 3 }).success).toBe(true);
  });
});

describe('scorePassword', () => {
  it('never rates a dictionary password above weak', () => {
    expect(scorePassword('coffee123').score).toBeLessThanOrEqual(1);
    expect(scorePassword('password1').score).toBeLessThanOrEqual(1);
  });

  it('rewards length over punctuation', () => {
    expect(scorePassword('walnut-espresso-42-Crema').level).toBe('strong');
  });

  it('gives one actionable hint at a time', () => {
    expect(scorePassword('abcdefgh').hint).toBe('Add at least one number');
  });
});

describe('slugify', () => {
  it('strips accents so names stay readable as ASCII', () => {
    expect(slugify('Café Bombón')).toBe('cafe-bombon');
    expect(slugify('Caffè Latte')).toBe('caffe-latte');
  });

  it('collapses punctuation and spacing', () => {
    expect(slugify('  White  Chocolate / Mocha!  ')).toBe('white-chocolate-mocha');
  });

  it('appends a suffix only when the slug is taken', () => {
    const taken = new Set(['iced-latte']);
    expect(uniqueSlug('Iced Latte', (slug) => taken.has(slug))).toBe('iced-latte-2');
    expect(uniqueSlug('Cold Brew', (slug) => taken.has(slug))).toBe('cold-brew');
  });
});

describe('daily rotation', () => {
  it('returns the same pick for the same day, so the page stays cacheable', () => {
    const pool = ['a', 'b', 'c', 'd', 'e'];
    const date = new Date('2026-09-18T08:00:00Z');
    const later = new Date('2026-09-18T22:00:00Z');

    expect(pickOfTheDay(pool, date)).toBe(pickOfTheDay(pool, later));
  });

  it('changes the pick from one day to the next', () => {
    const pool = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const picks = new Set(
      Array.from({ length: 14 }, (_, day) =>
        pickOfTheDay(pool, new Date(Date.UTC(2026, 8, day + 1))),
      ),
    );

    // Not a guarantee of no repeats, but a single constant value would mean the
    // rotation is not rotating at all.
    expect(picks.size).toBeGreaterThan(1);
  });

  it('handles an empty pool without throwing', () => {
    expect(pickOfTheDay([], new Date())).toBeNull();
  });

  it('keys the day in UTC', () => {
    expect(toDayKey(new Date('2026-09-18T23:30:00Z'))).toBe('2026-09-18');
  });
});

describe('getGreeting', () => {
  it('uses the first name and the time of day', () => {
    expect(getGreeting('Sam Karimpour', new Date('2026-09-18T09:00:00'))).toBe('Good morning, Sam');
    expect(getGreeting('Sam', new Date('2026-09-18T14:00:00'))).toBe('Good afternoon, Sam');
    expect(getGreeting('Sam', new Date('2026-09-18T20:00:00'))).toBe('Good evening, Sam');
  });

  it('drops the name gracefully for a signed-out visitor', () => {
    expect(getGreeting(null, new Date('2026-09-18T09:00:00'))).toBe('Good morning');
  });
});
