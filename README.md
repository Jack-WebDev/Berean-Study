# Berean Study

Berean Study is a Bible commentary and study application designed to help readers understand Scripture in context.

The goal is not simply to tell readers what a passage means. Berean Study aims to show **why an interpretation is held**, what evidence supports it, where genuine disagreement exists, and how the passage fits within the wider biblical story.

The project is being built as a long-term, verse-by-verse commentary resource covering the Bible from Genesis to Revelation.

---

## What Berean Study Is

Berean Study is built around a few core principles:

* **Scripture comes first**
* **Context matters**
* **Interpretation should be explained, not merely asserted**
* **Historical and linguistic claims should be supported by evidence**
* **Major interpretive disagreements should be represented fairly**
* **Original-language study should clarify the text rather than overwhelm the reader**
* **The interface should stay out of the way of reading and study**

The aim is to create a commentary that is both accessible to ordinary readers and useful to those who want deeper study.

---

## Commentary Philosophy

Berean Study distinguishes between three important categories:

### What the text says

Observations that can be made directly from the biblical text, including wording, grammar, literary structure, and immediate context.

### Historical and cultural background

Information that helps explain the world behind the text, including historical setting, ancient customs, geography, archaeology, Jewish background, Greco-Roman culture, and the Ancient Near East.

### Interpretation

How the evidence has been understood by scholars and theological traditions.

Where a passage is disputed, Berean Study should explain the major interpretations, their supporting arguments, their weaknesses, and why one reading may be stronger than another.

The goal is not artificial neutrality. Conclusions can be reached, but the reasoning behind them should remain visible.

---

## What the Commentary May Include

Depending on the passage, commentary may include:

* Immediate literary context
* Book-level context
* Historical and cultural background
* Hebrew, Aramaic, or Greek observations
* Grammar and syntax
* Textual variants
* Important cross-references
* Old Testament use in the New Testament
* Major theological themes
* Canonical connections
* Scholarly interpretations
* Major areas of disagreement
* Archaeological or geographical information
* Sources and citations

Not every verse requires every category.

A simple verse should remain simple. A difficult or theologically significant passage may require much deeper treatment.

---

## Product Philosophy

Berean Study should feel like a reading application first and a research tool second.

The underlying system may contain:

* Commentary
* Sources
* Citations
* Cross-references
* Literary structures
* Themes
* Original-language notes
* Interpretive views
* People
* Places
* Timelines
* Textual notes

But that complexity should not dominate the reader experience.

A reader opening a passage should primarily see:

```text
Scripture
Commentary
```

Deeper material should appear when the reader asks for it.

The interface should disappear until it is needed.

---

## Core Goals

Berean Study is being designed to eventually provide:

* Verse-by-verse commentary from Genesis to Revelation
* Passage and literary-unit context
* Transparent citations and sourcing
* Meaningful cross-references
* Explanations of interpretive disagreements
* Book introductions and literary structure
* Original-language insights where they genuinely matter
* Personal notes, highlights, bookmarks, and study history
* A strong search experience across Scripture and commentary
* A clean reading experience on desktop and mobile

---

## What Berean Study Is Not

Berean Study is not intended to be:

* A collection of devotional thoughts
* A proof-text database
* A Strong's-number lookup tool
* A denominational argument platform
* A gamified Bible-reading application
* An AI-generated commentary product

---

## Project Structure

Berean Study is organized as a monorepo.

```text
berean-study/
├── apps/
│   └── web/
│       └── Full-stack Berean Study application
│
├── packages/
│   ├── auth/
│   │   └── Authentication configuration and logic
│   │
│   ├── db/
│   │   └── PostgreSQL schema, migrations, and queries
│   │
│   └── ui/
│       └── Shared UI components and design system
│
├── biome.json
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

---

## Technology

The project currently uses:

* TypeScript
* React
* TanStack Start
* TanStack Router
* Tailwind CSS
* shadcn/ui
* PostgreSQL
* Drizzle ORM
* Better Auth
* pnpm
* Turborepo
* Biome
* Husky

The stack is intentionally kept relatively simple.

Berean Study is primarily a content-heavy publishing and reading application, so the architecture favors strong relational data modelling and server-rendered application features without introducing unnecessary service or API complexity.

---

## Getting Started

### Requirements

You will need:

* Node.js
* pnpm
* PostgreSQL

Install dependencies:

```bash
pnpm install
```

---

## Environment

Create or update:

```text
apps/web/.env
```

with the required PostgreSQL and authentication configuration.

---

## Database

Berean Study uses PostgreSQL with Drizzle ORM.

Push the current schema:

```bash
pnpm run db:push
```

Generate database migrations:

```bash
pnpm run db:generate
```

Run migrations:

```bash
pnpm run db:migrate
```

Open Drizzle Studio:

```bash
pnpm run db:studio
```

---

## Development

Start the full development environment:

```bash
pnpm run dev
```

Start only the web application:

```bash
pnpm run dev:web
```

The application is available at:

```text
http://localhost:3001
```

---

## Development Priorities

The current focus is on building the foundations required for a commentary resource that can eventually contain tens of thousands of entries.

The main priorities are:

1. Biblical text and reference modelling
2. Passages and literary structures
3. Commentary content
4. Sources and citations
5. Editorial workflow
6. Cross-references
7. Search
8. Reader experience
9. Personal study features
10. Additional knowledge layers such as people, places, themes, and timelines

Features should be added when they improve the actual reading, writing, or research experience.

---

## Long-Term Direction

Berean Study is intended to grow into a transparent Bible commentary where readers can move naturally from:

```text
Text
  ↓
Context
  ↓
Evidence
  ↓
Interpretation
  ↓
Conclusion
```

The application should help readers understand not only **what** a passage has been interpreted to mean, but also **why**.

The goal is simple:

> Understand the text. Examine the evidence.
