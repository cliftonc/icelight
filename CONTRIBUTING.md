# Contributing

Welcome! We're glad you're interested in Icelight and want to help us make it better.

Icelight is maintained by [Clifton Cunningham](https://github.com/cliftonc) and community contributors. All contributions are reviewed and approved by the maintainer.

---

There are many ways you can contribute to the Icelight project:

- [Submitting bug reports](#bug-report)
- [Submitting feature request](#feature-request)
- [Providing feedback](#feedback)
- [Contribution guidelines](#contribution-guidelines)

## <a name="bug-report"></a> Submitting bug report

To report a bug or issue, please use our [issue form](https://github.com/cliftonc/icelight/issues/new) and start the title with "Bug: ".

## <a name="feature-request"></a> Submitting feature request

To request a feature, please use our [issue form](https://github.com/cliftonc/icelight/issues/new) and start the title with "Feature Request: ".

## <a name="feedback"></a> Providing feedback

There are several ways you can provide feedback:

- You can add new ticket in [Discussions](https://github.com/cliftonc/icelight/discussions).
- Mention me on [BlueSky - @cliftonc.nl](https://bsky.app/profile/cliftonc.nl).
- Email me at [clifton@guidemode.dev](mailto:clifton@guidemode.dev).

## <a name="contribution-guidelines"></a> Contribution guidelines

- [Pre-contribution setup](#pre-contribution)
  - [Installing Node](#installing-node)
  - [Installing pnpm](#installing-pnpm)
  - [Cloning the repository](#cloning-the-repository)
  - [Repository structure](#repository-structure)
  - [Building the project](#building-the-project)
- [Commit message guidelines](#commit-message-guidelines)
- [PR guidelines](#pr-guidelines)

## <a name="pre-contribution"></a> Pre-contribution setup

### <a name="installing-node"></a> Installing Node via NVM (if needed)

```bash
# https://github.com/nvm-sh/nvm#install--update-script
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 22
nvm use 22
```

### <a name="installing-pnpm"></a> Installing pnpm

```bash
npm install -g pnpm
```

### <a name="cloning-the-repository"></a> Cloning the repository

```bash
git clone https://github.com/cliftonc/icelight.git
cd icelight
```

### <a name="repository-structure"></a> Repository structure

- 📂 `packages/`

  Shared libraries (npm publishable)

  - 📂 `core/` - @icelight/core - Types & validation
  - 📂 `query/` - @icelight/query - Query library

- 📂 `workers/`

  Deployable Cloudflare Workers

  - 📂 `event-ingest/` - Self-contained event ingest worker
  - 📂 `query-api/` - Uses @icelight/query (includes UI)
  - 📂 `duckdb-api/` - DuckDB container API

- 📂 `container/`

  DuckDB container for query execution

- 📂 `scripts/`

  Infrastructure management scripts

- 📂 `templates/`

  Configuration templates

### <a name="building-the-project"></a> Building the project

Run the following script from the root folder to build the project:

```bash
pnpm install
pnpm build
```

For development:

```bash
pnpm dev:query  # Start query API locally
pnpm dev:ingest # Start ingest worker locally
```

## <a name="commit-message-guidelines"></a> Commit message guidelines

We have specific rules on how commit messages should be structured.

It's important to make sure your commit messages are clear, concise, and informative to make it easier for others to understand the changes you are making.

All commit messages should follow the pattern below:

```
<subject>
<BLANK LINE>
<body>
```

Example:

```
Add DuckDB health check endpoint

Enables monitoring of DuckDB container status
from the query API worker
```

> [!WARNING]
> All commits should be signed before submitting a PR. Please check the documentation on [how to sign commits](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification).

## <a name="pr-guidelines"></a> PR guidelines

1. PR titles should follow the pattern below:

   ```
   [<area>]: <subject>
   ```

   Examples:

   ```
   [Query API] Add DuckDB health check endpoint
   [Ingest] Improve batch event validation
   [UI] Add dashboard export feature
   ```

2. PRs should contain a detailed description of everything that was changed.

3. Commit messages should follow the [message style guidelines](#commit-message-guidelines).

4. PRs should implement:
   - Tests for features that were added.
   - Tests for bugs that were fixed.
   - Type checking with `pnpm typecheck`

## Development Workflow

1. **Fork and clone** the repository
2. **Create a branch** for your feature/fix
3. **Set up development environment:**
   ```bash
   pnpm install
   ```
4. **Make your changes** with appropriate tests
5. **Run the test suite:**
   ```bash
   pnpm typecheck
   pnpm build
   ```
6. **Create a pull request** with a clear description

## Getting Help

- 🐛 Search [existing issues](https://github.com/cliftonc/icelight/issues)
- 💬 Start a [discussion](https://github.com/cliftonc/icelight/discussions)
- 📧 Email [clifton@guidemode.dev](mailto:clifton@guidemode.dev)

Thank you for contributing to Icelight!
