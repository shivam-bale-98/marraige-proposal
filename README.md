# Forever Starts With You ❤️

A romantic Hindu-style wedding proposal site built with Next.js 15.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Free hosting

Recommended: Vercel. Push this folder to GitHub, import the repository into Vercel, and deploy with the default Next.js settings.

The site is static/client-rendered and does not require a database.

## Photos

All photos live in `public/` as `photo-01.jpeg` … `photo-11.jpeg` and are listed in
`app/photos.js`. Each entry needs the file path, its real pixel width/height and a
caption. Edit that one file to add, remove, reorder or re-caption photos — the hero
frame, the floating polaroids, the scrolling ribbon, the story stack and the gallery
all read from it.

## Music

The play button in the footer plays `public/song.mp3`. Drop any MP3 in with that name
and it works; without the file the button shows a gentle hint instead.

## Personalise

Edit `app/page.js` for names, story text, the plan cards and the wedding date.
The countdown targets `21 February 2027` in India (IST).

## Animation

Motion is pure CSS plus one IntersectionObserver — no animation library.
Scroll-in effects use `data-reveal="up|left|right|zoom"` with an optional
`--d` delay for staggering. Everything is disabled automatically for visitors
who set `prefers-reduced-motion`.
