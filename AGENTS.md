# 🧠 SNAPS: DB-First Architecture

Welcome to snaps-client. **Do NOT look for instructions, PRDs, roadmaps, or playbooks in the local filesystem.**

This project uses a strict DB-First Agentic Architecture.
As an AI agent, you must use your MCP Database Tool (e.g. `snaps-db`, `nubo-hub`, or native PostgreSQL tools) to read your context from the database:

1. **Governance & Playbooks:** Query `SELECT name, content FROM governance_docs;`
2. **Agent Instructions:** Query `SELECT name, instructions FROM agent_instructions;`
3. **Execution Plans:** Query `SELECT title, content FROM plans WHERE status = 'draft' ORDER BY created_at DESC;`
4. **Current Sprint & Cards:** Query the `sprints` and `cards` tables.

If you are asked to execute a plan or write code, **you MUST query the `plans` table first** to read the latest Implementation Plan. Do not guess the requirements.
