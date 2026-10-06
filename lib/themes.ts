import type { GroupOption } from "./types";

// Presets live in code. On create_session, the chosen preset's list is copied
// into sessions.group_options, because Postgres can't read this file.

export const THEMES = {
  animals: {
    label: "Animals",
    groups: [
      { name: "Cow", emoji: "🐮", sound_hint: "Moo!" },
      { name: "Dog", emoji: "🐶", sound_hint: "Woof!" },
      { name: "Cat", emoji: "🐱", sound_hint: "Meow!" },
      { name: "Duck", emoji: "🦆", sound_hint: "Quack!" },
      { name: "Sheep", emoji: "🐑", sound_hint: "Baa!" },
      { name: "Chicken", emoji: "🐔", sound_hint: "Bok bok!" },
      { name: "Pig", emoji: "🐷", sound_hint: "Oink!" },
      { name: "Monkey", emoji: "🐵", sound_hint: "Ooh ooh ah ah!" },
      { name: "Frog", emoji: "🐸", sound_hint: "Ribbit!" },
      { name: "Snake", emoji: "🐍", sound_hint: "Hiss!" },
      // Spares: only used if more than 10 groups are needed.
      { name: "Owl", emoji: "🦉", sound_hint: "Hoo hoo!" },
      { name: "Lion", emoji: "🦁", sound_hint: "Roar!" },
    ] satisfies GroupOption[],
  },
} as const;

export type ThemeKey = keyof typeof THEMES;
