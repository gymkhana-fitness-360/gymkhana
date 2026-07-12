---
name: ui-ux-pro-max
description: Advanced UI/UX design system enforcer for React/Next.js apps. Ensures consistent shadcn/ui usage, proper theme tokens, accessibility compliance, responsive design, and modern design patterns. Use proactively when creating components, reviewing UI code, fixing styling issues, or when user mentions UI, UX, design, styling, components, or accessibility.
---

# UI/UX Pro Max

## Purpose
Enforce world-class UI/UX standards across the codebase. This skill ensures visual consistency, accessibility, and modern design patterns.

## When to Activate
- Creating new components
- Reviewing UI code
- Fixing styling/theme issues
- User mentions: UI, UX, design, styling, components, accessibility, responsive, dark mode

---

## Core Design System

### 1. Component Library: shadcn/ui

**Always use shadcn/ui components over raw HTML:**

| Raw HTML | shadcn/ui Replacement |
|----------|----------------------|
| `<button>` | `<Button>` |
| `<input>` | `<Input>` |
| `<select>` | `<Select>` |
| `<table>` | `<Table>` |
| `<dialog>` | `<Dialog>` |
| Custom card div | `<Card>` |
| Custom modal | `<Dialog>` or `<Sheet>` |

### 2. Theme Tokens (CRITICAL)

**Never use hard-coded colors. Always use CSS variables:**

| Avoid | Use Instead |
|-------|-------------|
| `bg-white` | `bg-background` |
| `bg-gray-100` | `bg-muted` |
| `bg-gray-900` | `bg-card` |
| `text-black` | `text-foreground` |
| `text-gray-500` | `text-muted-foreground` |
| `border-gray-300` | `border-border` |
| `text-white` on buttons | `text-primary-foreground` |

**Exception:** Semantic colors on colored backgrounds are OK:
- `bg-green-600 text-white` ✓ (status indicator)
- `bg-destructive text-destructive-foreground` ✓ (error state)

### 3. Button Variants

```tsx
// Primary action
<Button>Submit</Button>

// Secondary action
<Button variant="secondary">Cancel</Button>

// Destructive action
<Button variant="destructive">Delete</Button>

// Subtle action
<Button variant="outline">Edit</Button>

// Ghost (minimal)
<Button variant="ghost">More</Button>

// Link style
<Button variant="link">Learn more</Button>
```

### 4. Spacing System

**Use consistent spacing utilities:**

```tsx
// Vertical spacing between children
<div className="space-y-4">...</div>
<div className="space-y-6">...</div>

// Gap in flex/grid
<div className="flex gap-4">...</div>
<div className="grid gap-6">...</div>

// Padding
<div className="p-4">...</div>    // 16px
<div className="p-6">...</div>    // 24px
<div className="px-4 py-2">...</div>
```

**Remove inline margins like `mb-4`. Use `space-y-*` on parent.**

### 5. Typography Scale

```tsx
// Page title
<h1 className="text-2xl font-semibold">Page Title</h1>

// Section title
<h2 className="text-xl font-semibold">Section</h2>

// Card title
<h3 className="text-lg font-medium">Card Title</h3>

// Body text
<p className="text-sm text-muted-foreground">Description</p>

// Small/caption
<span className="text-xs text-muted-foreground">Hint</span>
```

---

## Component Patterns

### Card Structure

```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Subtitle or description</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Content */}
  </CardContent>
  <CardFooter className="flex justify-end gap-2">
    <Button variant="outline">Cancel</Button>
    <Button>Save</Button>
  </CardFooter>
</Card>
```

### Form Structure

```tsx
<form className="space-y-4">
  <div className="space-y-2">
    <Label htmlFor="email">Email</Label>
    <Input id="email" type="email" placeholder="Enter email" />
  </div>
  
  <div className="space-y-2">
    <Label htmlFor="password">Password</Label>
    <Input id="password" type="password" />
  </div>
  
  <Button type="submit" className="w-full">Submit</Button>
</form>
```

### Table Structure

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
      <TableHead className="text-right">Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell className="font-medium">John Doe</TableCell>
      <TableCell>
        <Badge variant="outline">Active</Badge>
      </TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="sm">Edit</Button>
      </TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Modal/Dialog Structure

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description text</DialogDescription>
    </DialogHeader>
    <div className="space-y-4">
      {/* Content */}
    </div>
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Dark Mode Compatibility

### Rules

1. **Never use manual `dark:` overrides** unless absolutely necessary
2. **Use semantic color tokens** that auto-adapt:
   - `bg-background` → white/dark gray
   - `text-foreground` → black/white
   - `bg-muted` → light gray/dark gray

### Anti-Patterns

```tsx
// BAD - Manual dark mode
<div className="bg-white dark:bg-gray-900 text-black dark:text-white">

// GOOD - Semantic tokens (auto-adapts)
<div className="bg-background text-foreground">
```

### Acceptable Dark Mode Usage

```tsx
// Status colors that need dark variants for visibility
<Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
  Active
</Badge>
```

---

## Accessibility Checklist

### Every Interactive Element

- [ ] Has visible focus state (`focus:ring-2 focus:ring-ring`)
- [ ] Has appropriate `aria-label` if no visible text
- [ ] Is keyboard accessible (Tab, Enter, Escape)
- [ ] Has sufficient color contrast (4.5:1 minimum)

### Forms

- [ ] Every input has an associated `<Label>`
- [ ] Error messages are announced (`aria-live="polite"`)
- [ ] Required fields are marked (`aria-required="true"`)
- [ ] Disabled state is visually clear

### Loading States

```tsx
<Button disabled={isLoading}>
  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {isLoading ? "Loading..." : "Submit"}
</Button>
```

### Icons

```tsx
// Decorative icon (hidden from screen readers)
<Search className="h-4 w-4" aria-hidden="true" />

// Meaningful icon (needs label)
<Button size="icon" aria-label="Search">
  <Search className="h-4 w-4" />
</Button>
```

---

## Responsive Design

### Breakpoints

```tsx
// Mobile-first approach
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Hide on mobile, show on desktop
<span className="hidden sm:inline">Full text</span>
<span className="sm:hidden">Short</span>

// Stack on mobile, row on desktop
<div className="flex flex-col sm:flex-row gap-4">
```

### Touch Targets

Minimum 44x44px for touch targets:

```tsx
// Good - adequate touch target
<Button size="lg" className="h-12 px-6">

// Avoid - too small
<Button size="sm" className="h-6 px-2">
```

---

## Animation Guidelines

### Use Tailwind Animations

```tsx
// Spin (loading)
<Loader2 className="h-4 w-4 animate-spin" />

// Pulse (skeleton)
<div className="animate-pulse bg-muted h-4 w-24 rounded" />

// Bounce (attention)
<div className="animate-bounce">↓</div>
```

### Transition Utilities

```tsx
// Hover effects
<div className="transition-colors hover:bg-muted">

// Scale on click
<Button className="active:scale-[0.98] transition-transform">

// All transitions
<div className="transition-all duration-200">
```

---

## Review Checklist

When reviewing UI code, check:

### Components
- [ ] Using shadcn/ui instead of raw HTML
- [ ] Button variants match action intent
- [ ] Cards have proper structure (Header/Content/Footer)
- [ ] Forms use Label + Input pattern

### Colors
- [ ] No hard-coded colors (`bg-white`, `text-gray-500`)
- [ ] Using theme tokens (`bg-background`, `text-muted-foreground`)
- [ ] Dark mode works without manual overrides

### Spacing
- [ ] Consistent spacing (`space-y-4`, `gap-4`)
- [ ] No arbitrary margins (`mb-[13px]`)
- [ ] Proper padding on containers

### Typography
- [ ] Heading hierarchy (`text-2xl` > `text-xl` > `text-lg`)
- [ ] Muted text for secondary info
- [ ] Consistent font weights

### Accessibility
- [ ] Focus states visible
- [ ] Labels on form inputs
- [ ] Alt text on images
- [ ] Sufficient contrast

### Responsive
- [ ] Mobile-first approach
- [ ] Touch targets adequate
- [ ] Text readable on all sizes

---

## Quick Fixes

### Convert raw button to shadcn

```tsx
// Before
<button className="bg-blue-600 text-white px-4 py-2 rounded">Click</button>

// After
<Button>Click</Button>
```

### Fix hard-coded colors

```tsx
// Before
<div className="bg-white border border-gray-200 text-gray-900">

// After
<div className="bg-card border border-border text-foreground">
```

### Fix spacing inconsistency

```tsx
// Before
<div>
  <p className="mb-4">One</p>
  <p className="mb-4">Two</p>
  <p>Three</p>
</div>

// After
<div className="space-y-4">
  <p>One</p>
  <p>Two</p>
  <p>Three</p>
</div>
```

---

## Import Paths

```tsx
// shadcn/ui components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// Utilities
import { cn } from "@/lib/utils";

// Icons (lucide-react)
import { Loader2, Search, X, Check, ChevronDown } from "lucide-react";
```

---

**Version:** 1.0  
**Applies to:** React, Next.js, shadcn/ui, Tailwind CSS
