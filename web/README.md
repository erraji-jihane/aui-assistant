# AUI Assistant: web app

The React frontend for AUI Assistant. See the [root README](../README.md) for the whole project.

## Pages

- **Ask** (`#/ask`): write a question and get the closest passages. It also shows what happened to the text: token count, whether it was chunked, its vector, and how many passages were compared.
- **Knowledge base** (`#/`): upload PDFs by drag-and-drop or by browsing, see every document with its number of passages, and delete documents.
- **Inspector** (`#/inspect/<documentId>`): how one document was processed.
  - **Overview:** the pipeline results (file → words → passages → vectors → searchable) and a chart of each passage's token count against the model's 256-token limit.
  - **Passages:** search and browse passages, with the overlap highlighted, the part the model can't read crossed out, and each embedding as a heat strip.
  - **Similarity:** how similar each passage is to the previous one (dips mark new sections), plus a passage × passage similarity grid for smaller documents.

## Run

```bash
npm install
npm run dev     # http://localhost:5173
```

The app talks to the API at `http://localhost:4000` by default. Set `VITE_API_URL` to point it elsewhere.

## Structure

```
src/
  App.tsx             header and hash-based routing between the pages
  pages/              AskPage, DocumentsPage, InspectorPage
  components/         charts (vector strip, similarity charts, token chart), Pipeline
  lib/api.ts          API URL, response types, formatting helpers
```

Built with React 19, TypeScript, Vite, Tailwind CSS 3 and lucide-react icons. The font is Manrope.
