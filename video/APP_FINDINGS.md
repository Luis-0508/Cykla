# App findings from the video work

While exploring and capturing Cykla for the trailer, I noticed the issues
below. None of them blocked the video, so the app is unchanged. Each one should
be handled in its own change.

1. **Low contrast on recorded period days in dark mode.** `MonthCalendar`
   draws the day number in `#FFFFFF` on `theme.colors.period`. In the dark
   theme that colour is `#F08AA1`, a contrast ratio of about 2.4:1. That fails
   WCAG AA for text (4.5:1) and even the 3:1 large-text threshold. In light
   mode (`#9D3F56`) the ratio is 6.4:1. A dark text colour such as the dark
   theme's background would fix it in dark mode.
   (`src/components/MonthCalendar.tsx`)

2. **The daily editor stays open after saving when it was opened by URL.**
   After saving, the editor calls `router.back()`. With no previous screen (a
   deep link, or a reload on `/day/YYYY-MM-DD` in the web preview), the save
   succeeds but nothing visible happens, and the editor stays open. A fallback
   such as `router.canGoBack() ? router.back() : router.replace('/(tabs)')`
   would avoid that. The same applies to deleting an entry.
   (`app/day/[date].tsx`)

3. **The selected day is cut off in the Today day strip.** The strip renders
   the selected day as the 6th of 11 tiles but does not scroll to it. On a
   390 pt wide screen, the selected (today) tile sits half outside the right
   edge on first render. The capture scrolls the strip as a user would; the
   app could centre the selected tile on mount.
   (`src/components/DayStrip.tsx`)

4. **The calendar month title wraps at phone width.** At 390 pt, "October 2026"
   breaks onto two lines between the *Previous* and *Next* buttons. Showing the
   buttons as icons only, with their labels kept for accessibility, would keep
   it on one line. (`app/(tabs)/calendar.tsx`)

5. **Cycle counts that read alike can be confusing.** The prediction screen
   footer says "6 cycles detected", while the cards above say "5 complete cycles
   included". Both are correct (6 starts, 5 complete cycles), but they look
   contradictory side by side. "6 period starts detected" would be clearer.
   (`src/i18n/locales/en.ts`, `prediction.footer`)
