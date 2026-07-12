# Color Token Reference

## Background Colors

| Token | Light Mode | Dark Mode | Use Case |
|-------|------------|-----------|----------|
| `bg-background` | white | zinc-950 | Page background |
| `bg-foreground` | zinc-950 | zinc-50 | Inverted background |
| `bg-card` | white | zinc-950 | Card surfaces |
| `bg-popover` | white | zinc-950 | Dropdown/popover surfaces |
| `bg-muted` | zinc-100 | zinc-800 | Subtle backgrounds |
| `bg-accent` | zinc-100 | zinc-800 | Hover states |

## Text Colors

| Token | Light Mode | Dark Mode | Use Case |
|-------|------------|-----------|----------|
| `text-foreground` | zinc-950 | zinc-50 | Primary text |
| `text-muted-foreground` | zinc-500 | zinc-400 | Secondary/hint text |
| `text-card-foreground` | zinc-950 | zinc-50 | Card text |
| `text-popover-foreground` | zinc-950 | zinc-50 | Popover text |
| `text-accent-foreground` | zinc-950 | zinc-50 | Accent text |

## Border Colors

| Token | Light Mode | Dark Mode | Use Case |
|-------|------------|-----------|----------|
| `border-border` | zinc-200 | zinc-800 | Standard borders |
| `border-input` | zinc-200 | zinc-800 | Input borders |
| `border-ring` | zinc-950 | zinc-300 | Focus rings |

## Semantic Colors

| Token | Light Mode | Dark Mode | Use Case |
|-------|------------|-----------|----------|
| `bg-primary` | zinc-900 | zinc-50 | Primary buttons |
| `text-primary-foreground` | zinc-50 | zinc-900 | Primary button text |
| `bg-secondary` | zinc-100 | zinc-800 | Secondary buttons |
| `text-secondary-foreground` | zinc-900 | zinc-50 | Secondary button text |
| `bg-destructive` | red-500 | red-900 | Destructive actions |
| `text-destructive-foreground` | zinc-50 | zinc-50 | Destructive text |
| `text-destructive` | red-500 | red-500 | Error text |

## Status Colors (Keep as-is)

These are intentional semantic colors that don't need theme tokens:

```tsx
// Success states
<Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
  Active
</Badge>

// Warning states
<Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
  Pending
</Badge>

// Error states
<Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
  Failed
</Badge>

// Info states
<Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
  Info
</Badge>
```

## Gradient Backgrounds (Brand)

For gradient backgrounds, use `text-white` intentionally:

```tsx
// Income card (green gradient)
<div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">

// Expense card (red gradient)
<div className="bg-gradient-to-br from-red-500 to-rose-600 text-white">

// Feature card (blue gradient)
<div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
```

## Overlay Colors

Modal/sheet backdrops should use semi-transparent black:

```tsx
// Modal backdrop - this is correct
<div className="fixed inset-0 bg-black/50">

// Don't use theme tokens for overlays
<div className="fixed inset-0 bg-background/50"> // Wrong
```
