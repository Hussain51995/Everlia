# HomeLink Landing Page — Next.js

Production-ready recreation of the approved HomeLink landing-page concept.

## Stack
- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- `next/image` API used with optimization disabled for the supplied high-resolution local artwork, so the browser receives the original sharp assets without the previous low-resolution/cached derivative issue.

## Asset quality fix
The earlier build used small artwork (roughly 400px wide) that became visibly soft when enlarged. This version includes new high-resolution local assets:
- `public/images/hero-house-hd.png` — 1536×1024
- `public/images/cta-interior-sharp.png` — 1677×938
- `public/images/testimonial-avatar-sharp.png` — 1254×1254

The mail/postcard composition is rendered from native HTML/CSS plus the HD house asset, so card text, QR artwork, borders and shadows stay crisp at every responsive size.

## Structure
```text
app/
  globals.css
  layout.tsx
  page.tsx
components/
  sections/
    Header.tsx
    Hero.tsx
    Features.tsx
    Problem.tsx
    MailImpact.tsx
    Testimonials.tsx
    FinalCTA.tsx
    Footer.tsx
    VideoModal.tsx
  ui/
    Icons.tsx
    Logo.tsx
    PrimaryButton.tsx
    Reveal.tsx
    SectionLabel.tsx
public/images/
  hero-house-hd.png
  cta-interior-sharp.png
  testimonial-avatar-sharp.png
```

## Run
```bash
npm install
npm run dev
```
Open `http://localhost:3000`.

## Notes
- The page is fully responsive across mobile, tablet, laptop and large desktop sizes.
- Animations are intentionally subtle to preserve the professional design.
- The project uses the requested Neue Montreal font name as the first font-family choice; add your licensed webfont files if you want pixel-identical typography on devices where Neue Montreal is not installed.
