# PRD: AUI Assistant

A retrieval-augmented question-answering system for Al Akhawayn University students.

**Version:** 0.1 (MVP) · **Author:** Jihane Erraji · **Duration:** 4 weeks · **Status:** Personal project

## 1. Overview

AUI Assistant is a web application where any Al Akhawayn University student can ask a question about academic policies, course requirements, student life, or campus services, and receive an answer grounded in official AUI documents, with the source passages shown. The system is built on a Hierarchical Navigable Small World (HNSW) vector index implemented from scratch, connected to a retrieval-augmented generation (RAG) pipeline. A built-in evaluation view measures retrieval quality (recall@k, MRR) and compares system configurations using paired statistical tests with Benjamini–Hochberg correction.

## 2. Problem Statement

AUI's official information (course catalog, academic policies, student handbook, financial aid rules, academic calendar) is spread across dozens of PDFs and web pages. Students search manually, ask friends, or email advising offices for answers that already exist in writing. The result is wasted time, inconsistent answers, and policy decisions made on rumors. AUI Assistant gives students a single place to ask questions in natural language and get answers with citations back to the source document.

## 3. Goals (MVP, 4 weeks)

- **G1.** Implement HNSW from scratch in Python and validate it against brute-force nearest neighbor search.
- **G2.** Build an end-to-end RAG pipeline over AUI documents: ingest → chunk → embed → index → query → answer with sources.
- **G3.** Benchmark the custom HNSW against FAISS on recall@k vs query time.
- **G4.** Run a configuration study across chunk size, overlap, top-k, and efSearch; compare configurations with paired tests and Benjamini–Hochberg correction.
- **G5.** Ship a web UI where any AUI student can ask questions and see answers with sources, plus an internal Evaluation view.
- **G6.** Host the application publicly so students can use it.

## 4. Non-Goals (out of scope for v1)

- Auditing a sabotaged pipeline (moved to v2).
- Multi-user accounts, authentication, or roles.
- Personalization per student (transcript, major, year).
- Live data from Banner or AUI internal systems.
- Mobile native app.
- Multi-language (Arabic/French) question answering.
- Fine-tuning embeddings or the language model.

## 5. Users

- **Primary user:** an AUI student asking a question about academic policy, courses, or campus life.
- **Secondary user:** a prospective student or a parent exploring AUI requirements.
- **Internal user (only you):** uploads documents, runs evaluations, and reviews configuration study results.

## 6. Features

- **F1: Document ingestion (internal).** Upload AUI PDFs (catalog, handbook, policies, calendar). System chunks them, generates embeddings, stores chunks in PostgreSQL, and indexes them in HNSW.
- **F2: Question answering.** A student types a question in natural language. The system embeds the query, retrieves top-k relevant chunks via HNSW, and passes them to a language model to produce an answer. The answer is shown with the source passages and links to the original documents.
- **F3: Chat interface.** Multi-turn conversation. A student can ask follow-up questions and the system keeps context within the session.
- **F4: Evaluation view (internal).** For a test set of questions with known correct answers, the system computes recall@k and MRR per question and in aggregate.
- **F5: HNSW vs FAISS benchmark (internal).** Chart showing recall@k vs query time for both indexes across parameter settings.
- **F6: Configuration study (internal).** Grid search over chunk size, overlap, top-k, efSearch. Paired tests across questions, then Benjamini–Hochberg correction. Table shows corrected vs uncorrected significance side by side.

## 7. User Flows

- **Flow A: Student asks a question.** Student opens the site → types "What are the prerequisites for CSC 4352?" → sees the answer and the source chunks from the course catalog.
- **Flow B: Student asks a follow-up.** Student continues the same conversation with "And what about CSC 3310?" → system uses prior context → answer with new sources.
- **Flow C: Internal evaluation.** Admin selects test set → clicks "Run evaluation" → recall@k and MRR appear per question and in aggregate.
- **Flow D: Benchmark.** Admin clicks "Benchmark HNSW vs FAISS" → chart appears.
- **Flow E: Configuration study.** Admin defines grid → clicks "Run study" → table with mean metrics, p-values, and BH-corrected significance.

## 8. Success Criteria (MVP done when)

- [ ] Custom HNSW returns correct top-1 neighbor on 95%+ of queries when efSearch is high.
- [ ] A student can ask a question and get a grounded answer with citations in under 5 seconds.
- [ ] The chat interface handles follow-up questions within a session.
- [ ] Evaluation view shows recall@k and MRR on a 30+ question test set.
- [ ] Benchmark chart shows HNSW and FAISS on the same axes.
- [ ] Configuration study runs ≥10 configs and produces a BH-corrected results table.
- [ ] The site is publicly hosted and reachable from any device.
- [ ] Repo runs from a clean clone with documented setup steps.

## 9. Milestones (4 weeks)

| Week | Deliverable |
|---|---|
| 1 | M0: full stack runs locally (Vite + Express + FastAPI + Postgres). M1: ingest AUI PDFs, chunk, embed, store. |
| 2 | M2: FAISS retrieval + student-facing chat UI. M3: own HNSW replaces FAISS. |
| 3 | M4: Evaluation view (recall@k, MRR). M5: HNSW vs FAISS benchmark. |
| 4 | M6: Configuration study + FDR. Deployment. Polish, README, demo video. |

## 10. Risks

- **Corpus quality.** AUI PDFs may be inconsistent, scanned, or outdated. *Mitigation:* manually verify a sample of extracted text before embedding.
- **HNSW correctness.** Graph structure is easy to get wrong. *Mitigation:* validate against brute-force search before anything else.
- **Answer quality.** The LLM may hallucinate or ignore retrieved context. *Mitigation:* always show source chunks; evaluate answer support separately from retrieval quality.
- **Time.** Four weeks for four ML components is tight. *Mitigation:* drop the configuration study to a smaller grid if needed; the method still demonstrates the point.
- **Scope creep.** Tempting to add auth, mobile, multi-language. *Mitigation:* explicitly out of scope for v1.
- **Hosting cost.** LLM API calls and embedding compute. *Mitigation:* use local embeddings (all-MiniLM-L6-v2); pick a cheap LLM API and cap usage.

## 11. Future (v2)

- Audit harness: plant silent errors in a copy of the pipeline, find them, write postmortem.
- Multi-language support (Arabic, French).
- Personalization (major, year, completed courses).
- Banner integration for live course data.
- Mobile-friendly PWA.
- Public API for other AUI tools.

## 12. Architecture

```
Frontend (browser)
      │
      ▼
API server
      │
      ├──► Database
      │
      └──► ML service
```

| Layer | Language | Framework / Tools |
|---|---|---|
| Frontend | TypeScript | Vite, React, RTK, RTK-Query, Tailwind, Zod |
| API server | TypeScript | Node.js, Express, Prisma |
| Database | SQL | PostgreSQL |
| ML service | Python | FastAPI, NumPy, sentence-transformers, FAISS |
| Version control | — | Git |
