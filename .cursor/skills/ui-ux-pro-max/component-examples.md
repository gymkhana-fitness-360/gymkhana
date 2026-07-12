# Component Examples

## Buttons

### Action Buttons

```tsx
// Primary CTA
<Button>
  <Plus className="h-4 w-4 mr-2" />
  Add Member
</Button>

// Secondary action
<Button variant="secondary">
  <Download className="h-4 w-4 mr-2" />
  Export
</Button>

// Destructive with confirmation
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">
      <Trash2 className="h-4 w-4 mr-2" />
      Delete
    </Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction className="bg-destructive text-destructive-foreground">
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

// Loading state
<Button disabled={isLoading}>
  {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
  {isLoading ? "Saving..." : "Save Changes"}
</Button>
```

### Icon Buttons

```tsx
// Icon only button
<Button variant="ghost" size="icon" aria-label="Settings">
  <Settings className="h-4 w-4" />
</Button>

// Icon button with tooltip
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="ghost" size="icon">
        <HelpCircle className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Help</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

## Forms

### Input with Label

```tsx
<div className="space-y-2">
  <Label htmlFor="name">Full Name</Label>
  <Input
    id="name"
    placeholder="Enter your name"
    value={name}
    onChange={(e) => setName(e.target.value)}
  />
</div>
```

### Input with Icon

```tsx
<div className="space-y-2">
  <Label htmlFor="search">Search</Label>
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input id="search" className="pl-9" placeholder="Search..." />
  </div>
</div>
```

### Input with Error

```tsx
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    className={cn(error && "border-destructive focus:ring-destructive")}
    aria-invalid={!!error}
    aria-describedby={error ? "email-error" : undefined}
  />
  {error && (
    <p id="email-error" className="text-sm text-destructive">
      {error}
    </p>
  )}
</div>
```

### Select

```tsx
<div className="space-y-2">
  <Label htmlFor="plan">Membership Plan</Label>
  <Select value={plan} onValueChange={setPlan}>
    <SelectTrigger id="plan">
      <SelectValue placeholder="Select a plan" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="monthly">Monthly - ₹1,500</SelectItem>
      <SelectItem value="quarterly">Quarterly - ₹4,000</SelectItem>
      <SelectItem value="yearly">Yearly - ₹12,000</SelectItem>
    </SelectContent>
  </Select>
</div>
```

## Cards

### Stat Card

```tsx
<Card>
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-sm font-medium text-muted-foreground">
      Total Revenue
    </CardTitle>
    <DollarSign className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">₹45,231</div>
    <p className="text-xs text-muted-foreground">
      +20.1% from last month
    </p>
  </CardContent>
</Card>
```

### Interactive Card

```tsx
<Card className="cursor-pointer hover:shadow-md transition-shadow">
  <CardHeader>
    <div className="flex items-center gap-4">
      <Avatar>
        <AvatarImage src={member.photo} />
        <AvatarFallback>{member.name[0]}</AvatarFallback>
      </Avatar>
      <div>
        <CardTitle className="text-base">{member.name}</CardTitle>
        <CardDescription>{member.phone}</CardDescription>
      </div>
    </div>
  </CardHeader>
  <CardContent>
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">Plan:</span>
      <Badge variant="outline">{member.plan}</Badge>
    </div>
  </CardContent>
</Card>
```

## Tables

### Data Table

```tsx
<div className="rounded-lg border border-border">
  <Table>
    <TableHeader>
      <TableRow className="bg-muted/50">
        <TableHead className="w-[200px]">Name</TableHead>
        <TableHead>Phone</TableHead>
        <TableHead>Plan</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="text-right">Actions</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {members.map((member) => (
        <TableRow key={member.id} className="hover:bg-muted/50">
          <TableCell className="font-medium">{member.name}</TableCell>
          <TableCell>{member.phone}</TableCell>
          <TableCell>
            <Badge variant="outline">{member.plan}</Badge>
          </TableCell>
          <TableCell>
            <Badge
              variant={member.status === "ACTIVE" ? "default" : "secondary"}
            >
              {member.status}
            </Badge>
          </TableCell>
          <TableCell className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Edit</DropdownMenuItem>
                <DropdownMenuItem>View Details</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

### Empty State

```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <div className="rounded-full bg-muted p-4 mb-4">
    <Users className="h-8 w-8 text-muted-foreground" />
  </div>
  <h3 className="text-lg font-medium mb-1">No members found</h3>
  <p className="text-sm text-muted-foreground mb-4">
    Get started by adding your first member.
  </p>
  <Button>
    <Plus className="h-4 w-4 mr-2" />
    Add Member
  </Button>
</div>
```

## Loading States

### Skeleton

```tsx
// Card skeleton
<Card>
  <CardHeader>
    <Skeleton className="h-5 w-32" />
    <Skeleton className="h-4 w-24 mt-2" />
  </CardHeader>
  <CardContent className="space-y-2">
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
  </CardContent>
</Card>

// Table skeleton
<TableRow>
  {[1, 2, 3, 4].map((i) => (
    <TableCell key={i}>
      <Skeleton className="h-4 w-full" />
    </TableCell>
  ))}
</TableRow>
```

### Spinner

```tsx
// Full page loading
<div className="flex items-center justify-center min-h-[400px]">
  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
</div>

// Inline loading
<div className="flex items-center gap-2 text-muted-foreground">
  <Loader2 className="h-4 w-4 animate-spin" />
  <span className="text-sm">Loading...</span>
</div>
```

## Feedback

### Toast

```tsx
import { toast } from "sonner";

// Success
toast.success("Member added successfully");

// Error
toast.error("Failed to save changes");

// With action
toast("Payment received", {
  action: {
    label: "View",
    onClick: () => router.push("/payments"),
  },
});
```

### Alert

```tsx
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    Your session has expired. Please log in again.
  </AlertDescription>
</Alert>

<Alert>
  <Info className="h-4 w-4" />
  <AlertTitle>Note</AlertTitle>
  <AlertDescription>
    Membership will be renewed automatically.
  </AlertDescription>
</Alert>
```
